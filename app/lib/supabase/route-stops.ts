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
	},
) {
	const { data, error } = await supabase
		.from("asp_route_stops")
		.insert(input)
		.select()
		.single();

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
	const { data: routes } = await supabase
		.from("asp_routes")
		.select("id")
		.eq("date", date);

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
