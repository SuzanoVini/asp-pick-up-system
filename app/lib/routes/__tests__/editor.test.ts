import {
	reindexStops,
	moveStop,
	reorderStop,
	removeStop,
	addStop,
	validateNoCapacityOverflow,
	validateNoDuplicateStudents,
} from "../editor";
import type { VehicleRoute, RouteStop } from "../types";

function makeStop(id: string, studentId: string, orderIndex: number): RouteStop {
	return {
		id,
		routeId: "route-1",
		studentId,
		schoolId: "school-1",
		seatNumber: orderIndex,
		orderIndex,
		distanceFromPrevKm: null,
		durationFromPrevMin: null,
		needsBooster: false,
		studentNameSnapshot: `Student ${studentId}`,
		schoolNameSnapshot: "Test School",
		schoolAddressSnapshot: "123 Test St",
		dismissalTimeSnapshot: "15:00",
	};
}

function makeRoute(id: string, stops: RouteStop[], kidsSeats = 6): VehicleRoute {
	return {
		id,
		date: "2026-10-05",
		vehicleId: `vehicle-${id}`,
		vehicleName: `Van ${id}`,
		status: "draft",
		totalDistanceKm: null,
		driverName: "Driver A",
		helperName: "Helper A",
		stops,
		kidsSeats,
		boosterSeats: 2,
		assignedCount: stops.length,
		boosterRequiredCount: 0,
	};
}

describe("reindexStops", () => {
	it("reassigns sequential orderIndex and seatNumber", () => {
		const stops = [makeStop("a", "s1", 5), makeStop("b", "s2", 10)];
		const result = reindexStops(stops);
		expect(result[0].orderIndex).toBe(1);
		expect(result[0].seatNumber).toBe(1);
		expect(result[1].orderIndex).toBe(2);
		expect(result[1].seatNumber).toBe(2);
	});
});

describe("moveStop", () => {
	it("moves a stop from source to target", () => {
		const source = makeRoute("r1", [makeStop("a", "s1", 1), makeStop("b", "s2", 2)]);
		const target = makeRoute("r2", [makeStop("c", "s3", 1)]);

		const { updatedSource, updatedTarget } = moveStop(source, target, "a");
		expect(updatedSource.stops).toHaveLength(1);
		expect(updatedTarget.stops).toHaveLength(2);
		expect(updatedTarget.stops.some((s) => s.id === "a")).toBe(true);
	});

	it("updates assignedCount correctly", () => {
		const source = makeRoute("r1", [makeStop("a", "s1", 1)]);
		const target = makeRoute("r2", []);

		const { updatedSource, updatedTarget } = moveStop(source, target, "a");
		expect(updatedSource.assignedCount).toBe(0);
		expect(updatedTarget.assignedCount).toBe(1);
	});

	it("throws for non-existent stop", () => {
		const source = makeRoute("r1", [makeStop("a", "s1", 1)]);
		const target = makeRoute("r2", []);
		expect(() => moveStop(source, target, "nonexistent")).toThrow();
	});
});

describe("reorderStop", () => {
	it("moves a stop to a new position", () => {
		const route = makeRoute("r1", [
			makeStop("a", "s1", 1),
			makeStop("b", "s2", 2),
			makeStop("c", "s3", 3),
		]);

		const result = reorderStop(route, "c", 0);
		expect(result.stops[0].id).toBe("c");
		expect(result.stops[0].orderIndex).toBe(1);
	});
});

describe("removeStop", () => {
	it("removes a stop and reindexes", () => {
		const route = makeRoute("r1", [
			makeStop("a", "s1", 1),
			makeStop("b", "s2", 2),
		]);

		const result = removeStop(route, "a");
		expect(result.stops).toHaveLength(1);
		expect(result.stops[0].orderIndex).toBe(1);
		expect(result.assignedCount).toBe(1);
	});
});

describe("addStop", () => {
	it("adds a stop and reindexes", () => {
		const route = makeRoute("r1", [makeStop("a", "s1", 1)]);
		const newStop = makeStop("b", "s2", 99);

		const result = addStop(route, newStop);
		expect(result.stops).toHaveLength(2);
		expect(result.assignedCount).toBe(2);
	});
});

describe("validateNoCapacityOverflow", () => {
	it("returns true when within capacity", () => {
		const route = makeRoute("r1", [makeStop("a", "s1", 1)], 6);
		expect(validateNoCapacityOverflow(route)).toBe(true);
	});

	it("returns false when over capacity", () => {
		const route = makeRoute("r1", [makeStop("a", "s1", 1)], 6);
		route.assignedCount = 7;
		expect(validateNoCapacityOverflow(route)).toBe(false);
	});
});

describe("validateNoDuplicateStudents", () => {
	it("returns empty for no duplicates", () => {
		const routes = [
			makeRoute("r1", [makeStop("a", "s1", 1)]),
			makeRoute("r2", [makeStop("b", "s2", 1)]),
		];
		expect(validateNoDuplicateStudents(routes)).toEqual([]);
	});

	it("returns duplicate student IDs", () => {
		const routes = [
			makeRoute("r1", [makeStop("a", "s1", 1)]),
			makeRoute("r2", [makeStop("b", "s1", 1)]),
		];
		expect(validateNoDuplicateStudents(routes)).toEqual(["s1"]);
	});
});
