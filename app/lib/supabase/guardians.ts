import type { SupabaseClient } from "@supabase/supabase-js";

export async function getGuardians(
	supabase: SupabaseClient,
	filters?: { studentId?: string },
) {
	let query = supabase
		.from("asp_guardians")
		.select("*, asp_students(name)")
		.order("is_primary", { ascending: false })
		.order("name");

	if (filters?.studentId) {
		query = query.eq("student_id", filters.studentId);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getGuardianById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase
		.from("asp_guardians")
		.select("*, asp_students(name)")
		.eq("id", id)
		.single();

	if (error) throw error;
	return data;
}

export async function createGuardian(
	supabase: SupabaseClient,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase.from("asp_guardians").insert(input).select().single();
	if (error) throw error;
	return data;
}

export async function updateGuardian(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_guardians")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteGuardian(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_guardians").delete().eq("id", id);
	if (error) throw error;
}
