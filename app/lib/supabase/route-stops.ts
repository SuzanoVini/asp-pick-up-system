import type { SupabaseClient } from "@supabase/supabase-js";

export async function getStopsForRoute(supabase: SupabaseClient, routeId: string) {
	const { data, error } = await supabase
		.from("asp_route_stops")
		.select("*")
		.eq("route_id", routeId)
		.order("order_index");

	if (error) throw error;
	return data;
}

export async function getStopsForDate(supabase: SupabaseClient, date: string) {
	const { data, error } = await supabase
		.from("asp_route_stops")
		.select("*, asp_routes!inner(date)")
		.eq("asp_routes.date", date)
		.order("order_index");

	if (error) throw error;
	return data;
}

export async function createStop(
	supabase: SupabaseClient,
	input: {
		route_id: string;
		student_id: string;
		school_id: string;
		seat_number: number;
		order_index: number;
		distance_from_prev_km?: number | null;
		duration_from_prev_min?: number | null;
		needs_booster: boolean;
		student_name_snapshot: string;
		school_name_snapshot: string;
		school_address_snapshot?: string | null;
		dismissal_time_snapshot?: string | null;
		responsible_staff_id?: string | null;
		responsible_staff_name_snapshot?: string | null;
	},
) {
	const { data, error } = await supabase.from("asp_route_stops").insert(input).select().single();

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

export async function createStopsBatch(
	supabase: SupabaseClient,
	stops: Array<{
		route_id: string;
		student_id: string;
		school_id: string;
		seat_number: number;
		order_index: number;
		distance_from_prev_km?: number | null;
		duration_from_prev_min?: number | null;
		needs_booster: boolean;
		student_name_snapshot: string;
		school_name_snapshot: string;
		school_address_snapshot?: string | null;
		dismissal_time_snapshot?: string | null;
		responsible_staff_id?: string | null;
		responsible_staff_name_snapshot?: string | null;
	}>,
) {
	const { data, error } = await supabase.from("asp_route_stops").insert(stops).select();

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

export async function removeStop(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_route_stops").delete().eq("id", id);
	if (error) throw error;
}

export async function removeStopByStudentAndDate(
	supabase: SupabaseClient,
	studentId: string,
	date: string,
) {
	const { data: routes, error: routesError } = await supabase
		.from("asp_routes")
		.select("id")
		.eq("date", date);
	if (routesError) throw routesError;

	if (!routes || routes.length === 0) return;

	const routeIds = routes.map((r) => r.id);
	const { error } = await supabase
		.from("asp_route_stops")
		.delete()
		.eq("student_id", studentId)
		.in("route_id", routeIds);

	if (error) throw error;
}

export async function removeAllStopsForRoute(supabase: SupabaseClient, routeId: string) {
	const { error } = await supabase.from("asp_route_stops").delete().eq("route_id", routeId);
	if (error) throw error;
}
