import type { SupabaseClient } from "@supabase/supabase-js";

export async function getVehicles(supabase: SupabaseClient, filters?: { isActive?: boolean }) {
	let query = supabase.from("asp_vehicles").select("*").order("name");

	if (filters?.isActive !== undefined) {
		query = query.eq("is_active", filters.isActive);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getActiveVehicles(supabase: SupabaseClient) {
	return getVehicles(supabase, { isActive: true });
}

export async function getVehicleById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase.from("asp_vehicles").select("*").eq("id", id).single();

	if (error) throw error;
	return data;
}

export async function createVehicle(supabase: SupabaseClient, input: Record<string, unknown>) {
	const { data, error } = await supabase.from("asp_vehicles").insert(input).select().single();
	if (error) throw error;
	return data;
}

export async function updateVehicle(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_vehicles")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteVehicle(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_vehicles").delete().eq("id", id);
	if (error) throw error;
}
