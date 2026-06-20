import type { SupabaseClient } from "@supabase/supabase-js";

export async function getStudents(
	supabase: SupabaseClient,
	filters?: { status?: string; schoolId?: string },
) {
	let query = supabase.from("asp_students").select("*, asp_schools(name)").order("name");

	if (filters?.status) {
		query = query.eq("status", filters.status);
	}
	if (filters?.schoolId) {
		query = query.eq("school_id", filters.schoolId);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getActiveStudents(supabase: SupabaseClient) {
	return getStudents(supabase, { status: "active" });
}

export async function getFormerStudents(supabase: SupabaseClient) {
	return getStudents(supabase, { status: "former" });
}

export async function getStudentById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase
		.from("asp_students")
		.select("*, asp_schools(name), asp_guardians(*), asp_enrollments(*)")
		.eq("id", id)
		.single();

	if (error) throw error;
	return data;
}

export async function createStudent(
	supabase: SupabaseClient,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase.from("asp_students").insert(input).select().single();
	if (error) throw error;
	return data;
}

export async function updateStudent(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_students")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteStudent(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_students").delete().eq("id", id);
	if (error) throw error;
}
