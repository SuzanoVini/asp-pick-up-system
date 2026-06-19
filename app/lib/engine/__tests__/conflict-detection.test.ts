import { detectConflicts } from "../conflict-detection";
import type { IntermediateStatus } from "../types";
import { makeRule, makeStudent, MONDAY, WEDNESDAY, resetIds } from "./helpers";

beforeEach(() => resetIds());

function makeStatus(
	studentId: string,
	status: "P" | "A" | "N" | "E" | "ED" | "D",
	appliedRuleIds: string[] = [],
): IntermediateStatus {
	return { studentId, status, appliedRuleIds, effectiveDismissalTime: null };
}

describe("detectConflicts", () => {
	it("does not flag when only one rule applied", () => {
		const s1 = makeStudent();
		const rule = makeRule({ ruleType: "District-Wide Break" });
		const statuses = [makeStatus(s1.id, "A", [rule.id])];

		const { resolved, conflicts } = detectConflicts(
			MONDAY,
			statuses,
			[rule],
			[{ id: s1.id, schoolId: s1.schoolId }],
		);

		expect(conflicts).toHaveLength(0);
		expect(resolved[0].status).toBe("A");
	});

	it("two rules producing same status is not a conflict", () => {
		const s1 = makeStudent();
		const r1 = makeRule({
			ruleType: "Student Temporary Absence",
			targetType: "student",
			targetStudentId: s1.id,
		});
		const r2 = makeRule({
			ruleType: "District-Wide Break",
		});
		const statuses = [makeStatus(s1.id, "A", [r1.id, r2.id])];

		const { conflicts } = detectConflicts(
			MONDAY,
			statuses,
			[r1, r2],
			[{ id: s1.id, schoolId: s1.schoolId }],
		);

		expect(conflicts).toHaveLength(0);
	});

	it("day switch original day + student absence both producing A is not a conflict", () => {
		const s1 = makeStudent();
		const switchRule = makeRule({
			ruleType: "Temporary Day Switch",
			targetType: "student",
			targetStudentId: s1.id,
			switchFromTo: "Mon>Wed",
			daysOfWeek: null,
		});
		const absenceRule = makeRule({
			ruleType: "Student Temporary Absence",
			targetType: "student",
			targetStudentId: s1.id,
		});
		const statuses = [makeStatus(s1.id, "A", [switchRule.id, absenceRule.id])];

		const { conflicts } = detectConflicts(
			MONDAY,
			statuses,
			[switchRule, absenceRule],
			[{ id: s1.id, schoolId: s1.schoolId }],
		);

		expect(conflicts).toHaveLength(0);
	});

	it("absence + ED on same student resolves to A (A wins)", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const absenceRule = makeRule({
			ruleType: "District-Wide Break",
		});
		const edRule = makeRule({
			ruleType: "Early Dismissal",
			targetType: "school",
			targetSchoolId: "school-A",
		});
		const statuses = [makeStatus(s1.id, "A", [absenceRule.id, edRule.id])];

		const { resolved, conflicts } = detectConflicts(
			MONDAY,
			statuses,
			[absenceRule, edRule],
			[{ id: s1.id, schoolId: "school-A" }],
		);

		expect(conflicts).toHaveLength(0);
		expect(resolved[0].status).toBe("A");
		expect(resolved[0].effectiveDismissalTime).toBeNull();
	});

	it("day switch original day + ED resolves to A", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const switchRule = makeRule({
			ruleType: "Temporary Day Switch",
			targetType: "student",
			targetStudentId: s1.id,
			switchFromTo: "Mon>Wed",
			daysOfWeek: null,
		});
		const edRule = makeRule({
			ruleType: "Early Dismissal",
			targetType: "school",
			targetSchoolId: "school-A",
		});
		const statuses = [makeStatus(s1.id, "A", [switchRule.id, edRule.id])];

		const { resolved, conflicts } = detectConflicts(
			MONDAY,
			statuses,
			[switchRule, edRule],
			[{ id: s1.id, schoolId: "school-A" }],
		);

		expect(conflicts).toHaveLength(0);
		expect(resolved[0].status).toBe("A");
	});

	it("day switch new day + school closure returns conflict", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const switchRule = makeRule({
			ruleType: "Temporary Day Switch",
			targetType: "student",
			targetStudentId: s1.id,
			switchFromTo: "Mon>Wed",
			daysOfWeek: null,
		});
		const closureRule = makeRule({
			ruleType: "School-Specific Holiday",
			targetType: "school",
			targetSchoolId: "school-A",
		});
		const statuses = [makeStatus(s1.id, "E", [switchRule.id, closureRule.id])];

		const { conflicts } = detectConflicts(
			WEDNESDAY,
			statuses,
			[switchRule, closureRule],
			[{ id: s1.id, schoolId: "school-A" }],
		);

		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].studentId).toBe(s1.id);
	});

	it("extra pickup + school closure returns conflict", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const extraRule = makeRule({
			ruleType: "Extra Pickup Day",
			targetType: "student",
			targetStudentId: s1.id,
		});
		const closureRule = makeRule({
			ruleType: "School-Specific Holiday",
			targetType: "school",
			targetSchoolId: "school-A",
		});
		const statuses = [makeStatus(s1.id, "E", [extraRule.id, closureRule.id])];

		const { conflicts } = detectConflicts(
			MONDAY,
			statuses,
			[extraRule, closureRule],
			[{ id: s1.id, schoolId: "school-A" }],
		);

		expect(conflicts).toHaveLength(1);
	});

	it("extra pickup + student absence returns conflict", () => {
		const s1 = makeStudent();
		const extraRule = makeRule({
			ruleType: "Extra Pickup Day",
			targetType: "student",
			targetStudentId: s1.id,
		});
		const absenceRule = makeRule({
			ruleType: "Student Temporary Absence",
			targetType: "student",
			targetStudentId: s1.id,
		});
		const statuses = [makeStatus(s1.id, "E", [extraRule.id, absenceRule.id])];

		const { conflicts } = detectConflicts(
			MONDAY,
			statuses,
			[extraRule, absenceRule],
			[{ id: s1.id, schoolId: s1.schoolId }],
		);

		expect(conflicts).toHaveLength(1);
	});

	it("no conflicting rules returns clean result", () => {
		const s1 = makeStudent();
		const rule = makeRule({ ruleType: "District-Wide Break" });
		const statuses = [makeStatus(s1.id, "A", [rule.id])];

		const { resolved, conflicts } = detectConflicts(
			MONDAY,
			statuses,
			[rule],
			[{ id: s1.id, schoolId: s1.schoolId }],
		);

		expect(conflicts).toHaveLength(0);
		expect(resolved[0].status).toBe("A");
	});
});
