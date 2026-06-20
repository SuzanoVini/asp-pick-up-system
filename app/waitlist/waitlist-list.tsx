"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteWaitlistAction, updateWaitlistAction } from "@/app/actions/waitlist";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { type Column, DataTable } from "@/app/components/ui/data-table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { WaitlistForm } from "./waitlist-form";

interface WaitlistEntry {
	id: string;
	child_name: string;
	date_of_birth: string | null;
	school_name: string | null;
	parent_name: string | null;
	parent_email: string | null;
	parent_phone: string | null;
	intended_days: string[] | null;
	waitlisted_on: string;
	status: string;
}

export function WaitlistList({ entries }: { entries: WaitlistEntry[] }) {
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<WaitlistEntry | null>(null);
	const [deleting, setDeleting] = useState<WaitlistEntry | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const filtered =
		statusFilter === "all" ? entries : entries.filter((e) => e.status === statusFilter);

	const handleDelete = async () => {
		if (!deleting) return;
		await deleteWaitlistAction(deleting.id);
		setDeleting(null);
	};

	const handleStatusChange = async (id: string, newStatus: string) => {
		await updateWaitlistAction(id, { status: newStatus });
	};

	const columns: Column<WaitlistEntry>[] = [
		{ key: "child_name", label: "Child", sortable: true },
		{ key: "school_name", label: "School", sortable: true, render: (r) => r.school_name || "-" },
		{ key: "parent_name", label: "Parent", render: (r) => r.parent_name || "-" },
		{
			key: "intended_days",
			label: "Days",
			render: (r) => r.intended_days?.join(", ") || "-",
		},
		{ key: "waitlisted_on", label: "Date Added", sortable: true },
		{
			key: "status",
			label: "Status",
			sortable: true,
			render: (r) => <StatusBadge status={r.status} />,
		},
		{
			key: "actions",
			label: "",
			render: (r) => (
				<div className="flex gap-1">
					{r.status === "waiting" && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleStatusChange(r.id, "offered");
							}}
							className="rounded px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
						>
							Offer
						</button>
					)}
					{r.status === "offered" && (
						<>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleStatusChange(r.id, "enrolled");
								}}
								className="rounded px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100"
							>
								Enroll
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleStatusChange(r.id, "declined");
								}}
								className="rounded px-2 py-1 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
							>
								Decline
							</button>
						</>
					)}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setEditing(r);
							setShowForm(true);
						}}
						className="rounded p-1 text-gray-400 hover:text-gray-600"
						aria-label="Edit"
					>
						<Pencil size={16} />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setDeleting(r);
						}}
						className="rounded p-1 text-gray-400 hover:text-red-600"
						aria-label="Delete"
					>
						<Trash2 size={16} />
					</button>
				</div>
			),
		},
	];

	if (showForm) {
		return (
			<WaitlistForm
				entry={editing ?? undefined}
				onClose={() => {
					setShowForm(false);
					setEditing(null);
				}}
			/>
		);
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex gap-2">
					{["all", "waiting", "offered", "enrolled", "declined"].map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setStatusFilter(f)}
							className={`rounded-md px-3 py-1.5 text-sm font-medium ${statusFilter === f ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
						>
							{f.charAt(0).toUpperCase() + f.slice(1)}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={() => {
						setEditing(null);
						setShowForm(true);
					}}
					className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
				>
					<Plus size={16} /> Add to Waitlist
				</button>
			</div>
			<DataTable
				data={filtered as (WaitlistEntry & Record<string, unknown>)[]}
				columns={columns as Column<WaitlistEntry & Record<string, unknown>>[]}
				searchable
				searchKeys={["child_name", "parent_name"]}
			/>
			<ConfirmDialog
				open={!!deleting}
				title="Delete Waitlist Entry"
				message={`Remove "${deleting?.child_name}" from the waitlist?`}
				confirmLabel="Delete"
				destructive
				onConfirm={handleDelete}
				onCancel={() => setDeleting(null)}
			/>
		</div>
	);
}
