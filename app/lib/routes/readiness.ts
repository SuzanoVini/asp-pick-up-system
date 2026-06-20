import type { ReadinessCheck, ReadinessResult, VehicleRoute } from "./types";

interface ReadinessInput {
	routes: VehicleRoute[];
	allRoutableStudentIds: string[];
	date: string;
}

function checkStaleRoute(routes: VehicleRoute[]): ReadinessCheck {
	const staleRoutes = routes.filter((r) => r.status === "stale");
	return {
		name: "stale_route",
		severity: "blocker",
		passed: staleRoutes.length === 0,
		message:
			staleRoutes.length === 0
				? "No stale routes"
				: `${staleRoutes.length} route(s) invalidated by attendance changes`,
	};
}

function checkUnroutedStudents(
	routes: VehicleRoute[],
	allRoutableStudentIds: string[],
): ReadinessCheck {
	const routedIds = new Set(routes.flatMap((r) => r.stops.map((s) => s.studentId)));
	const unrouted = allRoutableStudentIds.filter((id) => !routedIds.has(id));
	return {
		name: "unrouted_students",
		severity: "warning",
		passed: unrouted.length === 0,
		message:
			unrouted.length === 0
				? "All students assigned"
				: `${unrouted.length} student(s) not assigned to any vehicle`,
	};
}

function checkMissingDriver(routes: VehicleRoute[]): ReadinessCheck {
	const missing = routes.filter((r) => r.stops.length > 0 && !r.driverName);
	return {
		name: "missing_driver",
		severity: "blocker",
		passed: missing.length === 0,
		message:
			missing.length === 0
				? "All vehicles have drivers"
				: `${missing.length} vehicle(s) have stops but no driver assigned`,
	};
}

function checkMissingHelper(routes: VehicleRoute[]): ReadinessCheck {
	const missing = routes.filter((r) => r.stops.length > 0 && !r.helperName);
	return {
		name: "missing_helper",
		severity: "warning",
		passed: missing.length === 0,
		message:
			missing.length === 0
				? "All vehicles have helpers"
				: `${missing.length} vehicle(s) have stops but no helper assigned`,
	};
}

function checkOverCapacity(routes: VehicleRoute[]): ReadinessCheck {
	const over = routes.filter((r) => r.assignedCount > r.kidsSeats);
	return {
		name: "over_capacity",
		severity: "blocker",
		passed: over.length === 0,
		message:
			over.length === 0
				? "All vehicles within capacity"
				: over
						.map(
							(r) =>
								`${r.vehicleName}: ${r.assignedCount} students but only ${r.kidsSeats} seats`,
						)
						.join("; "),
	};
}

function checkBoosterShortage(routes: VehicleRoute[]): ReadinessCheck {
	const short = routes.filter((r) => r.boosterRequiredCount > r.boosterSeats);
	return {
		name: "booster_shortage",
		severity: "warning",
		passed: short.length === 0,
		message:
			short.length === 0
				? "Booster capacity sufficient"
				: short
						.map(
							(r) =>
								`${r.vehicleName}: ${r.boosterRequiredCount} boosters needed but ${r.boosterSeats} available`,
						)
						.join("; "),
	};
}

function checkMissingAddress(routes: VehicleRoute[]): ReadinessCheck {
	const missing = routes.flatMap((r) =>
		r.stops.filter((s) => !s.schoolAddressSnapshot),
	);
	return {
		name: "missing_address",
		severity: "warning",
		passed: missing.length === 0,
		message:
			missing.length === 0
				? "All stops have school addresses"
				: `${missing.length} stop(s) missing school address`,
	};
}

function checkDuplicateStudent(routes: VehicleRoute[]): ReadinessCheck {
	const allStudentIds = routes.flatMap((r) => r.stops.map((s) => s.studentId));
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const id of allStudentIds) {
		if (seen.has(id)) {
			duplicates.add(id);
		}
		seen.add(id);
	}

	return {
		name: "duplicate_student",
		severity: "blocker",
		passed: duplicates.size === 0,
		message:
			duplicates.size === 0
				? "No duplicate students"
				: `${duplicates.size} student(s) assigned to multiple vehicles`,
	};
}

export function validateReadiness(input: ReadinessInput): ReadinessResult {
	const checks: ReadinessCheck[] = [
		checkStaleRoute(input.routes),
		checkUnroutedStudents(input.routes, input.allRoutableStudentIds),
		checkMissingDriver(input.routes),
		checkMissingHelper(input.routes),
		checkOverCapacity(input.routes),
		checkBoosterShortage(input.routes),
		checkMissingAddress(input.routes),
		checkDuplicateStudent(input.routes),
	];

	const blockerCount = checks.filter((c) => !c.passed && c.severity === "blocker").length;
	const warningCount = checks.filter((c) => !c.passed && c.severity === "warning").length;

	return {
		checks,
		canExport: blockerCount === 0,
		blockerCount,
		warningCount,
	};
}
