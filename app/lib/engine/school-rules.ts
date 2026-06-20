import { isRuleActiveForDate } from "./rule-utils";
import type { CalendarRule, IntermediateStatus, Student } from "./types";

export function applySchoolRules(
	date: Date,
	statuses: IntermediateStatus[],
	rules: CalendarRule[],
	students: Student[],
): IntermediateStatus[] {
	const schoolRules = rules.filter(
		(r) =>
			r.isActive &&
			(r.ruleType === "School-Specific Holiday" || r.ruleType === "School Pro-D Day") &&
			r.targetType === "school" &&
			r.targetSchoolId !== null &&
			isRuleActiveForDate(date, r),
	);

	if (schoolRules.length === 0) return statuses;

	const studentSchoolMap = new Map(students.map((s) => [s.id, s.schoolId]));

	return statuses.map((s) => {
		if (s.status !== "P") return s;

		const schoolId = studentSchoolMap.get(s.studentId);
		const matchingRules = schoolRules.filter((r) => r.targetSchoolId === schoolId);

		if (matchingRules.length === 0) return s;

		return {
			...s,
			status: "A" as const,
			appliedRuleIds: [...s.appliedRuleIds, ...matchingRules.map((r) => r.id)],
		};
	});
}
