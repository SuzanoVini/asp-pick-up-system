import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCalendarRules(
	supabase: SupabaseClient,
	filters?: { isActive?: boolean; targetType?: string },
) {
	let query = supabase
		.from("asp_calendar_rules")
		.select("*")
		.order("start_date", { ascending: false });

	if (filters?.isActive !== undefined) {
		query = query.eq("is_active", filters.isActive);
	}
	if (filters?.targetType) {
		query = query.eq("target_type", filters.targetType);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getActiveRules(supabase: SupabaseClient) {
	return getCalendarRules(supabase, { isActive: true });
}

export async function getCalendarRuleById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase
		.from("asp_calendar_rules")
		.select("*")
		.eq("id", id)
		.single();

	if (error) throw error;
	return data;
}

export async function createCalendarRule(
	supabase: SupabaseClient,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_calendar_rules")
		.insert(input)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updateCalendarRule(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_calendar_rules")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteCalendarRule(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_calendar_rules").delete().eq("id", id);
	if (error) throw error;
}
