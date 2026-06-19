import { applyDistrictRules } from "../district-rules";
import type { IntermediateStatus } from "../types";
import { makeRule, MONDAY, TUESDAY, resetIds } from "./helpers";

beforeEach(() => resetIds());

function makeStatus(
	studentId: string,
	status: "P" | "A" | "N" | "E" | "ED" | "D",
): IntermediateStatus {
	return { studentId, status, appliedRuleIds: [], effectiveDismissalTime: null };
}

describe("applyDistrictRules", () => {
	it("changes all P to A for district break within range", () => {
		const statuses = [makeStatus("s1", "P"), makeStatus("s2", "P")];
		const rules = [
			makeRule({
				ruleType: "District-Wide Break",
				startDate: "2026-10-01",
				endDate: "2026-10-31",
			}),
		];

		const result = applyDistrictRules(MONDAY, statuses, rules);

		expect(result.every((s) => s.status === "A")).toBe(true);
		expect(result[0].appliedRuleIds).toHaveLength(1);
	});

	it("changes all P to A for district pro-d day", () => {
		const statuses = [makeStatus("s1", "P")];
		const rules = [
			makeRule({
				ruleType: "District Pro-D Day",
				startDate: "2026-10-05",
				endDate: "2026-10-05",
				daysOfWeek: ["Mon"],
			}),
		];

		const result = applyDistrictRules(MONDAY, statuses, rules);

		expect(result[0].status).toBe("A");
	});

	it("does NOT change N status (N/E isolation)", () => {
		const statuses = [makeStatus("s1", "N")];
		const rules = [makeRule({ ruleType: "District-Wide Break" })];

		const result = applyDistrictRules(MONDAY, statuses, rules);

		expect(result[0].status).toBe("N");
	});

	it("does NOT change E status (N/E isolation)", () => {
		const statuses = [makeStatus("s1", "E")];
		const rules = [makeRule({ ruleType: "District-Wide Break" })];

		const result = applyDistrictRules(MONDAY, statuses, rules);

		expect(result[0].status).toBe("E");
	});

	it("does not apply rule outside date range", () => {
		const statuses = [makeStatus("s1", "P")];
		const rules = [
			makeRule({
				ruleType: "District-Wide Break",
				startDate: "2026-11-01",
				endDate: "2026-11-30",
			}),
		];

		const result = applyDistrictRules(MONDAY, statuses, rules);

		expect(result[0].status).toBe("P");
	});

	it("does not apply rule on non-matching day of week", () => {
		const statuses = [makeStatus("s1", "P")];
		const rules = [
			makeRule({
				ruleType: "District-Wide Break",
				daysOfWeek: ["Tue", "Wed"],
			}),
		];

		const result = applyDistrictRules(MONDAY, statuses, rules);

		expect(result[0].status).toBe("P");
	});

	it("does not apply inactive rule", () => {
		const statuses = [makeStatus("s1", "P")];
		const rules = [makeRule({ ruleType: "District-Wide Break", isActive: false })];

		const result = applyDistrictRules(MONDAY, statuses, rules);

		expect(result[0].status).toBe("P");
	});
});
