import type { RouteStop, VehicleRoute } from "./types";

export function reindexStops(stops: RouteStop[]): RouteStop[] {
	return stops.map((s, i) => ({
		...s,
		orderIndex: i + 1,
		seatNumber: i + 1,
	}));
}

export function moveStop(
	sourceRoute: VehicleRoute,
	targetRoute: VehicleRoute,
	stopId: string,
): { updatedSource: VehicleRoute; updatedTarget: VehicleRoute } {
	const stopIdx = sourceRoute.stops.findIndex((s) => s.id === stopId);
	if (stopIdx === -1) throw new Error("Stop not found in source route");

	const stop = sourceRoute.stops[stopIdx];
	const newSourceStops = reindexStops(
		sourceRoute.stops.filter((_, i) => i !== stopIdx),
	);
	const newTargetStops = reindexStops([...targetRoute.stops, stop]);

	return {
		updatedSource: {
			...sourceRoute,
			stops: newSourceStops,
			assignedCount: newSourceStops.length,
			boosterRequiredCount: newSourceStops.filter((s) => s.needsBooster).length,
		},
		updatedTarget: {
			...targetRoute,
			stops: newTargetStops,
			assignedCount: newTargetStops.length,
			boosterRequiredCount: newTargetStops.filter((s) => s.needsBooster).length,
		},
	};
}

export function reorderStop(
	route: VehicleRoute,
	stopId: string,
	newIndex: number,
): VehicleRoute {
	const stops = [...route.stops];
	const oldIdx = stops.findIndex((s) => s.id === stopId);
	if (oldIdx === -1) throw new Error("Stop not found");

	const [stop] = stops.splice(oldIdx, 1);
	const clampedIdx = Math.max(0, Math.min(newIndex, stops.length));
	stops.splice(clampedIdx, 0, stop);

	return {
		...route,
		stops: reindexStops(stops),
	};
}

export function removeStop(
	route: VehicleRoute,
	stopId: string,
): VehicleRoute {
	const newStops = reindexStops(route.stops.filter((s) => s.id !== stopId));

	return {
		...route,
		stops: newStops,
		assignedCount: newStops.length,
		boosterRequiredCount: newStops.filter((s) => s.needsBooster).length,
	};
}

export function addStop(
	route: VehicleRoute,
	stop: RouteStop,
): VehicleRoute {
	const newStops = reindexStops([...route.stops, stop]);

	return {
		...route,
		stops: newStops,
		assignedCount: newStops.length,
		boosterRequiredCount: newStops.filter((s) => s.needsBooster).length,
	};
}

export function validateNoCapacityOverflow(
	route: VehicleRoute,
): boolean {
	return route.assignedCount <= route.kidsSeats;
}

export function validateNoDuplicateStudents(
	routes: VehicleRoute[],
): string[] {
	const seen = new Map<string, string>();
	const duplicates: string[] = [];

	for (const route of routes) {
		for (const stop of route.stops) {
			if (seen.has(stop.studentId)) {
				duplicates.push(stop.studentId);
			}
			seen.set(stop.studentId, route.id);
		}
	}

	return duplicates;
}
