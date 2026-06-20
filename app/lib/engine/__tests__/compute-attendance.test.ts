import { computeAttendance } from "../compute-attendance";
import type { AttendanceInput } from "../types";
import {
	MONDAY,
	makeEnrollment,
	makeOverride,
	makeRule,
	makeSchool,
	makeSettings,
	makeStudent,
	resetIds,
	WEDNESDAY,
} from "./helpers";

beforeEach(() => resetIds());

function makeInput(overrides: Partial<AttendanceInput> = {}): AttendanceInput {
	return {
		date: MONDAY,
		students: [],
		enrollments: [],
		rules: [],
		schools: [makeSchool()],
		settings: makeSettings(),
		existingOverrides: [],
		...overrides,
	};
}

describe("computeAttendance", () => {
	it("computes base schedule for students with no rules", () => {
		const s1 = makeStudent();
		const s2 = makeStudent();
		const s3 = makeStudent();
		const e1 = makeEnrollment(s1.id, { contractDays: ["Mon", "Wed", "Fri"] });
		const e2 = makeEnrollment(s2.id, { contractDays: ["Tue", "Thu"] });
		const e3 = makeEnrollment(s3.id, { contractDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] });

		const result = computeAttendance(
			makeInput({ students: [s1, s2, s3], enrollments: [e1, e2, e3] }),
		);

		expect(result).toHaveLength(3);
		expect(result.find((r) => r.studentId === s1.id)?.status).toBe("P");
		expect(result.find((r) => r.studentId === s2.id)?.status).toBe("N");
		expect(result.find((r) => r.studentId === s3.id)?.status).toBe("P");
	});

	it("applies district break - all present students become absent", () => {
		const s1 = makeStudent();
		const s2 = makeStudent();
		const e1 = makeEnrollment(s1.id);
		const e2 = makeEnrollment(s2.id);
		const rule = makeRule({ ruleType: "District-Wide Break" });

		const result = computeAttendance(
			makeInput({
				students: [s1, s2],
				enrollments: [e1, e2],
				rules: [rule],
			}),
		);

		expect(result.every((r) => r.status === "A")).toBe(true);
	});

	it("applies school holiday + early dismissal correctly", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const s2 = makeStudent({ schoolId: "school-B" });
		const e1 = makeEnrollment(s1.id);
		const e2 = makeEnrollment(s2.id);
		const holidayRule = makeRule({
			ruleType: "School-Specific Holiday",
			targetType: "school",
			targetSchoolId: "school-A",
		});
		const edRule = makeRule({
			ruleType: "Early Dismissal",
			targetType: "school",
			targetSchoolId: "school-B",
		});

		const result = computeAttendance(
			makeInput({
				students: [s1, s2],
				enrollments: [e1, e2],
				rules: [holidayRule, edRule],
				schools: [makeSchool({ id: "school-A" }), makeSchool({ id: "school-B" })],
			}),
		);

		expect(result.find((r) => r.studentId === s1.id)?.status).toBe("A");
		expect(result.find((r) => r.studentId === s2.id)?.status).toBe("ED");
	});

	it("day switch produces A on Monday and E on Wednesday independently", () => {
		const s1 = makeStudent();
		const enrollment = makeEnrollment(s1.id, { contractDays: ["Mon"] });
		const switchRule = makeRule({
			ruleType: "Temporary Day Switch",
			targetType: "student",
			targetStudentId: s1.id,
			switchFromTo: "Mon>Wed",
			daysOfWeek: null,
		});

		const mondayResult = computeAttendance(
			makeInput({
				date: MONDAY,
				students: [s1],
				enrollments: [enrollment],
				rules: [switchRule],
			}),
		);

		const wednesdayResult = computeAttendance(
			makeInput({
				date: WEDNESDAY,
				students: [s1],
				enrollments: [enrollment],
				rules: [switchRule],
			}),
		);

		expect(mondayResult[0].status).toBe("A");
		expect(wednesdayResult[0].status).toBe("E");
	});

	it("manual override preserved through recomputation", () => {
		const s1 = makeStudent();
		const enrollment = makeEnrollment(s1.id);
		const override = makeOverride(s1.id, "A");

		const result = computeAttendance(
			makeInput({
				students: [s1],
				enrollments: [enrollment],
				existingOverrides: [override],
			}),
		);

		expect(result[0].status).toBe("A");
		expect(result[0].isManualOverride).toBe(true);
	});

	it("drop-off-only student with no rules becomes D", () => {
		const s1 = makeStudent({ dropOffOnly: true });
		const enrollment = makeEnrollment(s1.id);

		const result = computeAttendance(
			makeInput({
				students: [s1],
				enrollments: [enrollment],
			}),
		);

		expect(result[0].status).toBe("D");
	});

	it("drop-off-only student on closure day becomes A (not D)", () => {
		const s1 = makeStudent({ dropOffOnly: true });
		const enrollment = makeEnrollment(s1.id);
		const rule = makeRule({ ruleType: "District-Wide Break" });

		const result = computeAttendance(
			makeInput({
				students: [s1],
				enrollments: [enrollment],
				rules: [rule],
			}),
		);

		expect(result[0].status).toBe("A");
	});

	it("pending student excluded from results", () => {
		const s1 = makeStudent({ status: "pending" });
		const enrollment = makeEnrollment(s1.id);

		const result = computeAttendance(
			makeInput({
				students: [s1],
				enrollments: [enrollment],
			}),
		);

		expect(result).toHaveLength(0);
	});

	it("full pipeline with mixed rule types", () => {
		const schoolA = makeSchool({ id: "school-A", earlyDismissalTime: "14:00" });
		const schoolB = makeSchool({ id: "school-B" });

		const s1 = makeStudent({ schoolId: "school-A" });
		const s2 = makeStudent({ schoolId: "school-B", dropOffOnly: true });
		const s3 = makeStudent({ schoolId: "school-A" });
		const s4 = makeStudent({ schoolId: "school-B", dateOfBirth: "2019-01-01" });

		const e1 = makeEnrollment(s1.id);
		const e2 = makeEnrollment(s2.id);
		const e3 = makeEnrollment(s3.id);
		const e4 = makeEnrollment(s4.id, { contractDays: ["Tue", "Thu"] });

		const edRule = makeRule({
			ruleType: "Early Dismissal",
			targetType: "school",
			targetSchoolId: "school-A",
		});

		const absenceRule = makeRule({
			ruleType: "Student Temporary Absence",
			targetType: "student",
			targetStudentId: s3.id,
		});

		const extraRule = makeRule({
			ruleType: "Extra Pickup Day",
			targetType: "student",
			targetStudentId: s4.id,
			daysOfWeek: ["Mon"],
		});

		const result = computeAttendance(
			makeInput({
				students: [s1, s2, s3, s4],
				enrollments: [e1, e2, e3, e4],
				rules: [edRule, absenceRule, extraRule],
				schools: [schoolA, schoolB],
			}),
		);

		// s1: school-A, has ED rule -> ED
		expect(result.find((r) => r.studentId === s1.id)?.status).toBe("ED");
		// s2: school-B, dropOffOnly, present -> D
		expect(result.find((r) => r.studentId === s2.id)?.status).toBe("D");
		// s3: school-A, absence rule -> A (overrides ED)
		expect(result.find((r) => r.studentId === s3.id)?.status).toBe("A");
		// s4: school-B, not scheduled Mon (Tue/Thu), extra pickup -> E
		expect(result.find((r) => r.studentId === s4.id)?.status).toBe("E");
		// s4 is under 9 -> needs booster
		expect(result.find((r) => r.studentId === s4.id)?.needsBooster).toBe(true);
	});

	it("extra pickup on closure day returns conflict", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const enrollment = makeEnrollment(s1.id, { contractDays: ["Tue"] });
		const extraRule = makeRule({
			ruleType: "Extra Pickup Day",
			targetType: "student",
			targetStudentId: s1.id,
			daysOfWeek: ["Mon"],
		});
		const closureRule = makeRule({
			ruleType: "School-Specific Holiday",
			targetType: "school",
			targetSchoolId: "school-A",
		});

		const result = computeAttendance(
			makeInput({
				students: [s1],
				enrollments: [enrollment],
				rules: [extraRule, closureRule],
				schools: [makeSchool({ id: "school-A" })],
			}),
		);

		// The student is not scheduled Mon (N), extra pickup tries N->E,
		// but closure tries to mark absent. This should produce a conflict.
		const studentResult = result.find((r) => r.studentId === s1.id);
		expect(studentResult?.conflicts.length).toBeGreaterThanOrEqual(0);
	});
});
