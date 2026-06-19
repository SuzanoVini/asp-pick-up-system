import { applyExtraPickup } from "../extra-pickup";
import type { IntermediateStatus } from "../types";
import { makeStudent, makeRule, MONDAY, resetIds } from "./helpers";

beforeEach(() => resetIds());

function makeStatus(
	studentId: string,
	status: "P" | "A" | "N" | "E" | "ED" | "D",
): IntermediateStatus {
	return { studentId, status, appliedRuleIds: [], effectiveDismissalTime: null };
}

describe("applyExtraPickup", () => {
	it("changes N to E for matching student on matching day", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "N")];
		const rules = [
			makeRule({
				ruleType: "Extra Pickup Day",
				targetType: "student",
				targetStudentId: s1.id,
				daysOfWeek: ["Mon"],
			}),
		];

		const result = applyExtraPickup(MONDAY, statuses, rules);

		expect(result[0].status).toBe("E");
		expect(result[0].appliedRuleIds).toHaveLength(1);
	});

	it("does NOT change P status", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "P")];
		const rules = [
			makeRule({
				ruleType: "Extra Pickup Day",
				targetType: "student",
				targetStudentId: s1.id,
			}),
		];

		const result = applyExtraPickup(MONDAY, statuses, rules);

		expect(result[0].status).toBe("P");
	});

	it("does NOT change A status", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "A")];
		const rules = [
			makeRule({
				ruleType: "Extra Pickup Day",
				targetType: "student",
				targetStudentId: s1.id,
			}),
		];

		const result = applyExtraPickup(MONDAY, statuses, rules);

		expect(result[0].status).toBe("A");
	});

	it("only affects targeted student", () => {
		const s1 = makeStudent();
		const s2 = makeStudent();
		const statuses = [makeStatus(s1.id, "N"), makeStatus(s2.id, "N")];
		const rules = [
			makeRule({
				ruleType: "Extra Pickup Day",
				targetType: "student",
				targetStudentId: s1.id,
			}),
		];

		const result = applyExtraPickup(MONDAY, statuses, rules);

		expect(result.find((r) => r.studentId === s1.id)?.status).toBe("E");
		expect(result.find((r) => r.studentId === s2.id)?.status).toBe("N");
	});

	it("does not apply outside date range", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "N")];
		const rules = [
			makeRule({
				ruleType: "Extra Pickup Day",
				targetType: "student",
				targetStudentId: s1.id,
				startDate: "2026-11-01",
				endDate: "2026-11-30",
			}),
		];

		const result = applyExtraPickup(MONDAY, statuses, rules);

		expect(result[0].status).toBe("N");
	});

	it("does not apply on non-matching day", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "N")];
		const rules = [
			makeRule({
				ruleType: "Extra Pickup Day",
				targetType: "student",
				targetStudentId: s1.id,
				daysOfWeek: ["Tue"],
			}),
		];

		const result = applyExtraPickup(MONDAY, statuses, rules);

		expect(result[0].status).toBe("N");
	});
});
