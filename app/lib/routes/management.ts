import type { DayOfWeek } from "../engine/types";
import type { ManagedRouteRow, ManagedStopRow, RoutePlanStudentRow } from "./management-types";
import type { RouteStop, VehicleRoute } from "./types";

const weekdays: Array<DayOfWeek | null> = [null, "Mon", "Tue", "Wed", "Thu", "Fri", null];

export function dateToWeekday(date: string): DayOfWeek | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (year < 1) return null;
	const parsed = new Date(Date.UTC(year, month - 1, day));
	parsed.setUTCFullYear(year);
	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() !== month - 1 ||
		parsed.getUTCDate() !== day
	)
		return null;

	return weekdays[parsed.getUTCDay()];
}

export function isRoutablePlanStudent(student: RoutePlanStudentRow): boolean {
	return (
		(student.attendance_status === "P" ||
			student.attendance_status === "E" ||
			student.attendance_status === "ED") &&
		student.drop_off_only === false &&
		student.school_id !== null
	);
}

export function nextAvailableSeat(occupiedSeatNumbers: readonly number[]): number {
	const occupied = new Set(occupiedSeatNumbers.filter((seat) => seat > 0));
	let seat = 1;
	while (occupied.has(seat)) seat += 1;
	return seat;
}

export function toVehicleRoute(
	route: ManagedRouteRow,
	stops: readonly ManagedStopRow[],
	capacity: { kids_seats: number; booster_seats: number } | null,
	staffSnapshots: { driver_name: string | null; helper_name: string | null },
): VehicleRoute {
	const isUnassigned = route.vehicle_id === null;
	const mappedStops: RouteStop[] = [...stops]
		.sort((a, b) => a.order_index - b.order_index)
		.map((stop) => ({
			id: stop.id,
			routeId: stop.route_id,
			studentId: stop.student_id,
			schoolId: stop.school_id,
			seatNumber: stop.seat_number,
			orderIndex: stop.order_index,
			distanceFromPrevKm: stop.distance_from_prev_km,
			durationFromPrevMin: stop.duration_from_prev_min,
			needsBooster: stop.needs_booster,
			studentNameSnapshot: stop.student_name_snapshot,
			schoolNameSnapshot: stop.school_name_snapshot,
			schoolAddressSnapshot: stop.school_address_snapshot,
			dismissalTimeSnapshot: stop.dismissal_time_snapshot,
			responsibleStaffId: stop.responsible_staff_id,
			responsibleStaffNameSnapshot: stop.responsible_staff_name_snapshot,
		}));

	return {
		id: route.id,
		date: route.date,
		vehicleId: route.vehicle_id ?? "",
		vehicleName: isUnassigned
			? "Unassigned vehicle"
			: (route.vehicle_name_snapshot ?? "Unassigned vehicle"),
		status: route.status,
		totalDistanceKm: route.total_distance_km,
		driverName: staffSnapshots.driver_name,
		helperName: staffSnapshots.helper_name,
		stops: mappedStops,
		kidsSeats: isUnassigned ? 0 : (capacity?.kids_seats ?? 0),
		boosterSeats: isUnassigned ? 0 : (capacity?.booster_seats ?? 0),
		assignedCount: mappedStops.length,
		boosterRequiredCount: mappedStops.filter((stop) => stop.needsBooster).length,
	};
}

export function buildReadinessInput(
	date: string,
	routes: VehicleRoute[],
	students: readonly RoutePlanStudentRow[],
) {
	return {
		date,
		routes,
		allRoutableStudentIds: students
			.filter(isRoutablePlanStudent)
			.map((student) => student.student_id),
	};
}
