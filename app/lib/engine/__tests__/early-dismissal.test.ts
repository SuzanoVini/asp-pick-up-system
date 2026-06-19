import { applyEarlyDismissal } from "../early-dismissal";
import type { IntermediateStatus } from "../types";
import { makeStudent, makeRule, makeSchool, makeSettings, MONDAY, resetIds } from "./helpers";

beforeEach(() => resetIds());

function makeStatus(
	studentId: string,
	status: "P" | "A" | "N" | "E" | "ED" | "D",
): IntermediateStatus {
	return { studentId, status, appliedRuleIds: [], effectiveDismissalTime: null };
}

describe("applyEarlyDismissal", () => {
	it("changes P to ED for school-level ED rule", () => {
		const s1 = makeStudent({ schoolId: "school-A" });
		const statuses = [makeStatus(s1.id, "P")];
		const rules = [
			makeRule({
				ruleType: "Early Dismissal",
				targetType: "school",
				targetSchoolId: "school-A",
			}),
		];
		const schools = [makeSchool({ id: "school-A" })];

		const result = applyEarlyDismissal(MONDAY, statuses, rules, [s1], schools, makeSettings());

		expect(result[0].status).toBe("ED");
	});

	it("changes P to ED for student-specific ED rule", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "P")];
		const rules = [
			makeRule({
				ruleType: "Early Dismissal",
				targetType: "student",
				targetStudentId: s1.id,
			}),
		];

		const result = applyEarlyDismissal(
			MONDAY,
			statuses,
			rules,
			[s1],
			[makeSchool()],
			makeSettings(),
		);

		expect(result[0].status).toBe("ED");
	});

	it("does NOT change N status (N/E isolation)", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "N")];
		const rules = [
			makeRule({
				ruleType: "Early Dismissal",
				targetType: "student",
				targetStudentId: s1.id,
			}),
		];

		const result = applyEarlyDismissal(
			MONDAY,
			statuses,
			rules,
			[s1],
			[makeSchool()],
			makeSettings(),
		);

		expect(result[0].status).toBe("N");
	});

	it("does NOT change E status (N/E isolation)", () => {
		const s1 = makeStudent();
		const statuses = [makeStatus(s1.id, "E")];
		const rules = [
			makeRule({
				ruleType: "Early Dismissal",
				targetType: "student",
				targetStudentId: s1.id,
			}),
		];

		const result = applyEarlyDismissal(
			MONDAY,
			statuses,
			rules,
			[s1],
			[makeSchool()],
			makeSettings(),
		);

		expect(result[0].status).toBe("E");
	});

	describe("5-level ED time resolution", () => {
		it("level 1: uses student-specific rule early_dismissal_time first", () => {
			const s1 = makeStudent({ earlyDismissalTime: "13:30" });
			const statuses = [makeStatus(s1.id, "P")];
			const rules = [
				makeRule({
					ruleType: "Early Dismissal",
					targetType: "student",
					targetStudentId: s1.id,
					earlyDismissalTime: "13:00",
				}),
			];

			const result = applyEarlyDismissal(
				MONDAY,
				statuses,
				rules,
				[s1],
				[makeSchool()],
				makeSettings(),
			);

			expect(result[0].effectiveDismissalTime).toBe("13:00");
		});

		it("level 2: falls back to student standing earlyDismissalTime", () => {
			const s1 = makeStudent({ earlyDismissalTime: "13:30" });
			const statuses = [makeStatus(s1.id, "P")];
			const rules = [
				makeRule({
					ruleType: "Early Dismissal",
					targetType: "student",
					targetStudentId: s1.id,
					earlyDismissalTime: null,
				}),
			];

			const result = applyEarlyDismissal(
				MONDAY,
				statuses,
				rules,
				[s1],
				[makeSchool()],
				makeSettings(),
			);

			expect(result[0].effectiveDismissalTime).toBe("13:30");
		});

		it("level 3: falls back to school-level rule earlyDismissalTime", () => {
			const s1 = makeStudent({ schoolId: "school-A", earlyDismissalTime: null });
			const statuses = [makeStatus(s1.id, "P")];
			const schoolRule = makeRule({
				ruleType: "Early Dismissal",
				targetType: "school",
				targetSchoolId: "school-A",
				earlyDismissalTime: "12:30",
			});
			const studentRule = makeRule({
				ruleType: "Early Dismissal",
				targetType: "student",
				targetStudentId: s1.id,
				earlyDismissalTime: null,
			});

			const result = applyEarlyDismissal(
				MONDAY,
				statuses,
				[studentRule, schoolRule],
				[s1],
				[makeSchool({ id: "school-A" })],
				makeSettings(),
			);

			expect(result[0].effectiveDismissalTime).toBe("12:30");
		});

		it("level 4: falls back to school default earlyDismissalTime", () => {
			const s1 = makeStudent({ schoolId: "school-A", earlyDismissalTime: null });
			const statuses = [makeStatus(s1.id, "P")];
			const rules = [
				makeRule({
					ruleType: "Early Dismissal",
					targetType: "school",
					targetSchoolId: "school-A",
					earlyDismissalTime: null,
				}),
			];

			const result = applyEarlyDismissal(
				MONDAY,
				statuses,
				rules,
				[s1],
				[makeSchool({ id: "school-A", earlyDismissalTime: "13:45" })],
				makeSettings(),
			);

			expect(result[0].effectiveDismissalTime).toBe("13:45");
		});

		it("level 5: falls back to system default earlyDismissalTime", () => {
			const s1 = makeStudent({ schoolId: "school-A", earlyDismissalTime: null });
			const statuses = [makeStatus(s1.id, "P")];
			const rules = [
				makeRule({
					ruleType: "Early Dismissal",
					targetType: "school",
					targetSchoolId: "school-A",
					earlyDismissalTime: null,
				}),
			];

			const result = applyEarlyDismissal(
				MONDAY,
				statuses,
				rules,
				[s1],
				[makeSchool({ id: "school-A", earlyDismissalTime: "" })],
				makeSettings({ defaultEarlyDismissalTime: "14:00" }),
			);

			expect(result[0].effectiveDismissalTime).toBe("14:00");
		});
	});
});
