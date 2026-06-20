import { differenceInYears } from "date-fns";
import type { AttendanceResult, ConflictInfo, IntermediateStatus, Student } from "./types";

export function deriveDropoffAndBooster(
	date: Date,
	statuses: IntermediateStatus[],
	students: Student[],
	conflicts: ConflictInfo[],
): AttendanceResult[] {
	const studentMap = new Map(students.map((s) => [s.id, s]));

	return statuses.map((s) => {
		const student = studentMap.get(s.studentId);
		let finalStatus = s.status;

		if (student?.dropOffOnly && finalStatus === "P") {
			finalStatus = "D";
		}

		const needsBooster =
			student?.dateOfBirth != null &&
			differenceInYears(date, new Date(`${student.dateOfBirth}T00:00:00`)) < 9;

		const studentConflicts = conflicts.filter((c) => c.studentId === s.studentId);

		return {
			studentId: s.studentId,
			status: finalStatus,
			effectiveDismissalTime: s.effectiveDismissalTime,
			needsBooster,
			appliedRules: s.appliedRuleIds,
			conflicts: studentConflicts,
			isManualOverride: false,
		};
	});
}
