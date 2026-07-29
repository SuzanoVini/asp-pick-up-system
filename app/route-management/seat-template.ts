export interface SeatTemplateStop {
	id: string;
	seat_number: number;
	student_name_snapshot: string;
	school_name_snapshot: string;
	needs_booster: boolean;
	order_index: number;
	responsible_staff_id: string | null;
	responsible_staff_name_snapshot: string | null;
	dismissal_time_snapshot: string | null;
	school_address_snapshot: string | null;
}

export interface SeatTemplateVehicle {
	id: string;
	kids_seats: number;
	booster_seats: number;
	license_plate: string | null;
	name: string;
}

export type SeatRow =
	| {
			kind: "student";
			seatNumber: number;
			stopId: string | null;
			occupantName: string | null;
			schoolName: string | null;
			needsBooster: boolean;
			orderIndex: number | null;
			responsibleStaffId: string | null;
			responsibleStaffName: string | null;
			dismissalTime: string | null;
			schoolAddress: string | null;
	  }
	| {
			kind: "helper" | "driver";
			seatNumber: null;
			occupantStaffName: string | null;
	  };

/**
 * Builds a lane's fixed row layout: one row per kid seat on the vehicle, then
 * the helper and driver rows. Seats are stable slots, so an unoccupied seat
 * renders as an empty row rather than being skipped.
 */
export function buildSeatTemplate(params: {
	vehicle: SeatTemplateVehicle;
	stops: SeatTemplateStop[];
	driverStaffName: string | null;
	helperStaffName: string | null;
}): SeatRow[] {
	const { vehicle, stops, driverStaffName, helperStaffName } = params;
	const stopsBySeat = new Map(stops.map((stop) => [stop.seat_number, stop]));

	const studentRows: SeatRow[] = Array.from({ length: vehicle.kids_seats }, (_, index) => {
		const seatNumber = index + 1;
		const stop = stopsBySeat.get(seatNumber);
		return {
			kind: "student",
			seatNumber,
			stopId: stop?.id ?? null,
			occupantName: stop?.student_name_snapshot ?? null,
			schoolName: stop?.school_name_snapshot ?? null,
			needsBooster: stop?.needs_booster ?? false,
			orderIndex: stop?.order_index ?? null,
			responsibleStaffId: stop?.responsible_staff_id ?? null,
			responsibleStaffName: stop?.responsible_staff_name_snapshot ?? null,
			dismissalTime: stop?.dismissal_time_snapshot ?? null,
			schoolAddress: stop?.school_address_snapshot ?? null,
		};
	});

	return [
		...studentRows,
		{ kind: "helper", seatNumber: null, occupantStaffName: helperStaffName },
		{ kind: "driver", seatNumber: null, occupantStaffName: driverStaffName },
	];
}
