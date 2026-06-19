import type { CalendarRule, IntermediateStatus } from "./types";
import { isRuleActiveForDate } from "./rule-utils";

export function applyExtraPickup(
	date: Date,
	statuses: IntermediateStatus[],
	rules: CalendarRule[],
): IntermediateStatus[] {
	const extraRules = rules.filter(
		(r) =>
			r.isActive &&
			r.ruleType === "Extra Pickup Day" &&
			r.targetType === "student" &&
			r.targetStudentId !== null &&
			isRuleActiveForDate(date, r),
	);

	if (extraRules.length === 0) return statuses;

	return statuses.map((s) => {
		if (s.status !== "N") return s;

		const matching = extraRules.filter((r) => r.targetStudentId === s.studentId);
		if (matching.length === 0) return s;

		return {
			...s,
			status: "E" as const,
			appliedRuleIds: [...s.appliedRuleIds, ...matching.map((r) => r.id)],
		};
	});
}
