import { buildSeatTemplate, type SeatTemplateStop } from "../seat-template";

const vehicle = {
	id: "vehicle-1",
	kids_seats: 3,
	booster_seats: 1,
	license_plate: "ABC-123",
	name: "Van One",
};

function stop(overrides: Partial<SeatTemplateStop> = {}): SeatTemplateStop {
	return {
		id: "stop-1",
		seat_number: 2,
		student_name_snapshot: "Nori",
		school_name_snapshot: "QE",
		needs_booster: true,
		order_index: 1,
		responsible_staff_id: null,
		responsible_staff_name_snapshot: null,
		dismissal_time_snapshot: null,
		school_address_snapshot: null,
		...overrides,
	};
}

describe("buildSeatTemplate", () => {
	it("builds one row per kid seat plus fixed helper and driver rows", () => {
		const rows = buildSeatTemplate({
			vehicle,
			stops: [],
			driverStaffId: null,
			helperStaffId: null,
		});

		expect(rows.map((row) => row.kind)).toEqual([
			"student",
			"student",
			"student",
			"helper",
			"driver",
		]);
		expect(rows.map((row) => row.seatNumber)).toEqual([1, 2, 3, null, null]);
	});

	it("fills a student row from a matching stop by seat_number", () => {
		const rows = buildSeatTemplate({
			vehicle,
			stops: [stop()],
			driverStaffId: null,
			helperStaffId: null,
		});

		expect(rows[1]).toMatchObject({
			kind: "student",
			seatNumber: 2,
			stopId: "stop-1",
			occupantName: "Nori",
			needsBooster: true,
		});
		// Seats without a stop stay empty rather than collapsing upward.
		expect(rows[0]).toMatchObject({ kind: "student", seatNumber: 1, stopId: null });
		expect(rows[2]).toMatchObject({ kind: "student", seatNumber: 3, stopId: null });
	});

	it("keeps a gap when a seat between two occupied seats is empty", () => {
		const rows = buildSeatTemplate({
			vehicle,
			stops: [stop({ id: "stop-a", seat_number: 1 }), stop({ id: "stop-c", seat_number: 3 })],
			driverStaffId: null,
			helperStaffId: null,
		});

		expect(rows.slice(0, 3).map((row) => (row.kind === "student" ? row.stopId : null))).toEqual([
			"stop-a",
			null,
			"stop-c",
		]);
	});

	it("ignores a stop whose seat exceeds the vehicle's kid seats", () => {
		const rows = buildSeatTemplate({
			vehicle,
			stops: [stop({ id: "stop-overflow", seat_number: 9 })],
			driverStaffId: null,
			helperStaffId: null,
		});

		expect(rows.filter((row) => row.kind === "student")).toHaveLength(3);
		expect(rows.some((row) => row.kind === "student" && row.stopId === "stop-overflow")).toBe(
			false,
		);
	});

	it("fills helper and driver rows from staff assignment ids", () => {
		const rows = buildSeatTemplate({
			vehicle,
			stops: [],
			driverStaffId: "staff-1",
			helperStaffId: null,
		});

		expect(rows.find((row) => row.kind === "driver")).toMatchObject({ occupantStaffId: "staff-1" });
		expect(rows.find((row) => row.kind === "helper")).toMatchObject({ occupantStaffId: null });
	});
});
