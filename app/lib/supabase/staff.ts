import type { SupabaseClient } from "@supabase/supabase-js";

export async function getStaff(
	supabase: SupabaseClient,
	filters?: { isActive?: boolean },
) {
	let query = supabase.from("asp_staff").select("*").order("name");

	if (filters?.isActive !== undefined) {
		query = query.eq("is_active", filters.isActive);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getActiveStaff(supabase: SupabaseClient) {
	return getStaff(supabase, { isActive: true });
}

export async function getStaffById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase
		.from("asp_staff")
		.select("*")
		.eq("id", id)
		.single();

	if (error) throw error;
	return data;
}

export async function createStaffMember(
	supabase: SupabaseClient,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase.from("asp_staff").insert(input).select().single();
	if (error) throw error;
	return data;
}

export async function updateStaffMember(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_staff")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteStaffMember(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_staff").delete().eq("id", id);
	if (error) throw error;
}
