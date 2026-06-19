import { applyDaySwitch } from "../day-switch";
import type { IntermediateStatus } from "../types";
import { makeStudent, makeRule, MONDAY, TUESDAY, WEDNESDAY, resetIds } from "./helpers";

beforeEach(() => resetIds());

function makeStatus(
	studentId: string,
	status: "P" | "A" | "N" | "E" | "ED" | "D",
): IntermediateStatus {
	return { studentId, status, appliedRuleIds: [], effectiveDismissalTime: null };
}

describe("applyDaySwitch", () => {
	it("changes P to A on the original day (Mon>Wed computed on Monday)", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "P")];
		const rules = [
			makeRule({
				ruleType: "Temporary Day Switch",
				targetType: "student",
				targetStudentId: s1.id,
				switchFromTo: "Mon>Wed",
				daysOfWeek: null,
			}),
		];

		const result = applyDaySwitch(MONDAY, statuses, rules);

		expect(result[0].status).toBe("A");
		expect(result[0].appliedRuleIds).toHaveLength(1);
	});

	it("changes N to E on the new day (Mon>Wed computed on Wednesday)", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "N")];
		const rules = [
			makeRule({
				ruleType: "Temporary Day Switch",
				targetType: "student",
				targetStudentId: s1.id,
				switchFromTo: "Mon>Wed",
				daysOfWeek: null,
			}),
		];

		const result = applyDaySwitch(WEDNESDAY, statuses, rules);

		expect(result[0].status).toBe("E");
		expect(result[0].appliedRuleIds).toHaveLength(1);
	});

	it("does not change status on a non-involved day (Tuesday)", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "P")];
		const rules = [
			makeRule({
				ruleType: "Temporary Day Switch",
				targetType: "student",
				targetStudentId: s1.id,
				switchFromTo: "Mon>Wed",
				daysOfWeek: null,
			}),
		];

		const result = applyDaySwitch(TUESDAY, statuses, rules);

		expect(result[0].status).toBe("P");
	});

	it("does not apply outside date range", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "P")];
		const rules = [
			makeRule({
				ruleType: "Temporary Day Switch",
				targetType: "student",
				targetStudentId: s1.id,
				switchFromTo: "Mon>Wed",
				startDate: "2026-11-01",
				endDate: "2026-11-30",
				daysOfWeek: null,
			}),
		];

		const result = applyDaySwitch(MONDAY, statuses, rules);

		expect(result[0].status).toBe("P");
	});

	it("only affects the targeted student", () => {
		const s1 = makeStudent();
		const s2 = makeStudent();
		const statuses = [makeStatus(s1.id, "P"), makeStatus(s2.id, "P")];
		const rules = [
			makeRule({
				ruleType: "Temporary Day Switch",
				targetType: "student",
				targetStudentId: s1.id,
				switchFromTo: "Mon>Wed",
				daysOfWeek: null,
			}),
		];

		const result = applyDaySwitch(MONDAY, statuses, rules);

		expect(result.find((r) => r.studentId === s1.id)?.status).toBe("A");
		expect(result.find((r) => r.studentId === s2.id)?.status).toBe("P");
	});

	it("independent per-date: same rule produces P->A on Monday and N->E on Wednesday", () => {
		const s1 = makeStudent();
		const rule = makeRule({
			ruleType: "Temporary Day Switch",
			targetType: "student",
			targetStudentId: s1.id,
			switchFromTo: "Mon>Wed",
			daysOfWeek: null,
		});

		const mondayResult = applyDaySwitch(MONDAY, [makeStatus(s1.id, "P")], [rule]);
		const wednesdayResult = applyDaySwitch(WEDNESDAY, [makeStatus(s1.id, "N")], [rule]);

		expect(mondayResult[0].status).toBe("A");
		expect(wednesdayResult[0].status).toBe("E");
	});
});
