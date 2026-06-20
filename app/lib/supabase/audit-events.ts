import type { SupabaseClient } from "@supabase/supabase-js";

export async function insertAuditEvent(
	supabase: SupabaseClient,
	input: {
		entity_type: string;
		entity_id: string;
		action: "create" | "update" | "delete";
		changes: Record<string, unknown> | null;
		performed_by: string;
	},
) {
	const { data, error } = await supabase
		.from("asp_audit_events")
		.insert({
			...input,
			performed_at: new Date().toISOString(),
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function getAuditEvents(
	supabase: SupabaseClient,
	filters?: {
		entityType?: string;
		entityId?: string;
		action?: string;
		dateFrom?: string;
		dateTo?: string;
		limit?: number;
		offset?: number;
	},
) {
	let query = supabase
		.from("asp_audit_events")
		.select("*", { count: "exact" })
		.order("performed_at", { ascending: false });

	if (filters?.entityType) {
		query = query.eq("entity_type", filters.entityType);
	}
	if (filters?.entityId) {
		query = query.eq("entity_id", filters.entityId);
	}
	if (filters?.action) {
		query = query.eq("action", filters.action);
	}
	if (filters?.dateFrom) {
		query = query.gte("performed_at", filters.dateFrom);
	}
	if (filters?.dateTo) {
		query = query.lte("performed_at", filters.dateTo);
	}

	const limit = filters?.limit ?? 50;
	const offset = filters?.offset ?? 0;
	query = query.range(offset, offset + limit - 1);

	const { data, error, count } = await query;
	if (error) throw error;
	return { data, count };
}
