import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { saveManualOverrideAction } from "../attendance";
import {
	addRouteTable,
	assignSchoolGroup,
	assignStudent,
	createOrRefreshRoutePlan,
	moveStudentStop,
	removeRouteTable,
	removeStudentStop,
	reorderRouteStops,
	setRouteStaff,
	setRouteVehicle,
	updateStopResponsibleStaff,
} from "../route-management";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("../../lib/routes/materialize-attendance", () => ({
	materializeAttendanceForDate: jest.fn(),
}));
jest.mock("../../lib/routes/refresh-distances", () => ({
	refreshRouteDistances: jest.fn(),
}));
jest.mock("../../lib/security/authorization", () => ({
	getAuthorizedUser: jest.fn(),
	requireOwner: jest.fn(),
}));
jest.mock("../../lib/supabase/route-plans", () => ({
	getPlanById: jest.fn(),
	getPlanForDate: jest.fn(),
	replacePlanSnapshot: jest.fn(),
}));
jest.mock("../../lib/supabase/route-plan-students", () => ({ getPlanStudents: jest.fn() }));
jest.mock("../../lib/supabase/route-stops", () => ({
	assignRouteSchoolGroup: jest.fn(),
	assignRouteStudent: jest.fn(),
	getStopById: jest.fn(),
	getStopsForPlan: jest.fn(),
	getStopsForRoute: jest.fn(),
	moveRouteStop: jest.fn(),
	removeRouteStop: jest.fn(),
	reorderRouteStops: jest.fn(),
	setRouteStopResponsibleStaff: jest.fn(),
}));
jest.mock("../../lib/supabase/routes", () => ({
	createRouteLane: jest.fn(),
	deleteRouteLane: jest.fn(),
	getRoutesForPlan: jest.fn(),
	getRouteWithPlan: jest.fn(),
	setRouteVehicle: jest.fn(),
}));
jest.mock("../../lib/supabase/staff", () => ({ getStaffById: jest.fn() }));
jest.mock("../../lib/supabase/staff-schedule", () => ({
	getAvailabilityForDate: jest.fn(),
	removeAssignmentForVehicleDateRole: jest.fn(),
	upsertAssignmentForVehicleDate: jest.fn(),
}));
jest.mock("../../lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("../../lib/supabase/settings", () => ({ getSystemSettings: jest.fn() }));
jest.mock("../../lib/supabase/vehicles", () => ({ getVehicleById: jest.fn() }));

const { materializeAttendanceForDate } = jest.requireMock(
	"../../lib/routes/materialize-attendance",
) as { materializeAttendanceForDate: jest.Mock };
const { refreshRouteDistances } = jest.requireMock("../../lib/routes/refresh-distances") as {
	refreshRouteDistances: jest.Mock;
};
const { getAuthorizedUser, requireOwner } = jest.requireMock(
	"../../lib/security/authorization",
) as { getAuthorizedUser: jest.Mock; requireOwner: jest.Mock };
const { getPlanById, getPlanForDate, replacePlanSnapshot } = jest.requireMock(
	"../../lib/supabase/route-plans",
) as { getPlanById: jest.Mock; getPlanForDate: jest.Mock; replacePlanSnapshot: jest.Mock };
const { getPlanStudents } = jest.requireMock("../../lib/supabase/route-plan-students") as {
	getPlanStudents: jest.Mock;
};
const {
	assignRouteSchoolGroup,
	assignRouteStudent,
	getStopById,
	getStopsForPlan,
	getStopsForRoute,
	moveRouteStop,
	removeRouteStop,
	reorderRouteStops: reorderRouteStopsRpc,
	setRouteStopResponsibleStaff,
} = jest.requireMock("../../lib/supabase/route-stops") as Record<string, jest.Mock>;
const {
	createRouteLane,
	deleteRouteLane,
	getRoutesForPlan,
	getRouteWithPlan,
	setRouteVehicle: setRouteVehicleRpc,
} = jest.requireMock("../../lib/supabase/routes") as {
	createRouteLane: jest.Mock;
	deleteRouteLane: jest.Mock;
	getRoutesForPlan: jest.Mock;
	getRouteWithPlan: jest.Mock;
	setRouteVehicle: jest.Mock;
};
const { getStaffById } = jest.requireMock("../../lib/supabase/staff") as {
	getStaffById: jest.Mock;
};
const {
	getAvailabilityForDate,
	removeAssignmentForVehicleDateRole,
	upsertAssignmentForVehicleDate,
} = jest.requireMock("../../lib/supabase/staff-schedule") as Record<string, jest.Mock>;
const { createClient } = jest.requireMock("../../lib/supabase/server") as {
	createClient: jest.Mock;
};
const { getSystemSettings } = jest.requireMock("../../lib/supabase/settings") as {
	getSystemSettings: jest.Mock;
};
const { getVehicleById } = jest.requireMock("../../lib/supabase/vehicles") as {
	getVehicleById: jest.Mock;
};

type DbResponse = { data: unknown; error: Error | null };
type DbCall = { method: string; args: unknown[] };

function fakeSupabase(
	tables: Record<string, DbResponse> = {},
	rpcResponse: DbResponse = { data: null, error: null },
) {
	const calls: DbCall[] = [];
	const client = {
		from(table: string) {
			calls.push({ method: "from", args: [table] });
			const chain = new Proxy(
				{},
				{
					get: (_target, method: string) => {
						if (method === "then") {
							return (resolve: (response: DbResponse) => void) =>
								resolve(tables[table] ?? { data: [], error: null });
						}
						return (...args: unknown[]) => {
							calls.push({ method, args });
							return chain;
						};
					},
				},
			);
			return chain;
		},
		async rpc(name: string, args: unknown) {
			calls.push({ method: "rpc", args: [name, args] });
			return rpcResponse;
		},
	} as unknown as SupabaseClient;
	return { client, calls };
}

const attendanceRows = [
	{
		studentId: "11111111-1111-4111-8111-111111111111",
		status: "A" as const,
		effectiveDismissalTime: null,
		needsBooster: false,
		appliedRules: [],
		conflicts: [],
		isManualOverride: false,
	},
	{
		studentId: "22222222-2222-4222-8222-222222222222",
		status: "P" as const,
		effectiveDismissalTime: "15:00",
		needsBooster: true,
		appliedRules: ["rule-1"],
		conflicts: [],
		isManualOverride: false,
	},
];

describe("createOrRefreshRoutePlan", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(getAuthorizedUser).mockResolvedValue({ id: "owner-1", role: "owner" });
		jest.mocked(materializeAttendanceForDate).mockResolvedValue(attendanceRows);
	});

	it("keeps same-weekday dates isolated and never replaces plans that have route lanes", async () => {
		const { client } = fakeSupabase();
		jest.mocked(createClient).mockResolvedValue(client as never);
		jest
			.mocked(getPlanForDate)
			.mockResolvedValueOnce({ id: "plan-1", plan_date: "2026-07-06", status: "draft" })
			.mockResolvedValueOnce({ id: "plan-2", plan_date: "2026-07-13", status: "finalized" });
		jest.mocked(getRoutesForPlan).mockResolvedValue([{ id: "route-1" }] as never);

		await expect(createOrRefreshRoutePlan({ date: "2026-07-06" })).resolves.toMatchObject({
			id: "plan-1",
		});
		await expect(createOrRefreshRoutePlan({ date: "2026-07-13" })).resolves.toMatchObject({
			id: "plan-2",
		});

		expect(getPlanForDate).toHaveBeenNthCalledWith(1, client, "2026-07-06");
		expect(getPlanForDate).toHaveBeenNthCalledWith(2, client, "2026-07-13");
		expect(materializeAttendanceForDate).toHaveBeenNthCalledWith(1, client, "2026-07-06");
		expect(materializeAttendanceForDate).toHaveBeenNthCalledWith(2, client, "2026-07-13");
		expect(replacePlanSnapshot).not.toHaveBeenCalled();
	});

	it("atomically replaces an empty plan snapshot with every attendance status", async () => {
		const { client } = fakeSupabase({
			asp_students: {
				data: [
					{
						id: attendanceRows[0].studentId,
						name: "Absent Student",
						school_id: null,
						drop_off_only: false,
					},
					{
						id: attendanceRows[1].studentId,
						name: "Present Student",
						school_id: "school-1",
						drop_off_only: true,
					},
				],
				error: null,
			},
			asp_schools: { data: [{ id: "school-1", name: "School One" }], error: null },
		});
		jest.mocked(createClient).mockResolvedValue(client as never);
		jest.mocked(getPlanForDate).mockResolvedValue({
			id: "plan-1",
			plan_date: "2026-07-06",
			status: "draft",
		});
		jest.mocked(getRoutesForPlan).mockResolvedValue([]);
		jest.mocked(replacePlanSnapshot).mockResolvedValue({ id: "plan-1", status: "draft" });

		await createOrRefreshRoutePlan({ date: "2026-07-06" });

		expect(getAuthorizedUser).toHaveBeenCalledWith(client);
		expect(requireOwner).toHaveBeenCalledWith({ id: "owner-1", role: "owner" });
		expect(replacePlanSnapshot).toHaveBeenCalledWith(client, "2026-07-06", [
			{
				student_id: attendanceRows[0].studentId,
				school_id: null,
				attendance_status: "A",
				drop_off_only: false,
				needs_booster: false,
				student_name_snapshot: "Absent Student",
				school_name_snapshot: "Unassigned school",
			},
			{
				student_id: attendanceRows[1].studentId,
				school_id: "school-1",
				attendance_status: "P",
				drop_off_only: true,
				needs_booster: true,
				student_name_snapshot: "Present Student",
				school_name_snapshot: "School One",
			},
		]);
		expect(revalidatePath).toHaveBeenCalledWith("/route-management");
		expect(revalidatePath).toHaveBeenCalledWith("/route-management?date=2026-07-06");
	});

	it("does not structurally replace a finalized plan without route lanes", async () => {
		const { client } = fakeSupabase();
		const finalized = { id: "plan-1", plan_date: "2026-07-06", status: "finalized" };
		jest.mocked(createClient).mockResolvedValue(client as never);
		jest.mocked(getPlanForDate).mockResolvedValue(finalized);
		jest.mocked(getRoutesForPlan).mockResolvedValue([]);

		await expect(createOrRefreshRoutePlan({ date: "2026-07-06" })).resolves.toBe(finalized);
		expect(replacePlanSnapshot).not.toHaveBeenCalled();
	});

	it("rejects before synchronization when the caller is not an owner", async () => {
		const { client } = fakeSupabase();
		jest.mocked(createClient).mockResolvedValue(client as never);
		jest.mocked(getAuthorizedUser).mockResolvedValue({ id: "staff-1", role: "staff" });
		jest.mocked(requireOwner).mockImplementationOnce(() => {
			throw new Error("Owner access required");
		});

		await expect(createOrRefreshRoutePlan({ date: "2026-07-06" })).rejects.toThrow(
			"Owner access required",
		);
		expect(materializeAttendanceForDate).not.toHaveBeenCalled();
		expect(getPlanForDate).not.toHaveBeenCalled();
		expect(replacePlanSnapshot).not.toHaveBeenCalled();
	});

	it("rejects a non-null school reference when its metadata is missing", async () => {
		const { client } = fakeSupabase({
			asp_students: {
				data: [
					{
						id: attendanceRows[0].studentId,
						name: "Absent Student",
						school_id: null,
						drop_off_only: false,
					},
					{
						id: attendanceRows[1].studentId,
						name: "Present Student",
						school_id: "missing-school",
						drop_off_only: false,
					},
				],
				error: null,
			},
			asp_schools: { data: [], error: null },
		});
		jest.mocked(createClient).mockResolvedValue(client as never);
		jest.mocked(getPlanForDate).mockResolvedValue({
			id: "plan-1",
			plan_date: "2026-07-06",
			status: "draft",
		});
		jest.mocked(getRoutesForPlan).mockResolvedValue([]);

		await expect(createOrRefreshRoutePlan({ date: "2026-07-06" })).rejects.toThrow(
			"Missing school metadata for missing-school",
		);
		expect(replacePlanSnapshot).not.toHaveBeenCalled();
	});
});

describe("attendance synchronization RPCs", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(getSystemSettings).mockResolvedValue({
			defaultDismissalTime: "15:00",
			defaultEarlyDismissalTime: "14:00",
			timezone: "America/Vancouver",
			routeOriginLat: null,
			routeOriginLng: null,
		});
	});

	it("persists all computed candidate rows in one synchronization RPC", async () => {
		const { materializeAttendanceForDate: actualMaterialize } = jest.requireActual<
			typeof import("../../lib/routes/materialize-attendance")
		>("../../lib/routes/materialize-attendance");
		const { client, calls } = fakeSupabase(
			{
				asp_students: {
					data: [
						{
							id: attendanceRows[1].studentId,
							name: "Present Student",
							school_id: "school-1",
							date_of_birth: null,
							drop_off_only: false,
							dismissal_time: null,
							early_dismissal_time: null,
							status: "active",
						},
					],
					error: null,
				},
				asp_enrollments: {
					data: [
						{
							id: "enrollment-1",
							student_id: attendanceRows[1].studentId,
							start_date: "2026-01-01",
							end_date: null,
							contract_days: ["Mon"],
							status: "active",
						},
					],
					error: null,
				},
				asp_calendar_rules: { data: [], error: null },
				asp_schools: {
					data: [
						{
							id: "school-1",
							name: "School One",
							standard_dismissal_time: "15:00",
							early_dismissal_time: "14:00",
						},
					],
					error: null,
				},
				asp_daily_attendance: { data: [], error: null },
				asp_settings: { data: [], error: null },
			},
			{ data: [{ student_id: attendanceRows[1].studentId }], error: null },
		);

		const result = await actualMaterialize(client, "2026-07-06");

		expect(result).toHaveLength(1);
		const rpc = calls.find((call) => call.method === "rpc");
		expect(rpc?.args[0]).toBe("persist_materialized_attendance_and_sync_plan");
		expect(rpc?.args[1]).toEqual({
			p_date: "2026-07-06",
			p_rows: [
				expect.objectContaining({
					student_id: attendanceRows[1].studentId,
					date: "2026-07-06",
					status: "P",
					original_status: "P",
					is_manual_override: false,
					modified_by: "system",
				}),
			],
		});
		expect(calls.filter((call) => call.method === "rpc")).toHaveLength(1);
		expect(calls.some((call) => call.method === "insert" || call.method === "update")).toBe(false);
	});

	it("propagates source query and persistence RPC errors", async () => {
		const { materializeAttendanceForDate: actualMaterialize } = jest.requireActual<
			typeof import("../../lib/routes/materialize-attendance")
		>("../../lib/routes/materialize-attendance");
		const sourceError = new Error("students failed");
		const source = fakeSupabase({
			asp_students: { data: null, error: sourceError },
			asp_settings: { data: [], error: null },
		});
		await expect(actualMaterialize(source.client, "2026-07-06")).rejects.toBe(sourceError);

		const rpcError = new Error("sync failed");
		const rpc = fakeSupabase(
			{ asp_settings: { data: [], error: null } },
			{ data: null, error: rpcError },
		);
		await expect(actualMaterialize(rpc.client, "2026-07-06")).rejects.toBe(rpcError);
	});

	it("saves a staff override through the audited synchronization RPC", async () => {
		const { client, calls } = fakeSupabase({}, { data: { id: "attendance-1" }, error: null });
		jest.mocked(createClient).mockResolvedValue(client as never);
		jest.mocked(getAuthorizedUser).mockResolvedValue({ id: "staff-1", role: "staff" });

		await expect(
			saveManualOverrideAction({
				student_id: attendanceRows[1].studentId,
				date: "2026-07-06",
				status: "ED",
				effective_dismissal_time: "13:30",
			}),
		).resolves.toEqual({ data: { id: "attendance-1" } });

		expect(getAuthorizedUser).toHaveBeenCalledWith(client);
		expect(calls).toContainEqual({
			method: "rpc",
			args: [
				"save_attendance_override_and_sync_plan",
				{
					p_student_id: attendanceRows[1].studentId,
					p_date: "2026-07-06",
					p_status: "ED",
					p_effective_dismissal_time: "13:30",
				},
			],
		});
		for (const path of ["/attendance", "/route-management", "/route-history"]) {
			expect(revalidatePath).toHaveBeenCalledWith(path);
		}
	});

	it("propagates an override synchronization error", async () => {
		const rpcError = new Error("override failed");
		const { client } = fakeSupabase({}, { data: null, error: rpcError });
		jest.mocked(createClient).mockResolvedValue(client as never);
		jest.mocked(getAuthorizedUser).mockResolvedValue({ id: "owner-1", role: "owner" });

		await expect(
			saveManualOverrideAction({
				student_id: attendanceRows[0].studentId,
				date: "2026-07-06",
				status: "A",
			}),
		).rejects.toBe(rpcError);
	});
});

describe("guarded manual route editing", () => {
	const planId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const routeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
	const targetRouteId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
	const stopId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
	const studentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
	const schoolId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
	const vehicleId = "11111111-1111-4111-8111-111111111111";
	const staffId = "22222222-2222-4222-8222-222222222222";
	const date = "2026-07-06";
	const client = {} as SupabaseClient;
	const editableRoute = {
		id: routeId,
		plan_id: planId,
		date,
		status: "draft",
		vehicle_id: vehicleId,
		asp_route_plans: { id: planId, status: "draft" },
	};
	const routableStudent = {
		student_id: studentId,
		plan_id: planId,
		school_id: schoolId,
		attendance_status: "P",
		drop_off_only: false,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(createClient).mockResolvedValue(client as never);
		jest.mocked(getAuthorizedUser).mockResolvedValue({ id: "owner-1", role: "owner" });
		jest.mocked(requireOwner).mockImplementation(() => undefined);
		jest.mocked(getRouteWithPlan).mockResolvedValue(editableRoute);
		jest.mocked(getPlanById).mockResolvedValue({ id: planId, plan_date: date, status: "draft" });
		jest.mocked(getStopById).mockResolvedValue({ id: stopId, route_id: routeId });
		jest.mocked(getStopsForRoute).mockResolvedValue([]);
		jest.mocked(getStopsForPlan).mockResolvedValue([]);
		jest.mocked(getPlanStudents).mockResolvedValue([routableStudent]);
		jest.mocked(getSystemSettings).mockResolvedValue({
			routeOriginLat: 49.1,
			routeOriginLng: -123.1,
		});
		jest.mocked(refreshRouteDistances).mockResolvedValue(undefined);
		jest.mocked(getVehicleById).mockResolvedValue({ id: vehicleId, is_active: true });
		jest.mocked(getStaffById).mockResolvedValue({
			id: staffId,
			is_active: true,
			capabilities: ["driver", "helper"],
		});
		jest.mocked(getAvailabilityForDate).mockResolvedValue([{ staff_id: staffId }]);
	});

	it("adds a lane only to an owner draft plan", async () => {
		jest.mocked(createRouteLane).mockResolvedValue({ id: routeId, date });

		await expect(addRouteTable({ planId })).resolves.toMatchObject({ id: routeId });

		expect(requireOwner).toHaveBeenCalledWith({ id: "owner-1", role: "owner" });
		expect(createRouteLane).toHaveBeenCalledWith(client, planId);
		expect(revalidatePath).toHaveBeenCalledWith("/route-management");
		expect(revalidatePath).toHaveBeenCalledWith(`/route-management?date=${date}`);
	});

	it.each([
		[{ ...editableRoute, asp_route_plans: { id: planId, status: "finalized" } }, "finalized"],
		[{ ...editableRoute, status: "completed" }, "completed"],
	])("rejects %s routes before mutation", async (route, _label) => {
		jest.mocked(getRouteWithPlan).mockResolvedValue(route);

		await expect(setRouteVehicle({ routeId, vehicleId: null })).rejects.toThrow();
		expect(setRouteVehicleRpc).not.toHaveBeenCalled();
	});

	it("accepts an array-shaped draft plan relation in the shared editable guard", async () => {
		jest.mocked(getRouteWithPlan).mockResolvedValue({
			...editableRoute,
			asp_route_plans: [{ id: planId, status: "draft" }],
		});

		await setRouteVehicle({ routeId, vehicleId: null });
		expect(setRouteVehicleRpc).toHaveBeenCalledWith(client, routeId, null);
	});

	it("requires confirmation before deleting a non-empty route", async () => {
		jest.mocked(getStopsForRoute).mockResolvedValue([{ id: stopId }]);

		await expect(removeRouteTable({ routeId })).rejects.toThrow("confirmation");
		expect(deleteRouteLane).not.toHaveBeenCalled();

		await removeRouteTable({ routeId, confirmNonEmpty: true });
		expect(deleteRouteLane).toHaveBeenCalledWith(client, routeId, true);
	});

	it("validates active vehicles while allowing vehicle clearing", async () => {
		jest.mocked(getVehicleById).mockResolvedValueOnce({ id: vehicleId, is_active: false });
		await expect(setRouteVehicle({ routeId, vehicleId })).rejects.toThrow("active");
		expect(setRouteVehicleRpc).not.toHaveBeenCalled();

		await setRouteVehicle({ routeId, vehicleId: null });
		expect(setRouteVehicleRpc).toHaveBeenCalledWith(client, routeId, null);
	});

	it.each([
		[{ is_active: false, capabilities: ["driver"] }, [{ staff_id: staffId }], "active"],
		[{ is_active: true, capabilities: ["helper"] }, [{ staff_id: staffId }], "capable"],
		[{ is_active: true, capabilities: ["driver"] }, [], "available"],
	])("rejects invalid staff selections", async (staff, availability, message) => {
		jest.mocked(getStaffById).mockResolvedValue({ id: staffId, ...staff });
		jest.mocked(getAvailabilityForDate).mockResolvedValue(availability);

		await expect(setRouteStaff({ routeId, role: "driver", staffId })).rejects.toThrow(message);
		expect(upsertAssignmentForVehicleDate).not.toHaveBeenCalled();
	});

	it("requires a vehicle and supports clearing a staff role", async () => {
		jest.mocked(getRouteWithPlan).mockResolvedValueOnce({ ...editableRoute, vehicle_id: null });
		await expect(setRouteStaff({ routeId, role: "driver", staffId: null })).rejects.toThrow(
			"vehicle",
		);

		await setRouteStaff({ routeId, role: "helper", staffId: null });
		expect(removeAssignmentForVehicleDateRole).toHaveBeenCalledWith(
			client,
			date,
			vehicleId,
			"helper",
		);
	});

	it.each([
		[{ ...routableStudent, attendance_status: "A" }, [], "routable"],
		[{ ...routableStudent, school_id: null }, [], "school"],
		[routableStudent, [{ student_id: studentId }], "assigned"],
	])("rejects invalid student assignments", async (student, stops, message) => {
		jest.mocked(getPlanStudents).mockResolvedValue([student]);
		jest.mocked(getStopsForPlan).mockResolvedValue(stops);

		await expect(assignStudent({ routeId, studentId, responsibleStaffId: null })).rejects.toThrow(
			message,
		);
		expect(assignRouteStudent).not.toHaveBeenCalled();
	});

	it("assigns a routable student without applying capacity rejection", async () => {
		await assignStudent({ routeId, studentId, responsibleStaffId: staffId });

		expect(assignRouteStudent).toHaveBeenCalledWith(client, routeId, studentId, staffId);
		expect(refreshRouteDistances).toHaveBeenCalledWith(client, routeId, {
			lat: 49.1,
			lng: -123.1,
		});
	});

	it("assigns an available school group with one RPC", async () => {
		await assignSchoolGroup({ routeId, schoolId });

		expect(assignRouteSchoolGroup).toHaveBeenCalledTimes(1);
		expect(assignRouteSchoolGroup).toHaveBeenCalledWith(client, routeId, schoolId);
		expect(assignRouteStudent).not.toHaveBeenCalled();
		expect(refreshRouteDistances).toHaveBeenCalledWith(client, routeId, {
			lat: 49.1,
			lng: -123.1,
		});
	});

	it("guards a stop source before removing it", async () => {
		await removeStudentStop({ stopId });

		expect(getStopById).toHaveBeenCalledWith(client, stopId);
		expect(getRouteWithPlan).toHaveBeenCalledWith(client, routeId);
		expect(removeRouteStop).toHaveBeenCalledWith(client, stopId);
		expect(refreshRouteDistances).toHaveBeenCalledWith(client, routeId, {
			lat: 49.1,
			lng: -123.1,
		});
	});

	it.each([
		["remove", () => removeStudentStop({ stopId })],
		["move", () => moveStudentStop({ stopId, targetRouteId })],
		["responsible staff", () => updateStopResponsibleStaff({ stopId, staffId: null })],
	])("denies %s before looking up the stop", async (_label, mutate) => {
		jest.mocked(requireOwner).mockImplementation(() => {
			throw new Error("Owner access required");
		});

		await expect(mutate()).rejects.toThrow("Owner access required");
		expect(getStopById).not.toHaveBeenCalled();
		expect(removeRouteStop).not.toHaveBeenCalled();
		expect(moveRouteStop).not.toHaveBeenCalled();
		expect(setRouteStopResponsibleStaff).not.toHaveBeenCalled();
	});

	it("moves a stop only between routes in the same plan", async () => {
		jest
			.mocked(getRouteWithPlan)
			.mockResolvedValueOnce(editableRoute)
			.mockResolvedValueOnce({ ...editableRoute, id: targetRouteId, plan_id: "different-plan" });
		await expect(moveStudentStop({ stopId, targetRouteId })).rejects.toThrow("same plan");
		expect(moveRouteStop).not.toHaveBeenCalled();

		jest.mocked(getAuthorizedUser).mockClear();
		jest.mocked(requireOwner).mockClear();
		jest
			.mocked(getRouteWithPlan)
			.mockResolvedValueOnce(editableRoute)
			.mockResolvedValueOnce({ ...editableRoute, id: targetRouteId });
		await moveStudentStop({ stopId, targetRouteId });
		expect(getAuthorizedUser).toHaveBeenCalledTimes(1);
		expect(requireOwner).toHaveBeenCalledTimes(1);
		expect(moveRouteStop).toHaveBeenCalledWith(client, stopId, targetRouteId);
		expect(refreshRouteDistances).toHaveBeenCalledWith(client, routeId, {
			lat: 49.1,
			lng: -123.1,
		});
		expect(refreshRouteDistances).toHaveBeenCalledWith(client, targetRouteId, {
			lat: 49.1,
			lng: -123.1,
		});
	});

	it("delegates a full unique reorder to one RPC", async () => {
		const orderedStopIds = [stopId, "33333333-3333-4333-8333-333333333333"];
		jest.mocked(getStopsForRoute).mockResolvedValue(orderedStopIds.map((id) => ({ id })));
		await reorderRouteStops({ routeId, orderedStopIds });

		expect(reorderRouteStopsRpc).toHaveBeenCalledWith(client, routeId, orderedStopIds);
		expect(refreshRouteDistances).toHaveBeenCalledWith(client, routeId, {
			lat: 49.1,
			lng: -123.1,
		});
	});

	it("rejects a partial stop reorder before RPC delegation", async () => {
		jest
			.mocked(getStopsForRoute)
			.mockResolvedValue([{ id: stopId }, { id: "33333333-3333-4333-8333-333333333333" }]);

		await expect(reorderRouteStops({ routeId, orderedStopIds: [stopId] })).rejects.toThrow(
			"every current route stop",
		);
		expect(reorderRouteStopsRpc).not.toHaveBeenCalled();
	});

	it("rejects a reorder containing a foreign stop before RPC delegation", async () => {
		jest.mocked(getStopsForRoute).mockResolvedValue([{ id: stopId }]);

		await expect(
			reorderRouteStops({
				routeId,
				orderedStopIds: ["33333333-3333-4333-8333-333333333333"],
			}),
		).rejects.toThrow("every current route stop");
		expect(reorderRouteStopsRpc).not.toHaveBeenCalled();
	});

	it("validates responsible staff and supports clearing it", async () => {
		jest.mocked(getStaffById).mockResolvedValueOnce({
			id: staffId,
			is_active: false,
			capabilities: [],
		});
		await expect(updateStopResponsibleStaff({ stopId, staffId })).rejects.toThrow("active");
		expect(setRouteStopResponsibleStaff).not.toHaveBeenCalled();

		await updateStopResponsibleStaff({ stopId, staffId: null });
		expect(setRouteStopResponsibleStaff).toHaveBeenCalledWith(client, stopId, null);
	});

	it("does not revalidate when an audited RPC fails", async () => {
		const rpcError = new Error("RPC failed");
		jest.mocked(setRouteVehicleRpc).mockRejectedValue(rpcError);

		await expect(setRouteVehicle({ routeId, vehicleId: null })).rejects.toBe(rpcError);
		expect(refreshRouteDistances).not.toHaveBeenCalled();
		expect(revalidatePath).not.toHaveBeenCalled();
	});
});
