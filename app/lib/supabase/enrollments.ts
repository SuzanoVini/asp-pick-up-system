import type { SupabaseClient } from "@supabase/supabase-js";

export async function getEnrollments(
	supabase: SupabaseClient,
	filters?: { studentId?: string; status?: string },
) {
	let query = supabase
		.from("asp_enrollments")
		.select("*, asp_students(name)")
		.order("start_date", { ascending: false });

	if (filters?.studentId) {
		query = query.eq("student_id", filters.studentId);
	}
	if (filters?.status) {
		query = query.eq("status", filters.status);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getEnrollmentsByStudent(supabase: SupabaseClient, studentId: string) {
	return getEnrollments(supabase, { studentId });
}

export async function getActiveEnrollmentForDate(
	supabase: SupabaseClient,
	studentId: string,
	date: string,
) {
	const { data, error } = await supabase
		.from("asp_enrollments")
		.select("*")
		.eq("student_id", studentId)
		.eq("status", "active")
		.lte("start_date", date)
		.or(`end_date.gte.${date},end_date.is.null`)
		.single();

	if (error && error.code !== "PGRST116") throw error;
	return data;
}

export async function getEnrollmentById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase
		.from("asp_enrollments")
		.select("*, asp_students(name)")
		.eq("id", id)
		.single();

	if (error) throw error;
	return data;
}

export async function createEnrollment(supabase: SupabaseClient, input: Record<string, unknown>) {
	const { data, error } = await supabase.from("asp_enrollments").insert(input).select().single();

	if (error) throw error;
	return data;
}

export async function updateEnrollment(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_enrollments")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function countActiveEnrollments(supabase: SupabaseClient, studentId: string) {
	const { count, error } = await supabase
		.from("asp_enrollments")
		.select("*", { count: "exact", head: true })
		.eq("student_id", studentId)
		.eq("status", "active");

	if (error) throw error;
	return count ?? 0;
}
