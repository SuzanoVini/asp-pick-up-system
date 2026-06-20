import type { SupabaseClient } from "@supabase/supabase-js";

export async function getWaitlist(
	supabase: SupabaseClient,
	filters?: { status?: string },
) {
	let query = supabase
		.from("asp_waitlist")
		.select("*")
		.order("waitlisted_on", { ascending: false });

	if (filters?.status) {
		query = query.eq("status", filters.status);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getWaitlistById(supabase: SupabaseClient, id: string) {
	const { data, error } = await supabase
		.from("asp_waitlist")
		.select("*")
		.eq("id", id)
		.single();

	if (error) throw error;
	return data;
}

export async function createWaitlistEntry(
	supabase: SupabaseClient,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase.from("asp_waitlist").insert(input).select().single();
	if (error) throw error;
	return data;
}

export async function updateWaitlistEntry(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_waitlist")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteWaitlistEntry(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_waitlist").delete().eq("id", id);
	if (error) throw error;
}
