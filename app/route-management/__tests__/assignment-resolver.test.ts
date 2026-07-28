import { resolveStudentAssignment } from "../assignment-resolver";

describe("resolveStudentAssignment", () => {
	it("assigns an unrouted student to an empty seat", () => {
		const result = resolveStudentAssignment({
			source: { kind: "unrouted", studentId: "student-1" },
			target: { routeId: "route-1", seatNumber: 2, occupiedByStopId: null },
		});

		expect(result).toEqual({
			action: "assign",
			routeId: "route-1",
			studentId: "student-1",
			seatNumber: 2,
		});
	});

	it("assigns an unrouted student onto an occupied seat, bumping the occupant", () => {
		const result = resolveStudentAssignment({
			source: { kind: "unrouted", studentId: "student-1" },
			target: { routeId: "route-1", seatNumber: 2, occupiedByStopId: "stop-9" },
		});

		expect(result).toEqual({
			action: "assign",
			routeId: "route-1",
			studentId: "student-1",
			seatNumber: 2,
		});
	});

	it("repositions a routed student within the same lane", () => {
		const result = resolveStudentAssignment({
			source: { kind: "routed", stopId: "stop-1", routeId: "route-1" },
			target: { routeId: "route-1", seatNumber: 3, occupiedByStopId: "stop-5" },
		});

		expect(result).toEqual({ action: "reposition", stopId: "stop-1", seatNumber: 3 });
	});

	it("moves a routed student to a different lane", () => {
		const result = resolveStudentAssignment({
			source: { kind: "routed", stopId: "stop-1", routeId: "route-1" },
			target: { routeId: "route-2", seatNumber: 3, occupiedByStopId: null },
		});

		expect(result).toEqual({
			action: "move",
			stopId: "stop-1",
			targetRouteId: "route-2",
			seatNumber: 3,
		});
	});

	it("is a no-op when a stop is dropped onto its own current seat", () => {
		const result = resolveStudentAssignment({
			source: { kind: "routed", stopId: "stop-1", routeId: "route-1" },
			target: { routeId: "route-1", seatNumber: 3, occupiedByStopId: "stop-1" },
		});

		expect(result).toEqual({ action: "noop" });
	});

	it("treats dropping onto one's own seat in the same lane as a no-op even across a re-render", () => {
		// Guards the ordering of the noop check: it must run before the
		// same-lane reposition branch, or a self-drop would call the RPC.
		const result = resolveStudentAssignment({
			source: { kind: "routed", stopId: "stop-7", routeId: "route-9" },
			target: { routeId: "route-9", seatNumber: 4, occupiedByStopId: "stop-7" },
		});

		expect(result.action).toBe("noop");
	});
});
