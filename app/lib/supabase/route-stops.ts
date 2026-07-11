import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManagedStopRow } from "../routes/management-types";

export type StopLookupRow = Pick<ManagedStopRow, "id" | "route_id">;

export async function getStopsForRoute(supabase: SupabaseClient, routeId: string) {
	const { data, error } = await supabase
		.from("asp_route_stops")
		.select("*")
		.eq("route_id", routeId)
		.order("order_index");

	if (error) throw error;
	return data;
}

export async function getStopById(
	supabase: SupabaseClient,
	stopId: string,
): Promise<StopLookupRow> {
	const { data, error } = await supabase
		.from("asp_route_stops")
		.select("id, route_id")
		.eq("id", stopId)
		.single();
	if (error) throw error;
	return data;
}

export async function getStopsForPlan(supabase: SupabaseClient, planId: string) {
	const { data, error } = await supabase
		.from("asp_route_stops")
		.select("*, asp_routes!inner(plan_id, run_number)")
		.eq("asp_routes.plan_id", planId)
		.order("route_id")
		.order("order_index");
	if (error) throw error;
	return data;
}

export async function assignRouteStudent(
	supabase: SupabaseClient,
	routeId: string,
	studentId: string,
	responsibleStaffId: string | null,
) {
	const { data, error } = await supabase.rpc("assign_route_student", {
		p_route_id: routeId,
		p_student_id: studentId,
		p_responsible_staff_id: responsibleStaffId,
	});
	if (error) throw error;
	return data;
}

export async function assignRouteSchoolGroup(
	supabase: SupabaseClient,
	routeId: string,
	schoolId: string,
) {
	const { data, error } = await supabase.rpc("assign_route_school_group", {
		p_route_id: routeId,
		p_school_id: schoolId,
	});
	if (error) throw error;
	return data;
}

export async function removeRouteStop(supabase: SupabaseClient, stopId: string) {
	const { data, error } = await supabase.rpc("remove_route_stop", { p_stop_id: stopId });
	if (error) throw error;
	return data;
}

export async function moveRouteStop(
	supabase: SupabaseClient,
	stopId: string,
	targetRouteId: string,
) {
	const { data, error } = await supabase.rpc("move_route_stop", {
		p_stop_id: stopId,
		p_target_route_id: targetRouteId,
	});
	if (error) throw error;
	return data;
}

export async function reorderRouteStops(
	supabase: SupabaseClient,
	routeId: string,
	stopIds: readonly string[],
) {
	const { data, error } = await supabase.rpc("reorder_route_stops", {
		p_route_id: routeId,
		p_stop_ids: stopIds,
	});
	if (error) throw error;
	return data;
}

export async function setRouteStopResponsibleStaff(
	supabase: SupabaseClient,
	stopId: string,
	staffId: string | null,
) {
	const { data, error } = await supabase.rpc("set_route_stop_responsible_staff", {
		p_stop_id: stopId,
		p_staff_id: staffId,
	});
	if (error) throw error;
	return data;
}

export async function updateStop(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_route_stops")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}
