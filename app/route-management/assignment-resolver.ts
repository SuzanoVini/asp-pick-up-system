export type AssignmentSource =
	| { kind: "unrouted"; studentId: string }
	| { kind: "routed"; stopId: string; routeId: string };

export interface AssignmentTarget {
	routeId: string;
	seatNumber: number;
	occupiedByStopId: string | null;
}

export type AssignmentResolution =
	| { action: "assign"; routeId: string; studentId: string; seatNumber: number }
	| { action: "reposition"; stopId: string; seatNumber: number }
	| { action: "move"; stopId: string; targetRouteId: string; seatNumber: number }
	| { action: "noop" };

/**
 * Decides which server action a seat assignment maps to. Shared by every input
 * mode — drag, click-to-assign, and type-ahead — so identical source/target
 * pairs always resolve the same way.
 */
export function resolveStudentAssignment(params: {
	source: AssignmentSource;
	target: AssignmentTarget;
}): AssignmentResolution {
	const { source, target } = params;

	if (source.kind === "unrouted") {
		return {
			action: "assign",
			routeId: target.routeId,
			studentId: source.studentId,
			seatNumber: target.seatNumber,
		};
	}

	// Checked before the same-lane branch so a stop dropped on its own seat
	// never issues a pointless RPC.
	if (target.occupiedByStopId === source.stopId) {
		return { action: "noop" };
	}

	if (source.routeId === target.routeId) {
		return { action: "reposition", stopId: source.stopId, seatNumber: target.seatNumber };
	}

	return {
		action: "move",
		stopId: source.stopId,
		targetRouteId: target.routeId,
		seatNumber: target.seatNumber,
	};
}
