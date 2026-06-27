import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoutableUnassignedStudents } from "../route-plan-students";
import { finalizePlan, getHistoryPlans, getPlanForDate, replacePlanSnapshot } from "../route-plans";
import { getStopsForPlan, moveRouteStop, removeStopByStudentAndDate } from "../route-stops";
import { createRouteLane, getRouteStaffSelection, getRoutesForPlanForRole } from "../routes";
import {
	getAvailableStaffAndAssignmentsForDate,
	upsertAssignmentForVehicleDate,
} from "../staff-schedule";

type Call = { method: string; args: unknown[] };

function fakeSupabase(
	responses: Array<{ data: unknown; error: Error | null }> = [{ data: [], error: null }],
) {
	const calls: Call[] = [];
	let responseIndex = 0;
	const chain = new Proxy(
		{},
		{
			get: (_target, method: string) => {
				if (method === "then") {
					return (resolve: (value: unknown) => void) =>
						resolve(responses[Math.min(responseIndex++, responses.length - 1)]);
				}
				return (...args: unknown[]) => {
					calls.push({ method, args });
					return chain;
				};
			},
		},
	);
	const client = {
		from: (table: string) => {
			calls.push({ method: "from", args: [table] });
			return chain;
		},
		rpc: (name: string, args: unknown) => {
			calls.push({ method: "rpc", args: [name, args] });
			return chain;
		},
	} as unknown as SupabaseClient;
	return { client, calls };
}

describe("route management Supabase queries", () => {
	it("looks up a plan by its exact calendar date", async () => {
		const { client, calls } = fakeSupabase([{ data: { id: "plan-1" }, error: null }]);

		await getPlanForDate(client, "2026-07-03");

		expect(calls).toContainEqual({ method: "from", args: ["asp_route_plans"] });
		expect(calls).toContainEqual({ method: "eq", args: ["plan_date", "2026-07-03"] });
		expect(calls.some((call) => call.args.includes("weekday"))).toBe(false);
	});

	it("returns only finalized operational history with an optional exact date", async () => {
		const { client, calls } = fakeSupabase();

		await getHistoryPlans(client, { date: "2026-07-03", limit: 12 });

		expect(calls).toContainEqual({ method: "select", args: ["*"] });
		expect(
			calls.some(
				(call) =>
					call.method === "select" &&
					typeof call.args[0] === "string" &&
					call.args[0].includes("asp_routes"),
			),
		).toBe(false);
		expect(calls).toContainEqual({ method: "eq", args: ["status", "finalized"] });
		expect(calls).toContainEqual({ method: "eq", args: ["plan_date", "2026-07-03"] });
		expect(calls).toContainEqual({ method: "limit", args: [12] });
	});

	it("delegates plan replacement and finalization to trusted RPCs", async () => {
		const { client, calls } = fakeSupabase();
		const students = [
			{
				student_id: "student-1",
				school_id: "school-1",
				attendance_status: "P" as const,
				drop_off_only: false,
				needs_booster: false,
				student_name_snapshot: "Student One",
				school_name_snapshot: "School One",
			},
		];

		await replacePlanSnapshot(client, "2026-07-03", students);
		await finalizePlan(client, "plan-1", ["capacity"], ["missing_staff"], "Approved");

		expect(calls).toContainEqual({
			method: "rpc",
			args: ["replace_route_plan_snapshot", { p_plan_date: "2026-07-03", p_students: students }],
		});
		expect(calls).toContainEqual({
			method: "rpc",
			args: [
				"finalize_route_plan",
				{
					p_plan_id: "plan-1",
					p_acknowledged_warnings: ["capacity"],
					p_overridden_blockers: ["missing_staff"],
					p_override_reason: "Approved",
				},
			],
		});
	});

	it("chooses the role-safe route source and leaves run numbering to the RPC", async () => {
		const { client, calls } = fakeSupabase();

		await getRoutesForPlanForRole(client, "plan-1", "staff");
		await createRouteLane(client, "plan-1");

		expect(calls).toContainEqual({ method: "from", args: ["asp_routes_staff_view"] });
		expect(calls).toContainEqual({ method: "order", args: ["run_number"] });
		expect(calls).toContainEqual({
			method: "rpc",
			args: ["create_route_lane", { p_plan_id: "plan-1" }],
		});
		expect(calls.some((call) => call.method === "select" && call.args.includes("max"))).toBe(false);
	});

	it("uses live date and vehicle assignments for draft route staff", () => {
		const route = {
			vehicle_id: "vehicle-1",
			status: "draft" as const,
			driver_name_snapshot: "Old Driver",
			helper_name_snapshot: "Old Helper",
		};
		const selection = getRouteStaffSelection(
			route,
			"draft",
			[
				{ staff_id: "staff-1", vehicle_id: "vehicle-1", role: "driver" },
				{ staff_id: "staff-2", vehicle_id: "vehicle-1", role: "helper" },
			],
			[
				{ id: "staff-1", name: "Live Driver" },
				{ id: "staff-2", name: "Live Helper" },
			],
		);

		expect(selection).toEqual({
			driverId: "staff-1",
			driverName: "Live Driver",
			helperId: "staff-2",
			helperName: "Live Helper",
		});
	});

	it.each([
		{ planStatus: "finalized" as const, routeStatus: "active" as const },
		{ planStatus: "draft" as const, routeStatus: "completed" as const },
	])("uses frozen staff snapshots for $planStatus/$routeStatus routes", ({
		planStatus,
		routeStatus,
	}) => {
		const selection = getRouteStaffSelection(
			{
				vehicle_id: "vehicle-1",
				status: routeStatus,
				driver_name_snapshot: "Frozen Driver",
				helper_name_snapshot: "Frozen Helper",
			},
			planStatus,
			[{ staff_id: "staff-live", vehicle_id: "vehicle-1", role: "driver" }],
			[{ id: "staff-live", name: "Live Driver" }],
		);

		expect(selection).toEqual({
			driverId: null,
			driverName: "Frozen Driver",
			helperId: null,
			helperName: "Frozen Helper",
		});
	});

	it("fetches all plan stops once and delegates moves atomically", async () => {
		const { client, calls } = fakeSupabase();

		await getStopsForPlan(client, "plan-1");
		await moveRouteStop(client, "stop-1", "route-2");

		expect(calls).toContainEqual({ method: "eq", args: ["asp_routes.plan_id", "plan-1"] });
		expect(calls).toContainEqual({
			method: "rpc",
			args: ["move_route_stop", { p_stop_id: "stop-1", p_target_route_id: "route-2" }],
		});
	});

	it("lists unassigned routable students and reuses exact-date staff assignments", async () => {
		const { client, calls } = fakeSupabase([
			{ data: [{ student_id: "assigned" }], error: null },
			{
				data: [{ student_id: "assigned" }, { student_id: "unassigned" }],
				error: null,
			},
			{ data: [], error: null },
			{ data: [], error: null },
		]);

		await expect(getRoutableUnassignedStudents(client, "plan-1")).resolves.toEqual([
			{ student_id: "unassigned" },
		]);
		await getAvailableStaffAndAssignmentsForDate(client, "2026-07-03");
		await upsertAssignmentForVehicleDate(client, "staff-1", "2026-07-03", "vehicle-1", "driver");

		expect(calls.filter((call) => call.method === "eq" && call.args[0] === "date")).toContainEqual({
			method: "eq",
			args: ["date", "2026-07-03"],
		});
		expect(calls).toContainEqual({
			method: "rpc",
			args: [
				"upsert_staff_assignment_for_vehicle_date",
				{
					p_staff_id: "staff-1",
					p_date: "2026-07-03",
					p_vehicle_id: "vehicle-1",
					p_role: "driver",
				},
			],
		});
	});

	it("propagates Supabase query and RPC errors", async () => {
		const queryError = new Error("query failed");
		const rpcError = new Error("rpc failed");
		const query = fakeSupabase([{ data: null, error: queryError }]);
		const rpc = fakeSupabase([{ data: null, error: rpcError }]);

		await expect(getPlanForDate(query.client, "2026-07-03")).rejects.toBe(queryError);
		await expect(createRouteLane(rpc.client, "plan-1")).rejects.toBe(rpcError);
	});

	it("propagates the route lookup error before removing a student's stop", async () => {
		const queryError = new Error("route lookup failed");
		const { client } = fakeSupabase([{ data: null, error: queryError }]);

		await expect(removeStopByStudentAndDate(client, "student-1", "2026-07-03")).rejects.toBe(
			queryError,
		);
	});
});
