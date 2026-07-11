import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManagedRouteRow, RoutePlanRow } from "../routes/management-types";

export type StaffManagedRouteRow = Omit<
	ManagedRouteRow,
	"plate_number_snapshot" | "exported_by" | "created_by" | "updated_by"
>;

export type RouteWithPlanRow = ManagedRouteRow & {
	asp_route_plans: RoutePlanRow | RoutePlanRow[] | null;
};

export async function getRoutesForPlan(
	supabase: SupabaseClient,
	planId: string,
): Promise<ManagedRouteRow[]> {
	return getRoutesForPlanForRole(supabase, planId, "owner");
}

export function getRoutesForPlanForRole(
	supabase: SupabaseClient,
	planId: string,
	role: "owner",
): Promise<ManagedRouteRow[]>;
export function getRoutesForPlanForRole(
	supabase: SupabaseClient,
	planId: string,
	role: "staff",
): Promise<StaffManagedRouteRow[]>;
export async function getRoutesForPlanForRole(
	supabase: SupabaseClient,
	planId: string,
	role: "owner" | "staff",
): Promise<ManagedRouteRow[] | StaffManagedRouteRow[]> {
	const source = role === "owner" ? "asp_routes" : "asp_routes_staff_view";
	const { data, error } = await supabase
		.from(source)
		.select("*")
		.eq("plan_id", planId)
		.order("run_number");
	if (error) throw error;
	return data;
}

export async function getRouteWithPlan(
	supabase: SupabaseClient,
	routeId: string,
): Promise<RouteWithPlanRow> {
	const { data, error } = await supabase
		.from("asp_routes")
		.select("*, asp_route_plans(*)")
		.eq("id", routeId)
		.single();
	if (error) throw error;
	return data;
}

export async function createRouteLane(supabase: SupabaseClient, planId: string) {
	const { data, error } = await supabase.rpc("create_route_lane", { p_plan_id: planId });
	if (error) throw error;
	return data;
}

export async function setRouteVehicle(
	supabase: SupabaseClient,
	routeId: string,
	vehicleId: string | null,
) {
	const { data, error } = await supabase.rpc("set_route_vehicle", {
		p_route_id: routeId,
		p_vehicle_id: vehicleId,
	});
	if (error) throw error;
	return data;
}

export async function deleteRouteLane(
	supabase: SupabaseClient,
	routeId: string,
	confirmNonempty: boolean,
) {
	const { data, error } = await supabase.rpc("delete_route_lane", {
		p_route_id: routeId,
		p_confirm_nonempty: confirmNonempty,
	});
	if (error) throw error;
	return data;
}

export function getRouteStaffSelection(
	route: Pick<
		ManagedRouteRow,
		"vehicle_id" | "status" | "driver_name_snapshot" | "helper_name_snapshot"
	>,
	planStatus: "draft" | "finalized",
	assignments: ReadonlyArray<{
		staff_id: string;
		vehicle_id: string;
		role: "driver" | "helper";
	}>,
	staff: ReadonlyArray<{ id: string; name: string }>,
) {
	if (planStatus === "finalized" || route.status === "completed") {
		return {
			driverId: null,
			driverName: route.driver_name_snapshot,
			helperId: null,
			helperName: route.helper_name_snapshot,
		};
	}

	const driver = assignments.find(
		(assignment) => assignment.vehicle_id === route.vehicle_id && assignment.role === "driver",
	);
	const helper = assignments.find(
		(assignment) => assignment.vehicle_id === route.vehicle_id && assignment.role === "helper",
	);
	return {
		driverId: driver?.staff_id ?? null,
		driverName: staff.find((member) => member.id === driver?.staff_id)?.name ?? null,
		helperId: helper?.staff_id ?? null,
		helperName: staff.find((member) => member.id === helper?.staff_id)?.name ?? null,
	};
}

export async function getRouteById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase.from("asp_routes").select("*").eq("id", id).single();

	if (error) throw error;
	return data;
}

export async function updateRouteTotalDistance(
	supabase: SupabaseClient,
	id: string,
	totalDistanceKm: number | null,
) {
	const { data, error } = await supabase
		.from("asp_routes")
		.update({ total_distance_km: totalDistanceKm })
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function markRouteExported(supabase: SupabaseClient, id: string, userId: string) {
	const { data, error } = await supabase
		.from("asp_routes")
		.update({
			status: "completed",
			exported_at: new Date().toISOString(),
			exported_by: userId,
		})
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}
