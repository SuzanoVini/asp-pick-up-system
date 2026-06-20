import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSchools(
	supabase: SupabaseClient,
	filters?: { status?: string },
) {
	let query = supabase.from("asp_schools").select("*").order("name");

	if (filters?.status) {
		query = query.eq("status", filters.status);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getActiveSchools(supabase: SupabaseClient) {
	return getSchools(supabase, { status: "active" });
}

export async function getSchoolById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase
		.from("asp_schools")
		.select("*")
		.eq("id", id)
		.single();

	if (error) throw error;
	return data;
}

export async function createSchool(
	supabase: SupabaseClient,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase.from("asp_schools").insert(input).select().single();
	if (error) throw error;
	return data;
}

export async function updateSchool(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_schools")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteSchool(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_schools").delete().eq("id", id);
	if (error) throw error;
}
