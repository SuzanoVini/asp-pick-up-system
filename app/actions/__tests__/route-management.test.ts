import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { saveManualOverrideAction } from "../attendance";
import { createOrRefreshRoutePlan } from "../route-management";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("../../lib/routes/materialize-attendance", () => ({
	materializeAttendanceForDate: jest.fn(),
}));
jest.mock("../../lib/security/authorization", () => ({
	getAuthorizedUser: jest.fn(),
	requireOwner: jest.fn(),
}));
jest.mock("../../lib/supabase/route-plans", () => ({
	getPlanForDate: jest.fn(),
	replacePlanSnapshot: jest.fn(),
}));
jest.mock("../../lib/supabase/routes", () => ({ getRoutesForPlan: jest.fn() }));
jest.mock("../../lib/supabase/server", () => ({ createClient: jest.fn() }));

const { materializeAttendanceForDate } = jest.requireMock(
	"../../lib/routes/materialize-attendance",
) as { materializeAttendanceForDate: jest.Mock };
const { getAuthorizedUser, requireOwner } = jest.requireMock(
	"../../lib/security/authorization",
) as { getAuthorizedUser: jest.Mock; requireOwner: jest.Mock };
const { getPlanForDate, replacePlanSnapshot } = jest.requireMock(
	"../../lib/supabase/route-plans",
) as { getPlanForDate: jest.Mock; replacePlanSnapshot: jest.Mock };
const { getRoutesForPlan } = jest.requireMock("../../lib/supabase/routes") as {
	getRoutesForPlan: jest.Mock;
};
const { createClient } = jest.requireMock("../../lib/supabase/server") as {
	createClient: jest.Mock;
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
	beforeEach(() => jest.clearAllMocks());

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
