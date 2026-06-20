import { differenceInCalendarWeeks } from "date-fns";
import { isRuleActiveForDate } from "./rule-utils";
import type { CalendarRule, IntermediateStatus } from "./types";

function isAbsentWeekForAlternating(date: Date, rule: CalendarRule): boolean {
	if (!rule.startWeek) return false;
	const startDate = new Date(`${rule.startDate}T00:00:00`);
	const weeksSinceStart = differenceInCalendarWeeks(date, startDate, { weekStartsOn: 1 });
	const isEvenWeek = weeksSinceStart % 2 === 0;

	if (rule.startWeek === "Absent") return isEvenWeek;
	return !isEvenWeek;
}

export function applyStudentRules(
	date: Date,
	statuses: IntermediateStatus[],
	rules: CalendarRule[],
): IntermediateStatus[] {
	const absenceRules = rules.filter(
		(r) =>
			r.isActive &&
			r.ruleType === "Student Temporary Absence" &&
			r.targetType === "student" &&
			r.targetStudentId !== null &&
			isRuleActiveForDate(date, r),
	);

	const alternatingRules = rules.filter(
		(r) =>
			r.isActive &&
			r.ruleType === "Attends Every Other Week" &&
			r.targetType === "student" &&
			r.targetStudentId !== null &&
			isRuleActiveForDate(date, r),
	);

	return statuses.map((s) => {
		if (s.status !== "P") return s;

		const matchingAbsence = absenceRules.filter((r) => r.targetStudentId === s.studentId);
		if (matchingAbsence.length > 0) {
			return {
				...s,
				status: "A" as const,
				appliedRuleIds: [...s.appliedRuleIds, ...matchingAbsence.map((r) => r.id)],
			};
		}

		const matchingAlternating = alternatingRules.filter(
			(r) => r.targetStudentId === s.studentId && isAbsentWeekForAlternating(date, r),
		);
		if (matchingAlternating.length > 0) {
			return {
				...s,
				status: "A" as const,
				appliedRuleIds: [...s.appliedRuleIds, ...matchingAlternating.map((r) => r.id)],
			};
		}

		return s;
	});
}
