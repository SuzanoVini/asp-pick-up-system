import { isRuleActiveForDate } from "./rule-utils";
import type { CalendarRule, IntermediateStatus } from "./types";

export function applyDistrictRules(
	date: Date,
	statuses: IntermediateStatus[],
	rules: CalendarRule[],
): IntermediateStatus[] {
	const districtRules = rules.filter(
		(r) =>
			r.isActive &&
			(r.ruleType === "District-Wide Break" || r.ruleType === "District Pro-D Day") &&
			r.targetType === "all" &&
			isRuleActiveForDate(date, r),
	);

	if (districtRules.length === 0) return statuses;

	return statuses.map((s) => {
		if (s.status !== "P") return s;
		return {
			...s,
			status: "A" as const,
			appliedRuleIds: [...s.appliedRuleIds, ...districtRules.map((r) => r.id)],
		};
	});
}
