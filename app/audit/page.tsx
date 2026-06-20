import { createClient } from "@/app/lib/supabase/server";
import { AuditLogTable } from "./audit-log-table";

interface PageProps {
	searchParams: Promise<{
		entityType?: string;
		action?: string;
		dateFrom?: string;
		dateTo?: string;
	}>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();

	let query = supabase
		.from("asp_audit_events")
		.select("*", { count: "exact" })
		.order("performed_at", { ascending: false })
		.limit(100);

	if (params.entityType) {
		query = query.eq("entity_type", params.entityType);
	}
	if (params.action) {
		query = query.eq("action", params.action);
	}
	if (params.dateFrom) {
		query = query.gte("performed_at", params.dateFrom);
	}
	if (params.dateTo) {
		query = query.lte("performed_at", `${params.dateTo}T23:59:59`);
	}

	const { data: events, count } = await query;

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Audit Log</h1>

			<form className="mb-4 flex flex-wrap items-end gap-3">
				<div>
					<label htmlFor="entityType" className="block text-xs font-medium text-gray-600">
						Entity
					</label>
					<select
						name="entityType"
						id="entityType"
						defaultValue={params.entityType ?? ""}
						className="mt-0.5 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
					>
						<option value="">All</option>
						<option value="student">Student</option>
						<option value="enrollment">Enrollment</option>
						<option value="route">Route</option>
						<option value="route_stop">Route Stop</option>
						<option value="calendar_rule">Calendar Rule</option>
						<option value="school">School</option>
						<option value="vehicle">Vehicle</option>
						<option value="staff">Staff</option>
					</select>
				</div>
				<div>
					<label htmlFor="action" className="block text-xs font-medium text-gray-600">
						Action
					</label>
					<select
						name="action"
						id="action"
						defaultValue={params.action ?? ""}
						className="mt-0.5 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
					>
						<option value="">All</option>
						<option value="create">Create</option>
						<option value="update">Update</option>
						<option value="delete">Delete</option>
					</select>
				</div>
				<div>
					<label htmlFor="dateFrom" className="block text-xs font-medium text-gray-600">
						From
					</label>
					<input
						type="date"
						name="dateFrom"
						id="dateFrom"
						defaultValue={params.dateFrom ?? ""}
						className="mt-0.5 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
					/>
				</div>
				<div>
					<label htmlFor="dateTo" className="block text-xs font-medium text-gray-600">
						To
					</label>
					<input
						type="date"
						name="dateTo"
						id="dateTo"
						defaultValue={params.dateTo ?? ""}
						className="mt-0.5 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
					/>
				</div>
				<button
					type="submit"
					className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
				>
					Filter
				</button>
			</form>

			<AuditLogTable
				events={(events ?? []) as Array<{
					id: string;
					entity_type: string;
					entity_id: string;
					action: string;
					changes: Record<string, unknown> | null;
					performed_by: string;
					performed_at: string;
				}>}
				totalCount={count ?? 0}
			/>
		</div>
	);
}
