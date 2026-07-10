"use client";

import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface AuditEvent {
	id: string;
	entity_type: string;
	entity_id: string;
	action: string;
	changes: Record<string, unknown> | null;
	performed_by: string;
	performed_at: string;
}

interface AuditLogTableProps {
	events: AuditEvent[];
	totalCount: number;
}

const actionColors: Record<string, string> = {
	create: "bg-green-100 text-green-800",
	update: "bg-blue-100 text-blue-800",
	delete: "bg-red-100 text-red-800",
};

export function AuditLogTable({ events, totalCount }: AuditLogTableProps) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	return (
		<div>
			<p className="mb-3 text-sm text-gray-500">{totalCount} total events</p>
			<div className="overflow-hidden rounded-lg border border-gray-200">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50">
							<th className="w-8 px-2 py-2" />
							<th className="px-3 py-2 text-left font-medium text-gray-700">Time</th>
							<th className="px-3 py-2 text-left font-medium text-gray-700">Action</th>
							<th className="px-3 py-2 text-left font-medium text-gray-700">Entity</th>
							<th className="px-3 py-2 text-left font-medium text-gray-700">Entity ID</th>
						</tr>
					</thead>
					<tbody>
						{events.map((event) => (
							<>
								<tr
									key={event.id}
									className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
									onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
								>
									<td className="px-2 py-2 text-gray-400">
										{expandedId === event.id ? (
											<ChevronDown size={14} />
										) : (
											<ChevronRight size={14} />
										)}
									</td>
									<td className="px-3 py-2 text-gray-600">
										{format(new Date(event.performed_at), "yyyy-MM-dd HH:mm")}
									</td>
									<td className="px-3 py-2">
										<span
											className={`rounded px-1.5 py-0.5 text-xs font-medium ${actionColors[event.action] ?? "bg-gray-100 text-gray-700"}`}
										>
											{event.action}
										</span>
									</td>
									<td className="px-3 py-2 font-medium text-gray-900">{event.entity_type}</td>
									<td className="px-3 py-2 font-mono text-xs text-gray-500">
										{event.entity_id.slice(0, 8)}...
									</td>
								</tr>
								{expandedId === event.id && (
									<tr key={`${event.id}-detail`}>
										<td colSpan={5} className="bg-gray-50 px-6 py-3">
											<pre className="max-h-48 overflow-auto rounded bg-white p-3 text-xs text-gray-700">
												{event.changes
													? JSON.stringify(event.changes, null, 2)
													: "No change details"}
											</pre>
										</td>
									</tr>
								)}
							</>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
