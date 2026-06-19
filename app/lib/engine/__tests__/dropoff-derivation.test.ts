import { deriveDropoffAndBooster } from "../dropoff-derivation";
import type { IntermediateStatus } from "../types";
import { makeStudent, MONDAY, resetIds } from "./helpers";

beforeEach(() => resetIds());

function makeStatus(
	studentId: string,
	status: "P" | "A" | "N" | "E" | "ED" | "D",
): IntermediateStatus {
	return { studentId, status, appliedRuleIds: [], effectiveDismissalTime: null };
}

describe("deriveDropoffAndBooster", () => {
	it("changes P to D for drop-off-only student", () => {
		const s1 = makeStudent({ dropOffOnly: true });
		const statuses = [makeStatus(s1.id, "P")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].status).toBe("D");
	});

	it("does NOT change A for drop-off-only student", () => {
		const s1 = makeStudent({ dropOffOnly: true });
		const statuses = [makeStatus(s1.id, "A")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].status).toBe("A");
	});

	it("does NOT change ED for drop-off-only student", () => {
		const s1 = makeStudent({ dropOffOnly: true });
		const statuses = [makeStatus(s1.id, "ED")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].status).toBe("ED");
	});

	it("does NOT change E for drop-off-only student", () => {
		const s1 = makeStudent({ dropOffOnly: true });
		const statuses = [makeStatus(s1.id, "E")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].status).toBe("E");
	});

	it("does NOT change N for drop-off-only student", () => {
		const s1 = makeStudent({ dropOffOnly: true });
		const statuses = [makeStatus(s1.id, "N")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].status).toBe("N");
	});

	it("does NOT change P for non-drop-off student", () => {
		const s1 = makeStudent({ dropOffOnly: false });
		const statuses = [makeStatus(s1.id, "P")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].status).toBe("P");
	});

	it("sets needsBooster true for student under 9", () => {
		// MONDAY is 2026-10-05; DOB 2019-01-01 = ~7 years old
		const s1 = makeStudent({ dateOfBirth: "2019-01-01" });
		const statuses = [makeStatus(s1.id, "P")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].needsBooster).toBe(true);
	});

	it("sets needsBooster false for student 9 or older", () => {
		// MONDAY is 2026-10-05; DOB 2015-01-01 = 11 years old
		const s1 = makeStudent({ dateOfBirth: "2015-01-01" });
		const statuses = [makeStatus(s1.id, "P")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].needsBooster).toBe(false);
	});

	it("sets needsBooster false when dateOfBirth is null", () => {
		const s1 = makeStudent({ dateOfBirth: null });
		const statuses = [makeStatus(s1.id, "P")];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], []);

		expect(result[0].needsBooster).toBe(false);
	});

	it("attaches conflicts to the correct student", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "P")];
		const conflicts = [
			{
				studentId: s1.id,
				conflictingRules: [],
				description: "test conflict",
			},
		];

		const result = deriveDropoffAndBooster(MONDAY, statuses, [s1], conflicts);

		expect(result[0].conflicts).toHaveLength(1);
		expect(result[0].conflicts[0].description).toBe("test conflict");
	});
});
