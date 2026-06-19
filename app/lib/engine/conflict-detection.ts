import type { CalendarRule, ConflictInfo, IntermediateStatus } from "./types";
import { getDayOfWeek } from "./base-schedule";
import { isRuleActiveForDate } from "./rule-utils";

interface RuleEffect {
	ruleId: string;
	targetStatus: "A" | "ED" | "E";
	ruleType: string;
}

function collectRuleEffects(
	date: Date,
	studentId: string,
	schoolId: string,
	baseStatus: "P" | "N",
	rules: CalendarRule[],
): RuleEffect[] {
	const effects: RuleEffect[] = [];
	const currentDay = getDayOfWeek(date);
	const dateStr = date.toISOString().split("T")[0];

	for (const rule of rules) {
		if (!rule.isActive) continue;

		const matchesTarget =
			rule.targetType === "all" ||
			(rule.targetType === "school" && rule.targetSchoolId === schoolId) ||
			(rule.targetType === "student" && rule.targetStudentId === studentId);

		if (!matchesTarget) continue;

		if (rule.ruleType === "Temporary Day Switch") {
			if (!rule.switchFromTo || dateStr < rule.startDate || dateStr > rule.endDate) continue;
			const parts = rule.switchFromTo.split(">");
			if (parts.length !== 2) continue;
			const from = parts[0].trim();
			const to = parts[1].trim();

			if (currentDay === from && baseStatus === "P") {
				effects.push({ ruleId: rule.id, targetStatus: "A", ruleType: rule.ruleType });
			}
			if (currentDay === to && baseStatus === "N") {
				effects.push({ ruleId: rule.id, targetStatus: "E", ruleType: rule.ruleType });
			}
			continue;
		}

		if (rule.ruleType === "Extra Pickup Day") {
			if (!isRuleActiveForDate(date, rule)) continue;
			if (baseStatus === "N") {
				effects.push({ ruleId: rule.id, targetStatus: "E", ruleType: rule.ruleType });
			}
			continue;
		}

		if (!isRuleActiveForDate(date, rule)) continue;

		if (
			rule.ruleType === "District-Wide Break" ||
			rule.ruleType === "District Pro-D Day" ||
			rule.ruleType === "School-Specific Holiday" ||
			rule.ruleType === "School Pro-D Day" ||
			rule.ruleType === "Student Temporary Absence" ||
			rule.ruleType === "Attends Every Other Week"
		) {
			if (baseStatus === "P") {
				effects.push({ ruleId: rule.id, targetStatus: "A", ruleType: rule.ruleType });
			}
		}

		if (rule.ruleType === "Early Dismissal") {
			if (baseStatus === "P") {
				effects.push({ ruleId: rule.id, targetStatus: "ED", ruleType: rule.ruleType });
			}
		}
	}

	return effects;
}

export function detectConflicts(
	date: Date,
	statuses: IntermediateStatus[],
	rules: CalendarRule[],
	students: { id: string; schoolId: string }[],
): { resolved: IntermediateStatus[]; conflicts: ConflictInfo[] } {
	const conflicts: ConflictInfo[] = [];
	const studentSchoolMap = new Map(students.map((s) => [s.id, s.schoolId]));

	const resolved = statuses.map((s) => {
		if (s.appliedRuleIds.length <= 1) return s;

		const schoolId = studentSchoolMap.get(s.studentId) ?? "";

		const effects = collectRuleEffects(
			date,
			s.studentId,
			schoolId,
			"P",
			rules.filter((r) => s.appliedRuleIds.includes(r.id)),
		);

		const nEffects = collectRuleEffects(
			date,
			s.studentId,
			schoolId,
			"N",
			rules.filter((r) => s.appliedRuleIds.includes(r.id)),
		);

		const allEffects = [...effects, ...nEffects];

		const uniqueTargets = [...new Set(allEffects.map((e) => e.targetStatus))];

		if (uniqueTargets.length <= 1) return s;

		if (
			uniqueTargets.length === 2 &&
			uniqueTargets.includes("A") &&
			uniqueTargets.includes("ED")
		) {
			return {
				...s,
				status: "A" as const,
				effectiveDismissalTime: null,
			};
		}

		if (uniqueTargets.includes("E") && uniqueTargets.includes("A")) {
			conflicts.push({
				studentId: s.studentId,
				conflictingRules: allEffects.map((e) => ({
					ruleId: e.ruleId,
					targetStatus: e.targetStatus,
				})),
				description: "Exception day conflicts with closure/absence rule",
			});
			return {
				...s,
				status: s.status,
				appliedRuleIds: [],
			};
		}

		conflicts.push({
			studentId: s.studentId,
			conflictingRules: allEffects.map((e) => ({
				ruleId: e.ruleId,
				targetStatus: e.targetStatus,
			})),
			description: "Multiple rules produce conflicting statuses",
		});

		return {
			...s,
			appliedRuleIds: [],
		};
	});

	return { resolved, conflicts };
}
