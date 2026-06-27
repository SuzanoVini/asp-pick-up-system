import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoutePlanStudentSnapshotInput } from "./route-plans";

export async function getPlanStudents(supabase: SupabaseClient, planId: string) {
	const { data, error } = await supabase
		.from("asp_route_plan_students")
		.select("*")
		.eq("plan_id", planId)
		.order("student_name_snapshot");
	if (error) throw error;
	return data;
}

export async function insertPlanStudentsBatch(
	supabase: SupabaseClient,
	planId: string,
	students: readonly RoutePlanStudentSnapshotInput[],
) {
	const rows = students.map((student) => ({ plan_id: planId, ...student }));
	const { data, error } = await supabase.from("asp_route_plan_students").insert(rows).select();
	if (error) throw error;
	return data;
}

export async function getRoutableUnassignedStudents(supabase: SupabaseClient, planId: string) {
	const { data: assignedStops, error: stopsError } = await supabase
		.from("asp_route_stops")
		.select("student_id, asp_routes!inner(plan_id)")
		.eq("asp_routes.plan_id", planId);
	if (stopsError) throw stopsError;

	const { data: students, error: studentsError } = await supabase
		.from("asp_route_plan_students")
		.select("*")
		.eq("plan_id", planId)
		.in("attendance_status", ["P", "E", "ED"])
		.eq("drop_off_only", false)
		.not("school_id", "is", null)
		.order("student_name_snapshot");
	if (studentsError) throw studentsError;

	const assignedIds = new Set(
		(assignedStops ?? []).map((stop: { student_id: string }) => stop.student_id),
	);
	return (students ?? []).filter(
		(student: { student_id: string }) => !assignedIds.has(student.student_id),
	);
}
