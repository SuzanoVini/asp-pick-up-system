import type { SupabaseClient } from "@supabase/supabase-js";
import { insertAuditEvent } from "../supabase/audit-events";

export async function writeRouteAuditEvent(
	supabase: SupabaseClient,
	params: {
		entityType: string;
		entityId: string;
		action: "create" | "update" | "delete";
		changes: Record<string, unknown> | null;
		performedBy: string;
	},
) {
	return insertAuditEvent(supabase, {
		entity_type: params.entityType,
		entity_id: params.entityId,
		action: params.action,
		changes: params.changes,
		performed_by: params.performedBy,
	});
}
