import { computeBaseSchedule } from "../base-schedule";
import { makeStudent, makeEnrollment, MONDAY, TUESDAY, SATURDAY, resetIds } from "./helpers";

beforeEach(() => resetIds());

describe("computeBaseSchedule", () => {
	it("returns P for a student scheduled on the given day", () => {
		const student = makeStudent();
		const enrollment = makeEnrollment(student.id, { contractDays: ["Mon", "Wed", "Fri"] });

		const result = computeBaseSchedule(MONDAY, [student], [enrollment]);

		expect(result).toHaveLength(1);
		expect(result[0].status).toBe("P");
		expect(result[0].studentId).toBe(student.id);
	});

	it("returns N for a student not scheduled on the given day", () => {
		const student = makeStudent();
		const enrollment = makeEnrollment(student.id, { contractDays: ["Mon", "Wed", "Fri"] });

		const result = computeBaseSchedule(TUESDAY, [student], [enrollment]);

		expect(result).toHaveLength(1);
		expect(result[0].status).toBe("N");
	});

	it("excludes students with no enrollment", () => {
		const student = makeStudent();

		const result = computeBaseSchedule(MONDAY, [student], []);

		expect(result).toHaveLength(0);
	});

	it("excludes students with pending enrollment", () => {
		const student = makeStudent();
		const enrollment = makeEnrollment(student.id, { status: "pending" });

		const result = computeBaseSchedule(MONDAY, [student], [enrollment]);

		expect(result).toHaveLength(0);
	});

	it("excludes students with cancelled enrollment", () => {
		const student = makeStudent();
		const enrollment = makeEnrollment(student.id, { status: "cancelled" });

		const result = computeBaseSchedule(MONDAY, [student], [enrollment]);

		expect(result).toHaveLength(0);
	});

	it("handles multiple students with different contracts", () => {
		const s1 = makeStudent({ name: "Student A" });
		const s2 = makeStudent({ name: "Student B" });
		const e1 = makeEnrollment(s1.id, { contractDays: ["Mon", "Wed"] });
		const e2 = makeEnrollment(s2.id, { contractDays: ["Tue", "Thu"] });

		const result = computeBaseSchedule(MONDAY, [s1, s2], [e1, e2]);

		expect(result).toHaveLength(2);
		expect(result.find((r) => r.studentId === s1.id)?.status).toBe("P");
		expect(result.find((r) => r.studentId === s2.id)?.status).toBe("N");
	});

	it("returns P for all weekdays with 5-day contract", () => {
		const student = makeStudent();
		const enrollment = makeEnrollment(student.id, {
			contractDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
		});

		const result = computeBaseSchedule(MONDAY, [student], [enrollment]);
		expect(result[0].status).toBe("P");

		const result2 = computeBaseSchedule(TUESDAY, [student], [enrollment]);
		expect(result2[0].status).toBe("P");
	});

	it("returns empty array for weekends", () => {
		const student = makeStudent();
		const enrollment = makeEnrollment(student.id);

		const result = computeBaseSchedule(SATURDAY, [student], [enrollment]);

		expect(result).toHaveLength(0);
	});

	it("excludes students with status pending", () => {
		const student = makeStudent({ status: "pending" });
		const enrollment = makeEnrollment(student.id);

		const result = computeBaseSchedule(MONDAY, [student], [enrollment]);

		expect(result).toHaveLength(0);
	});

	it("excludes students with status former", () => {
		const student = makeStudent({ status: "former" });
		const enrollment = makeEnrollment(student.id);

		const result = computeBaseSchedule(MONDAY, [student], [enrollment]);

		expect(result).toHaveLength(0);
	});

	it("only uses enrollments covering the given date", () => {
		const student = makeStudent();
		const pastEnrollment = makeEnrollment(student.id, {
			startDate: "2025-01-01",
			endDate: "2025-12-31",
		});

		const result = computeBaseSchedule(MONDAY, [student], [pastEnrollment]);

		expect(result).toHaveLength(0);
	});
});
