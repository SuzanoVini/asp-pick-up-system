import { isRuleActiveForDate } from "./rule-utils";
import type { CalendarRule, IntermediateStatus, School, Student, SystemSettings } from "./types";

function resolveEdTime(
	studentId: string,
	matchingRules: CalendarRule[],
	students: Student[],
	schools: School[],
	_allRules: CalendarRule[],
	settings: SystemSettings,
): string | null {
	const student = students.find((s) => s.id === studentId);
	if (!student) return settings.defaultEarlyDismissalTime;

	// Level 1: student-specific rule early_dismissal_time
	const studentRule = matchingRules.find(
		(r) => r.targetType === "student" && r.targetStudentId === studentId && r.earlyDismissalTime,
	);
	if (studentRule?.earlyDismissalTime) return studentRule.earlyDismissalTime;

	// Level 2: student standing early_dismissal_time
	if (student.earlyDismissalTime) return student.earlyDismissalTime;

	// Level 3: school-level rule early_dismissal_time
	const schoolRule = matchingRules.find(
		(r) =>
			r.targetType === "school" && r.targetSchoolId === student.schoolId && r.earlyDismissalTime,
	);
	if (schoolRule?.earlyDismissalTime) return schoolRule.earlyDismissalTime;

	// Level 4: school default early_dismissal_time
	const school = schools.find((s) => s.id === student.schoolId);
	if (school?.earlyDismissalTime) return school.earlyDismissalTime;

	// Level 5: system default
	return settings.defaultEarlyDismissalTime;
}

export function applyEarlyDismissal(
	date: Date,
	statuses: IntermediateStatus[],
	rules: CalendarRule[],
	students: Student[],
	schools: School[],
	settings: SystemSettings,
): IntermediateStatus[] {
	const edRules = rules.filter(
		(r) => r.isActive && r.ruleType === "Early Dismissal" && isRuleActiveForDate(date, r),
	);

	if (edRules.length === 0) return statuses;

	return statuses.map((s) => {
		if (s.status !== "P") return s;

		const student = students.find((st) => st.id === s.studentId);
		if (!student) return s;

		const matching = edRules.filter((r) => {
			if (r.targetType === "all") return true;
			if (r.targetType === "school") return r.targetSchoolId === student.schoolId;
			if (r.targetType === "student") return r.targetStudentId === student.id;
			return false;
		});

		if (matching.length === 0) return s;

		const edTime = resolveEdTime(s.studentId, edRules, students, schools, rules, settings);

		return {
			...s,
			status: "ED" as const,
			effectiveDismissalTime: edTime,
			appliedRuleIds: [...s.appliedRuleIds, ...matching.map((r) => r.id)],
		};
	});
}
