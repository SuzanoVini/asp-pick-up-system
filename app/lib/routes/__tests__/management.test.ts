import {
	assignStudentSchema,
	finalizeRoutePlanSchema,
	isoDateSchema,
	reopenRoutePlanSchema,
	reorderRouteStopsSchema,
	setRouteStaffSchema,
	setRouteVehicleSchema,
} from "../../schemas/route-management-schemas";
import {
	buildReadinessInput,
	buildRouteManagementView,
	dateToWeekday,
	isRoutablePlanStudent,
	nextAvailableSeat,
	toVehicleRoute,
} from "../management";
import type { ManagedRouteRow, ManagedStopRow, RoutePlanStudentRow } from "../management-types";

const student = (overrides: Partial<RoutePlanStudentRow> = {}): RoutePlanStudentRow => ({
	id: "10000000-0000-4000-8000-000000000001",
	plan_id: "20000000-0000-4000-8000-000000000001",
	student_id: "30000000-0000-4000-8000-000000000001",
	school_id: "40000000-0000-4000-8000-000000000001",
	attendance_status: "P",
	drop_off_only: false,
	needs_booster: false,
	student_name_snapshot: "Student One",
	school_name_snapshot: "School One",
	created_at: "2026-10-01T00:00:00Z",
	updated_at: "2026-10-01T00:00:00Z",
	created_by: null,
	updated_by: null,
	...overrides,
});

const route: ManagedRouteRow = {
	id: "50000000-0000-4000-8000-000000000001",
	plan_id: "20000000-0000-4000-8000-000000000001",
	date: "2026-10-05",
	vehicle_id: "60000000-0000-4000-8000-000000000001",
	run_number: 1,
	status: "draft",
	total_distance_km: 4.5,
	vehicle_name_snapshot: "Van One",
	plate_number_snapshot: "ABC123",
	driver_name_snapshot: null,
	helper_name_snapshot: null,
	exported_at: null,
	exported_by: null,
	created_at: "2026-10-01T00:00:00Z",
	updated_at: "2026-10-01T00:00:00Z",
	created_by: null,
	updated_by: null,
};

const stop = (overrides: Partial<ManagedStopRow> = {}): ManagedStopRow => ({
	id: "70000000-0000-4000-8000-000000000001",
	route_id: route.id,
	student_id: "30000000-0000-4000-8000-000000000001",
	school_id: "40000000-0000-4000-8000-000000000001",
	seat_number: 1,
	order_index: 1,
	distance_from_prev_km: null,
	duration_from_prev_min: null,
	needs_booster: false,
	student_name_snapshot: "Student One",
	school_name_snapshot: "School One",
	school_address_snapshot: "1 School Way",
	dismissal_time_snapshot: "15:00:00",
	responsible_staff_id: null,
	responsible_staff_name_snapshot: null,
	created_at: "2026-10-01T00:00:00Z",
	updated_at: "2026-10-01T00:00:00Z",
	created_by: null,
	updated_by: null,
	...overrides,
});

describe("route management helpers", () => {
	it("derives weekdays in UTC and rejects weekends or invalid dates", () => {
		expect(dateToWeekday("2026-10-05")).toBe("Mon");
		expect(dateToWeekday("0001-01-01")).toBe("Mon");
		expect(dateToWeekday("0000-01-03")).toBeNull();
		expect(dateToWeekday("2026-10-11")).toBeNull();
		expect(dateToWeekday("2026-02-31")).toBeNull();
		expect(dateToWeekday("not-a-date")).toBeNull();
	});

	it("only treats present pickup students with a school as routable", () => {
		for (const attendance_status of ["P", "E", "ED"] as const) {
			expect(isRoutablePlanStudent(student({ attendance_status }))).toBe(true);
		}
		expect(isRoutablePlanStudent(student({ attendance_status: "A" }))).toBe(false);
		expect(isRoutablePlanStudent(student({ drop_off_only: true }))).toBe(false);
		expect(isRoutablePlanStudent(student({ school_id: null }))).toBe(false);
	});

	it("returns the smallest positive unused seat", () => {
		expect(nextAvailableSeat([3, 1, -2, 2])).toBe(4);
		expect(nextAvailableSeat([2, 4])).toBe(1);
	});

	it("maps rows to a sorted VehicleRoute without mutating stops", () => {
		const stops = [
			stop({ id: "70000000-0000-4000-8000-000000000002", order_index: 2, needs_booster: true }),
			stop({
				order_index: 1,
				responsible_staff_id: "80000000-0000-4000-8000-000000000001",
				responsible_staff_name_snapshot: "Alex",
			}),
		];
		const result = toVehicleRoute(
			route,
			stops,
			{ kids_seats: 8, booster_seats: 2 },
			{ driver_name: "Driver", helper_name: "Helper" },
		);

		expect(result.stops.map(({ orderIndex }) => orderIndex)).toEqual([1, 2]);
		expect(stops.map(({ order_index }) => order_index)).toEqual([2, 1]);
		expect(result).toMatchObject({
			vehicleId: route.vehicle_id,
			vehicleName: "Van One",
			driverName: "Driver",
			helperName: "Helper",
			kidsSeats: 8,
			boosterSeats: 2,
			assignedCount: 2,
			boosterRequiredCount: 1,
		});
		expect(result.stops[0]).toMatchObject({
			responsibleStaffId: "80000000-0000-4000-8000-000000000001",
			responsibleStaffNameSnapshot: "Alex",
		});
	});

	it("ignores stale vehicle snapshots and capacity for an unassigned route", () => {
		const result = toVehicleRoute(
			{ ...route, vehicle_id: null, vehicle_name_snapshot: "Stale Van" },
			[],
			{ kids_seats: 8, booster_seats: 2 },
			{ driver_name: null, helper_name: null },
		);
		expect(result).toMatchObject({
			vehicleId: "",
			vehicleName: "Unassigned vehicle",
			kidsSeats: 0,
			boosterSeats: 0,
		});
	});

	it("builds readiness input from only routable plan students", () => {
		const routes = [toVehicleRoute(route, [], null, { driver_name: null, helper_name: null })];
		const input = buildReadinessInput("2026-10-05", routes, [
			student(),
			student({ student_id: "30000000-0000-4000-8000-000000000002", drop_off_only: true }),
		]);
		expect(input).toEqual({
			date: "2026-10-05",
			routes,
			allRoutableStudentIds: [student().student_id],
		});
		expect(input.routes).toBe(routes);
	});
});

describe("route management view model", () => {
	it("builds vehicle routes, unrouted students, and readiness from persisted plan rows", () => {
		const view = buildRouteManagementView({
			date: "2026-07-06",
			plan: { id: "plan-1", status: "draft" },
			routes: [{ ...route, vehicle_id: "vehicle-1" }],
			stops: [stop({ student_id: "student-assigned", route_id: route.id })],
			students: [
				{
					...student(),
					student_id: "student-assigned",
					attendance_status: "P",
					drop_off_only: false,
					school_id: "school-1",
				},
				{
					...student(),
					student_id: "student-unrouted",
					student_name_snapshot: "Unrouted Student",
					attendance_status: "P",
					drop_off_only: false,
					needs_booster: true,
					school_id: "school-1",
					school_name_snapshot: "School One",
				},
				{
					...student(),
					student_id: "student-absent",
					attendance_status: "A",
					drop_off_only: false,
				},
			],
			vehicles: [{ id: "vehicle-1", kids_seats: 2, booster_seats: 1 }],
			assignments: [
				{
					vehicle_id: "vehicle-1",
					role: "driver",
					asp_staff: { name: "Assigned Driver" },
				},
			],
		});

		expect(view.routes).toHaveLength(1);
		expect(view.routes[0]).toMatchObject({
			driverName: "Assigned Driver",
			kidsSeats: 2,
			boosterSeats: 1,
			assignedCount: 1,
		});
		expect(view.unroutedStudents).toEqual([
			{
				id: "student-unrouted",
				name: "Unrouted Student",
				schoolId: "school-1",
				schoolName: "School One",
				needsBooster: true,
			},
		]);
		expect(view.readiness.warningCount).toBeGreaterThan(0);
	});
});

describe("route management schemas", () => {
	const uuid = "10000000-0000-4000-8000-000000000001";

	it("requires a real calendar date", () => {
		expect(isoDateSchema.safeParse("0000-01-01").success).toBe(false);
		expect(isoDateSchema.safeParse("0001-01-01").success).toBe(true);
		expect(isoDateSchema.safeParse("2026-02-28").success).toBe(true);
		expect(isoDateSchema.safeParse("2026-02-31").success).toBe(false);
		expect(isoDateSchema.safeParse("2026-2-3").success).toBe(false);
	});

	it("allows nullable vehicle and staff selections", () => {
		expect(setRouteVehicleSchema.safeParse({ routeId: uuid, vehicleId: null }).success).toBe(true);
		expect(
			setRouteStaffSchema.safeParse({ routeId: uuid, role: "driver", staffId: null }).success,
		).toBe(true);
		expect(
			assignStudentSchema.safeParse({ routeId: uuid, studentId: uuid, responsibleStaffId: null })
				.success,
		).toBe(true);
	});

	it("requires unique ordered stop IDs", () => {
		expect(reorderRouteStopsSchema.safeParse({ routeId: uuid, orderedStopIds: [] }).success).toBe(
			false,
		);
		expect(
			reorderRouteStopsSchema.safeParse({ routeId: uuid, orderedStopIds: [uuid, uuid] }).success,
		).toBe(false);
	});

	it("requires a reason and named checks when finalization overrides blockers", () => {
		expect(
			finalizeRoutePlanSchema.safeParse({ planId: uuid, acknowledgedWarnings: [], override: null })
				.success,
		).toBe(true);
		expect(
			finalizeRoutePlanSchema.safeParse({
				planId: uuid,
				acknowledgedWarnings: [],
				override: { checkNames: ["missing_driver"], reason: "  " },
			}).success,
		).toBe(false);
	});

	it("rejects unknown or duplicate readiness check names", () => {
		const base = { planId: uuid, override: null };
		expect(
			finalizeRoutePlanSchema.safeParse({ ...base, acknowledgedWarnings: ["not_a_check"] }).success,
		).toBe(false);
		expect(
			finalizeRoutePlanSchema.safeParse({
				...base,
				acknowledgedWarnings: ["stale_route", "stale_route"],
			}).success,
		).toBe(false);
		expect(
			finalizeRoutePlanSchema.safeParse({
				planId: uuid,
				acknowledgedWarnings: [],
				override: { checkNames: ["not_a_check"], reason: "Required" },
			}).success,
		).toBe(false);
	});

	it("caps readiness check lists at the eight known names", () => {
		const result = finalizeRoutePlanSchema.safeParse({
			planId: uuid,
			acknowledgedWarnings: Array(9).fill("stale_route"),
			override: null,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((issue) => issue.code === "too_big")).toBe(true);
		}
	});

	it("caps finalize override and reopen reasons at 2,000 characters", () => {
		const longReason = "x".repeat(2001);
		expect(
			finalizeRoutePlanSchema.safeParse({
				planId: uuid,
				acknowledgedWarnings: [],
				override: { checkNames: ["stale_route"], reason: longReason },
			}).success,
		).toBe(false);
		expect(reopenRoutePlanSchema.safeParse({ planId: uuid, reason: longReason }).success).toBe(
			false,
		);
	});
});
