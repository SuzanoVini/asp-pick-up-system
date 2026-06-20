import type { SupabaseClient } from "@supabase/supabase-js";

export async function getRoutesForDate(supabase: SupabaseClient, date: string) {
	const { data, error } = await supabase
		.from("asp_routes")
		.select("*")
		.eq("date", date)
		.order("vehicle_name_snapshot");

	if (error) throw error;
	return data;
}

export async function getRouteById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase.from("asp_routes").select("*").eq("id", id).single();

	if (error) throw error;
	return data;
}

export async function getRouteByDateAndVehicle(
	supabase: SupabaseClient,
	date: string,
	vehicleId: string,
) {
	const { data, error } = await supabase
		.from("asp_routes")
		.select("*")
		.eq("date", date)
		.eq("vehicle_id", vehicleId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function createRoute(
	supabase: SupabaseClient,
	input: {
		date: string;
		vehicle_id: string;
		status?: string;
		total_distance_km?: number | null;
		vehicle_name_snapshot: string;
		driver_name_snapshot?: string | null;
		helper_name_snapshot?: string | null;
	},
) {
	const { data, error } = await supabase
		.from("asp_routes")
		.insert({ status: "draft", ...input })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updateRouteStatus(
	supabase: SupabaseClient,
	id: string,
	status: string,
	extra?: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_routes")
		.update({ status, ...extra })
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updateRouteSnapshots(
	supabase: SupabaseClient,
	id: string,
	snapshots: {
		vehicle_name_snapshot?: string;
		driver_name_snapshot?: string | null;
		helper_name_snapshot?: string | null;
	},
) {
	const { data, error } = await supabase
		.from("asp_routes")
		.update(snapshots)
		.eq("id", id)
		.select()
		.single();

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

export async function markRouteExported(
	supabase: SupabaseClient,
	id: string,
	userId: string,
) {
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

export async function deleteRoute(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_routes").delete().eq("id", id);
	if (error) throw error;
}

export async function deleteRoutesForDate(supabase: SupabaseClient, date: string) {
	const { error } = await supabase.from("asp_routes").delete().eq("date", date);
	if (error) throw error;
}
