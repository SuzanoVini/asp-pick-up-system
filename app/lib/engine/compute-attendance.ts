import { computeBaseSchedule } from "./base-schedule";
import { detectConflicts } from "./conflict-detection";
import { applyDaySwitch } from "./day-switch";
import { applyDistrictRules } from "./district-rules";
import { deriveDropoffAndBooster } from "./dropoff-derivation";
import { applyEarlyDismissal } from "./early-dismissal";
import { applyExtraPickup } from "./extra-pickup";
import { applySchoolRules } from "./school-rules";
import { applyStudentRules } from "./student-rules";
import type { AttendanceInput, AttendanceResult } from "./types";

export function computeAttendance(input: AttendanceInput): AttendanceResult[] {
	const { date, students, enrollments, rules, schools, settings, existingOverrides } = input;

	const overrideMap = new Map(existingOverrides.map((o) => [o.studentId, o]));

	// Step 1: Base schedule
	let statuses = computeBaseSchedule(date, students, enrollments);

	// Separate overridden students
	const overriddenIds = new Set<string>();
	const overrideResults: AttendanceResult[] = [];

	for (const s of statuses) {
		const override = overrideMap.get(s.studentId);
		if (override) {
			overriddenIds.add(s.studentId);
			const student = students.find((st) => st.id === s.studentId);
			const needsBooster =
				student?.dateOfBirth != null
					? (() => {
							const dob = new Date(`${student.dateOfBirth}T00:00:00`);
							const ageDiff = date.getFullYear() - dob.getFullYear();
							const monthDiff = date.getMonth() - dob.getMonth();
							const dayDiff = date.getDate() - dob.getDate();
							const age = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? ageDiff - 1 : ageDiff;
							return age < 9;
						})()
					: false;

			overrideResults.push({
				studentId: s.studentId,
				status: override.status,
				effectiveDismissalTime: override.effectiveDismissalTime,
				needsBooster,
				appliedRules: [],
				conflicts: [],
				isManualOverride: true,
			});
		}
	}

	// Filter out overridden students from pipeline
	statuses = statuses.filter((s) => !overriddenIds.has(s.studentId));

	// Step 2: District rules
	statuses = applyDistrictRules(date, statuses, rules);

	// Step 3: School rules
	statuses = applySchoolRules(date, statuses, rules, students);

	// Step 4: Student rules (absence + alternating week)
	statuses = applyStudentRules(date, statuses, rules);

	// Step 5: Early dismissal
	statuses = applyEarlyDismissal(date, statuses, rules, students, schools, settings);

	// Step 6: Day switch
	statuses = applyDaySwitch(date, statuses, rules);

	// Step 7: Extra pickup
	statuses = applyExtraPickup(date, statuses, rules);

	// Step 8: Conflict detection
	const studentMeta = students.map((s) => ({ id: s.id, schoolId: s.schoolId }));
	const { resolved, conflicts } = detectConflicts(date, statuses, rules, studentMeta);

	// Steps 9 + 10: ED time is already resolved in step 5. Drop-off derivation + booster.
	const results = deriveDropoffAndBooster(date, resolved, students, conflicts);

	return [...results, ...overrideResults];
}
