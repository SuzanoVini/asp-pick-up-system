import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoutePlanStudentRow } from "../routes/management-types";

export type RoutePlanStudentSnapshotInput = Pick<
	RoutePlanStudentRow,
	| "student_id"
	| "school_id"
	| "attendance_status"
	| "drop_off_only"
	| "needs_booster"
	| "student_name_snapshot"
	| "school_name_snapshot"
>;

export async function getPlanForDate(supabase: SupabaseClient, date: string) {
	const { data, error } = await supabase
		.from("asp_route_plans")
		.select("*")
		.eq("plan_date", date)
		.maybeSingle();
	if (error) throw error;
	return data;
}

export async function getPlanById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase.from("asp_route_plans").select("*").eq("id", id).single();
	if (error) throw error;
	return data;
}

export async function replacePlanSnapshot(
	supabase: SupabaseClient,
	date: string,
	students: readonly RoutePlanStudentSnapshotInput[],
) {
	const { data, error } = await supabase.rpc("replace_route_plan_snapshot", {
		p_plan_date: date,
		p_students: students,
	});
	if (error) throw error;
	return data;
}

export async function finalizePlan(
	supabase: SupabaseClient,
	planId: string,
	acknowledgedWarnings: readonly string[],
	overriddenBlockers: readonly string[],
	overrideReason: string | null,
) {
	const { data, error } = await supabase.rpc("finalize_route_plan", {
		p_plan_id: planId,
		p_acknowledged_warnings: acknowledgedWarnings,
		p_overridden_blockers: overriddenBlockers,
		p_override_reason: overrideReason,
	});
	if (error) throw error;
	return data;
}

export async function reopenPlan(supabase: SupabaseClient, planId: string, reason: string) {
	const { data, error } = await supabase.rpc("reopen_route_plan", {
		p_plan_id: planId,
		p_reason: reason,
	});
	if (error) throw error;
	return data;
}

export async function getHistoryPlans(
	supabase: SupabaseClient,
	options: { date?: string; limit: number },
) {
	let query = supabase
		.from("asp_route_plans")
		.select("*")
		.eq("status", "finalized")
		.order("plan_date", { ascending: false })
		.limit(options.limit);
	if (options.date) query = query.eq("plan_date", options.date);
	const { data, error } = await query;
	if (error) throw error;
	return data;
}
