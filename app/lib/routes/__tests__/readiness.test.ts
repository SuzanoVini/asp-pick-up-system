import { validateReadiness } from "../readiness";
import type { VehicleRoute, RouteStop } from "../types";

function makeStop(overrides: Partial<RouteStop> = {}): RouteStop {
	return {
		id: "stop-1",
		routeId: "route-1",
		studentId: "student-1",
		schoolId: "school-1",
		seatNumber: 1,
		orderIndex: 1,
		distanceFromPrevKm: null,
		durationFromPrevMin: null,
		needsBooster: false,
		studentNameSnapshot: "Test Student",
		schoolNameSnapshot: "Test School",
		schoolAddressSnapshot: "123 Test St",
		dismissalTimeSnapshot: "15:00",
		...overrides,
	};
}

function makeRoute(overrides: Partial<VehicleRoute> = {}): VehicleRoute {
	const stops = overrides.stops ?? [makeStop()];
	return {
		id: "route-1",
		date: "2026-10-05",
		vehicleId: "vehicle-1",
		vehicleName: "Van 1",
		status: "active",
		totalDistanceKm: null,
		driverName: "Driver A",
		helperName: "Helper A",
		stops,
		kidsSeats: 6,
		boosterSeats: 2,
		assignedCount: stops.length,
		boosterRequiredCount: stops.filter((s) => s.needsBooster).length,
		...overrides,
	};
}

describe("validateReadiness", () => {
	it("all checks pass for a valid route", () => {
		const result = validateReadiness({
			routes: [makeRoute()],
			allRoutableStudentIds: ["student-1"],
			date: "2026-10-05",
		});
		expect(result.canExport).toBe(true);
		expect(result.blockerCount).toBe(0);
	});

	it("stale route is a blocker", () => {
		const result = validateReadiness({
			routes: [makeRoute({ status: "stale" })],
			allRoutableStudentIds: ["student-1"],
			date: "2026-10-05",
		});
		expect(result.canExport).toBe(false);
		const check = result.checks.find((c) => c.name === "stale_route");
		expect(check?.passed).toBe(false);
		expect(check?.severity).toBe("blocker");
	});

	it("unrouted students is a warning", () => {
		const result = validateReadiness({
			routes: [makeRoute()],
			allRoutableStudentIds: ["student-1", "student-2"],
			date: "2026-10-05",
		});
		const check = result.checks.find((c) => c.name === "unrouted_students");
		expect(check?.passed).toBe(false);
		expect(check?.severity).toBe("warning");
		expect(result.canExport).toBe(true);
	});

	it("missing driver is a blocker", () => {
		const result = validateReadiness({
			routes: [makeRoute({ driverName: null })],
			allRoutableStudentIds: ["student-1"],
			date: "2026-10-05",
		});
		expect(result.canExport).toBe(false);
		const check = result.checks.find((c) => c.name === "missing_driver");
		expect(check?.passed).toBe(false);
	});

	it("missing helper is a warning", () => {
		const result = validateReadiness({
			routes: [makeRoute({ helperName: null })],
			allRoutableStudentIds: ["student-1"],
			date: "2026-10-05",
		});
		const check = result.checks.find((c) => c.name === "missing_helper");
		expect(check?.passed).toBe(false);
		expect(check?.severity).toBe("warning");
		expect(result.canExport).toBe(true);
	});

	it("over capacity is a blocker", () => {
		const result = validateReadiness({
			routes: [makeRoute({ assignedCount: 10, kidsSeats: 6 })],
			allRoutableStudentIds: ["student-1"],
			date: "2026-10-05",
		});
		expect(result.canExport).toBe(false);
		const check = result.checks.find((c) => c.name === "over_capacity");
		expect(check?.passed).toBe(false);
	});

	it("booster shortage is a warning", () => {
		const result = validateReadiness({
			routes: [makeRoute({ boosterRequiredCount: 5, boosterSeats: 2 })],
			allRoutableStudentIds: ["student-1"],
			date: "2026-10-05",
		});
		const check = result.checks.find((c) => c.name === "booster_shortage");
		expect(check?.passed).toBe(false);
		expect(check?.severity).toBe("warning");
	});

	it("missing address is a warning", () => {
		const result = validateReadiness({
			routes: [makeRoute({ stops: [makeStop({ schoolAddressSnapshot: null })] })],
			allRoutableStudentIds: ["student-1"],
			date: "2026-10-05",
		});
		const check = result.checks.find((c) => c.name === "missing_address");
		expect(check?.passed).toBe(false);
	});

	it("duplicate student across routes is a blocker", () => {
		const result = validateReadiness({
			routes: [
				makeRoute({ id: "r1", stops: [makeStop({ studentId: "s1" })] }),
				makeRoute({ id: "r2", stops: [makeStop({ id: "stop-2", studentId: "s1", seatNumber: 1 })] }),
			],
			allRoutableStudentIds: ["s1"],
			date: "2026-10-05",
		});
		expect(result.canExport).toBe(false);
		const check = result.checks.find((c) => c.name === "duplicate_student");
		expect(check?.passed).toBe(false);
	});

	it("returns deterministic sorted checks", () => {
		const result = validateReadiness({
			routes: [makeRoute()],
			allRoutableStudentIds: ["student-1"],
			date: "2026-10-05",
		});
		expect(result.checks).toHaveLength(8);
		expect(result.checks[0].name).toBe("stale_route");
		expect(result.checks[7].name).toBe("duplicate_student");
	});
});
