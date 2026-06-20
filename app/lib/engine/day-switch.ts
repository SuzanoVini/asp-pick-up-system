import { getDayOfWeek } from "./base-schedule";
import type { CalendarRule, DayOfWeek, IntermediateStatus } from "./types";

function parseSwitchFromTo(switchFromTo: string): { from: DayOfWeek; to: DayOfWeek } | null {
	const parts = switchFromTo.split(">");
	if (parts.length !== 2) return null;
	const from = parts[0].trim() as DayOfWeek;
	const to = parts[1].trim() as DayOfWeek;
	const valid: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
	if (!valid.includes(from) || !valid.includes(to)) return null;
	return { from, to };
}

export function applyDaySwitch(
	date: Date,
	statuses: IntermediateStatus[],
	rules: CalendarRule[],
): IntermediateStatus[] {
	const dateStr = date.toISOString().split("T")[0];
	const currentDay = getDayOfWeek(date);
	if (!currentDay) return statuses;

	const switchRules = rules.filter(
		(r) =>
			r.isActive &&
			r.ruleType === "Temporary Day Switch" &&
			r.targetType === "student" &&
			r.targetStudentId !== null &&
			r.switchFromTo !== null &&
			dateStr >= r.startDate &&
			dateStr <= r.endDate,
	);

	if (switchRules.length === 0) return statuses;

	return statuses.map((s) => {
		const matchingRule = switchRules.find((r) => r.targetStudentId === s.studentId);
		if (!matchingRule?.switchFromTo) return s;

		const parsed = parseSwitchFromTo(matchingRule.switchFromTo);
		if (!parsed) return s;

		// On the original day: P -> A
		if (currentDay === parsed.from && s.status === "P") {
			return {
				...s,
				status: "A" as const,
				appliedRuleIds: [...s.appliedRuleIds, matchingRule.id],
			};
		}

		// On the new day: N -> E
		if (currentDay === parsed.to && s.status === "N") {
			return {
				...s,
				status: "E" as const,
				appliedRuleIds: [...s.appliedRuleIds, matchingRule.id],
			};
		}

		return s;
	});
}
