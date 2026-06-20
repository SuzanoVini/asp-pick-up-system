import { applySchoolRules } from "../school-rules";
import type { IntermediateStatus } from "../types";
import { MONDAY, makeRule, makeStudent, resetIds } from "./helpers";

beforeEach(() => resetIds());

function makeStatus(
	studentId: string,
	status: "P" | "A" | "N" | "E" | "ED" | "D",
): IntermediateStatus {
	return { studentId, status, appliedRuleIds: [], effectiveDismissalTime: null };
}

describe("applySchoolRules", () => {
	it("marks students at target school absent for school holiday", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const s2 = makeStudent({ schoolId: "school-B" });
		const statuses = [makeStatus(s1.id, "P"), makeStatus(s2.id, "P")];
		const rules = [
			makeRule({
				ruleType: "School-Specific Holiday",
				targetType: "school",
				targetSchoolId: "school-A",
			}),
		];

		const result = applySchoolRules(MONDAY, statuses, rules, [s1, s2]);

		expect(result.find((r) => r.studentId === s1.id)?.status).toBe("A");
		expect(result.find((r) => r.studentId === s2.id)?.status).toBe("P");
	});

	it("marks students at target school absent for school pro-d", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const statuses = [makeStatus(s1.id, "P")];
		const rules = [
			makeRule({
				ruleType: "School Pro-D Day",
				targetType: "school",
				targetSchoolId: "school-A",
			}),
		];

		const result = applySchoolRules(MONDAY, statuses, rules, [s1]);

		expect(result[0].status).toBe("A");
	});

	it("does NOT change N status (N/E isolation)", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const statuses = [makeStatus(s1.id, "N")];
		const rules = [
			makeRule({
				ruleType: "School-Specific Holiday",
				targetType: "school",
				targetSchoolId: "school-A",
			}),
		];

		const result = applySchoolRules(MONDAY, statuses, rules, [s1]);

		expect(result[0].status).toBe("N");
	});

	it("does NOT change E status (N/E isolation)", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const statuses = [makeStatus(s1.id, "E")];
		const rules = [
			makeRule({
				ruleType: "School-Specific Holiday",
				targetType: "school",
				targetSchoolId: "school-A",
			}),
		];

		const result = applySchoolRules(MONDAY, statuses, rules, [s1]);

		expect(result[0].status).toBe("E");
	});

	it("does not affect students at other schools", () => {
		const s1 = makeStudent({ schoolId: "school-B" });
		const statuses = [makeStatus(s1.id, "P")];
		const rules = [
			makeRule({
				ruleType: "School-Specific Holiday",
				targetType: "school",
				targetSchoolId: "school-A",
			}),
		];

		const result = applySchoolRules(MONDAY, statuses, rules, [s1]);

		expect(result[0].status).toBe("P");
	});
});
