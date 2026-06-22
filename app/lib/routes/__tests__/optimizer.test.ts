import type { AttendanceResult } from "../../engine/types";
import {
	assignStaffToVehicles,
	assignToVehicles,
	collectRoutableStudents,
	generateRoutes,
	groupBySchool,
} from "../optimizer";
import type { RouteGenerationInput } from "../types";

function makeResult(studentId: string, status: string): AttendanceResult {
	return {
		studentId,
		status: status as AttendanceResult["status"],
		effectiveDismissalTime: null,
		needsBooster: false,
		appliedRules: [],
		conflicts: [],
		isManualOverride: false,
	};
}

function makeInput(overrides: Partial<RouteGenerationInput> = {}): RouteGenerationInput {
	return {
		date: "2026-10-05",
		attendanceResults: [
			makeResult("s1", "P"),
			makeResult("s2", "P"),
			makeResult("s3", "A"),
			makeResult("s4", "N"),
			makeResult("s5", "E"),
			makeResult("s6", "ED"),
			makeResult("s7", "D"),
		],
		students: [
			{
				id: "s1",
				name: "Student One",
				schoolId: "sc1",
				dropOffOnly: false,
				dateOfBirth: "2020-01-15",
				dismissalTime: null,
			},
			{
				id: "s2",
				name: "Student Two",
				schoolId: "sc1",
				dropOffOnly: false,
				dateOfBirth: "2015-06-20",
				dismissalTime: null,
			},
			{
				id: "s3",
				name: "Student Three",
				schoolId: "sc1",
				dropOffOnly: false,
				dateOfBirth: null,
				dismissalTime: null,
			},
			{
				id: "s4",
				name: "Student Four",
				schoolId: "sc2",
				dropOffOnly: false,
				dateOfBirth: null,
				dismissalTime: null,
			},
			{
				id: "s5",
				name: "Student Five",
				schoolId: "sc2",
				dropOffOnly: false,
				dateOfBirth: null,
				dismissalTime: null,
			},
			{
				id: "s6",
				name: "Student Six",
				schoolId: "sc2",
				dropOffOnly: false,
				dateOfBirth: null,
				dismissalTime: null,
			},
			{
				id: "s7",
				name: "Student Seven",
				schoolId: "sc1",
				dropOffOnly: true,
				dateOfBirth: null,
				dismissalTime: null,
			},
		],
		schools: [
			{
				id: "sc1",
				name: "School A",
				address: "100 Elm St",
				standardDismissalTime: "15:00",
				lat: 49.26,
				lng: -123.13,
			},
			{
				id: "sc2",
				name: "School B",
				address: "200 Oak Ave",
				standardDismissalTime: "15:00",
				lat: 49.27,
				lng: -123.15,
			},
		],
		vehicles: [
			{ id: "v1", name: "Van 1", kidsSeats: 6, boosterSeats: 2, isActive: true },
			{ id: "v2", name: "Van 2", kidsSeats: 4, boosterSeats: 1, isActive: true },
		],
		availableStaff: [
			{ id: "st1", name: "Driver A", capabilities: ["driver"] },
			{ id: "st2", name: "Helper A", capabilities: ["helper"] },
		],
		originLat: null,
		originLng: null,
		...overrides,
	};
}

describe("collectRoutableStudents", () => {
	it("includes P, E, ED students", () => {
		const result = collectRoutableStudents(makeInput());
		const ids = result.map((s) => s.id);
		expect(ids).toContain("s1");
		expect(ids).toContain("s5");
		expect(ids).toContain("s6");
	});

	it("excludes A and N students", () => {
		const result = collectRoutableStudents(makeInput());
		const ids = result.map((s) => s.id);
		expect(ids).not.toContain("s3");
		expect(ids).not.toContain("s4");
	});

	it("excludes D (drop-off status) students", () => {
		const result = collectRoutableStudents(makeInput());
		const ids = result.map((s) => s.id);
		expect(ids).not.toContain("s7");
	});

	it("excludes drop_off_only students even with P status", () => {
		const input = makeInput({
			attendanceResults: [makeResult("s7", "P")],
			students: [
				{
					id: "s7",
					name: "Drop Off Kid",
					schoolId: "sc1",
					dropOffOnly: true,
					dateOfBirth: null,
					dismissalTime: null,
				},
			],
		});
		const result = collectRoutableStudents(input);
		expect(result).toHaveLength(0);
	});

	it("flags booster for students under 9", () => {
		const result = collectRoutableStudents(makeInput());
		const s1 = result.find((s) => s.id === "s1");
		const s2 = result.find((s) => s.id === "s2");
		expect(s1?.needsBooster).toBe(true);
		expect(s2?.needsBooster).toBe(false);
	});
});

describe("groupBySchool", () => {
	it("groups students by school", () => {
		const students = collectRoutableStudents(makeInput());
		const groups = groupBySchool(students, makeInput().schools);
		expect(groups.length).toBeGreaterThanOrEqual(1);
		for (const g of groups) {
			for (const s of g.students) {
				expect(s.schoolId).toBe(g.schoolId);
			}
		}
	});
});

describe("assignToVehicles", () => {
	it("respects vehicle capacity", () => {
		const input = makeInput({
			vehicles: [{ id: "v1", name: "Van 1", kidsSeats: 2, boosterSeats: 0, isActive: true }],
		});
		const students = collectRoutableStudents(input);
		const groups = groupBySchool(students, input.schools);
		const { assigned, unrouted } = assignToVehicles(groups, input.vehicles);

		const v1 = assigned.get("v1");
		expect(v1?.students.length).toBeLessThanOrEqual(2);
		expect(unrouted.length).toBeGreaterThan(0);
	});
});

describe("assignStaffToVehicles", () => {
	it("assigns drivers and helpers by capability", () => {
		const staff = [
			{ id: "st1", name: "Driver A", capabilities: ["driver"] },
			{ id: "st2", name: "Helper A", capabilities: ["helper"] },
		];
		const result = assignStaffToVehicles(["v1"], staff);
		const v1 = result.get("v1");
		expect(v1?.driverName).toBe("Driver A");
		expect(v1?.helperName).toBe("Helper A");
	});

	it("does not assign unavailable staff", () => {
		const result = assignStaffToVehicles(["v1"], []);
		const v1 = result.get("v1");
		expect(v1?.driverName).toBeNull();
		expect(v1?.helperName).toBeNull();
	});
});

describe("generateRoutes", () => {
	it("produces routes with correct structure", () => {
		const result = generateRoutes(makeInput());
		expect(result.routes.length).toBeGreaterThan(0);
		for (const route of result.routes) {
			expect(route.status).toBe("draft");
			expect(route.stops.length).toBeGreaterThan(0);
			for (const stop of route.stops) {
				expect(stop.studentNameSnapshot).toBeTruthy();
				expect(stop.schoolNameSnapshot).toBeTruthy();
			}
		}
	});

	it("warns when booster capacity exceeded", () => {
		const input = makeInput({
			vehicles: [{ id: "v1", name: "Van 1", kidsSeats: 10, boosterSeats: 0, isActive: true }],
		});
		const result = generateRoutes(input);
		expect(result.warnings.some((w) => w.includes("booster"))).toBe(true);
	});

	it("reports unrouted students when capacity is insufficient", () => {
		const input = makeInput({
			vehicles: [{ id: "v1", name: "Small Van", kidsSeats: 1, boosterSeats: 0, isActive: true }],
		});
		const result = generateRoutes(input);
		expect(result.unroutedStudentIds.length).toBeGreaterThan(0);
	});

	it("same-school students are consecutive in stops", () => {
		const result = generateRoutes(makeInput());
		for (const route of result.routes) {
			const schoolOrder = route.stops.map((s) => s.schoolId);
			const seen = new Set<string>();
			let lastSchool = "";
			for (const school of schoolOrder) {
				if (school !== lastSchool) {
					expect(seen.has(school)).toBe(false);
					seen.add(school);
				}
				lastSchool = school;
			}
		}
	});

	it("uses an explicit school order when supplied", () => {
		const result = generateRoutes(makeInput({ orderedSchoolIds: ["sc2", "sc1"] }));
		const schoolOrder = result.routes[0].stops.map((s) => s.schoolId);
		expect(schoolOrder[0]).toBe("sc2");
	});
});
