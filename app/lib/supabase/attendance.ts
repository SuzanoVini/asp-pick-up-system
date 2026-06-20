import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAttendanceForDate(supabase: SupabaseClient, date: string) {
	const { data, error } = await supabase
		.from("asp_daily_attendance")
		.select("*, asp_students(name, school_id, drop_off_only)")
		.eq("date", date)
		.order("student_id");

	if (error) throw error;
	return data;
}

export async function getAttendanceByStudentAndDate(
	supabase: SupabaseClient,
	studentId: string,
	date: string,
) {
	const { data, error } = await supabase
		.from("asp_daily_attendance")
		.select("*")
		.eq("student_id", studentId)
		.eq("date", date)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function materializeAttendance(
	supabase: SupabaseClient,
	rows: {
		student_id: string;
		date: string;
		status: string;
		original_status?: string;
		effective_dismissal_time?: string | null;
		is_manual_override?: boolean;
		applied_rule_ids?: string[];
		modified_by?: string;
	}[],
) {
	const { data, error } = await supabase
		.from("asp_daily_attendance")
		.upsert(rows, { onConflict: "student_id,date", ignoreDuplicates: false })
		.select();

	if (error) throw error;
	return data;
}

export async function saveManualOverride(
	supabase: SupabaseClient,
	studentId: string,
	date: string,
	status: string,
	effectiveDismissalTime?: string | null,
) {
	const { data, error } = await supabase
		.from("asp_daily_attendance")
		.upsert(
			{
				student_id: studentId,
				date,
				status,
				original_status: status,
				effective_dismissal_time: effectiveDismissalTime ?? null,
				is_manual_override: true,
				applied_rule_ids: [],
				modified_by: "manual",
				materialized_at: new Date().toISOString(),
			},
			{ onConflict: "student_id,date", ignoreDuplicates: false },
		)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function getManualOverridesForDate(supabase: SupabaseClient, date: string) {
	const { data, error } = await supabase
		.from("asp_daily_attendance")
		.select("student_id, status, effective_dismissal_time")
		.eq("date", date)
		.eq("is_manual_override", true);

	if (error) throw error;
	return data;
}
