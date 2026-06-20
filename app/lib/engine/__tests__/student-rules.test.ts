import { applyStudentRules } from "../student-rules";
import type { IntermediateStatus } from "../types";
import { MONDAY, makeRule, makeStudent, resetIds } from "./helpers";

beforeEach(() => resetIds());

function makeStatus(
	studentId: string,
	status: "P" | "A" | "N" | "E" | "ED" | "D",
): IntermediateStatus {
	return { studentId, status, appliedRuleIds: [], effectiveDismissalTime: null };
}

describe("applyStudentRules", () => {
	describe("Student Temporary Absence", () => {
		it("marks target student absent within date range", () => {
			const s1 = makeStudent();
			const s2 = makeStudent();
			const statuses = [makeStatus(s1.id, "P"), makeStatus(s2.id, "P")];
			const rules = [
				makeRule({
					ruleType: "Student Temporary Absence",
					targetType: "student",
					targetStudentId: s1.id,
				}),
			];

			const result = applyStudentRules(MONDAY, statuses, rules);

			expect(result.find((r) => r.studentId === s1.id)?.status).toBe("A");
			expect(result.find((r) => r.studentId === s2.id)?.status).toBe("P");
		});

		it("does NOT change N status (N/E isolation)", () => {
			const s1 = makeStudent();
			const statuses = [makeStatus(s1.id, "N")];
			const rules = [
				makeRule({
					ruleType: "Student Temporary Absence",
					targetType: "student",
					targetStudentId: s1.id,
				}),
			];

			const result = applyStudentRules(MONDAY, statuses, rules);

			expect(result[0].status).toBe("N");
		});
	});

	describe("Attends Every Other Week", () => {
		it("marks absent on even weeks when startWeek is Absent", () => {
			const s1 = makeStudent();
			const statuses = [makeStatus(s1.id, "P")];
			// Week 0 from start date = even = absent when startWeek is Absent
			const rules = [
				makeRule({
					ruleType: "Attends Every Other Week",
					targetType: "student",
					targetStudentId: s1.id,
					startDate: "2026-10-05",
					endDate: "2026-12-31",
					startWeek: "Absent",
				}),
			];

			const result = applyStudentRules(MONDAY, statuses, rules);

			expect(result[0].status).toBe("A");
		});

		it("does not mark absent on odd weeks when startWeek is Absent", () => {
			const s1 = makeStudent();
			const statuses = [makeStatus(s1.id, "P")];
			const rules = [
				makeRule({
					ruleType: "Attends Every Other Week",
					targetType: "student",
					targetStudentId: s1.id,
					startDate: "2026-10-05",
					endDate: "2026-12-31",
					startWeek: "Absent",
				}),
			];

			// One week later = odd week = present
			const nextMonday = new Date("2026-10-12T00:00:00");
			const result = applyStudentRules(nextMonday, statuses, rules);

			expect(result[0].status).toBe("P");
		});

		it("marks absent on odd weeks when startWeek is Present", () => {
			const s1 = makeStudent();
			const statuses = [makeStatus(s1.id, "P")];
			const rules = [
				makeRule({
					ruleType: "Attends Every Other Week",
					targetType: "student",
					targetStudentId: s1.id,
					startDate: "2026-10-05",
					endDate: "2026-12-31",
					startWeek: "Present",
				}),
			];

			// Week 0 from start = even = present when startWeek is Present
			const result = applyStudentRules(MONDAY, statuses, rules);
			expect(result[0].status).toBe("P");

			// Week 1 = odd = absent
			const nextMonday = new Date("2026-10-12T00:00:00");
			const result2 = applyStudentRules(nextMonday, statuses, rules);
			expect(result2[0].status).toBe("A");
		});

		it("does NOT change N status (N/E isolation)", () => {
			const s1 = makeStudent();
			const statuses = [makeStatus(s1.id, "N")];
			const rules = [
				makeRule({
					ruleType: "Attends Every Other Week",
					targetType: "student",
					targetStudentId: s1.id,
					startWeek: "Absent",
				}),
			];

			const result = applyStudentRules(MONDAY, statuses, rules);

			expect(result[0].status).toBe("N");
		});

		it("does not affect non-matching day of week", () => {
			const s1 = makeStudent();
			const statuses = [makeStatus(s1.id, "P")];
			const rules = [
				makeRule({
					ruleType: "Attends Every Other Week",
					targetType: "student",
					targetStudentId: s1.id,
					startWeek: "Absent",
					daysOfWeek: ["Tue"],
				}),
			];

			const result = applyStudentRules(MONDAY, statuses, rules);

			expect(result[0].status).toBe("P");
		});
	});
});
