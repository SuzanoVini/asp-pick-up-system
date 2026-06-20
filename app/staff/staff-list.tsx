"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteStaffAction } from "@/app/actions/staff";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { type Column, DataTable } from "@/app/components/ui/data-table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { StaffForm } from "./staff-form";

interface Staff {
	id: string;
	name: string;
	capabilities: string[];
	is_active: boolean;
}

export function StaffList({ staffMembers }: { staffMembers: Staff[] }) {
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Staff | null>(null);
	const [deleting, setDeleting] = useState<Staff | null>(null);

	const handleDelete = async () => {
		if (!deleting) return;
		await deleteStaffAction(deleting.id);
		setDeleting(null);
	};

	const columns: Column<Staff>[] = [
		{ key: "name", label: "Name", sortable: true },
		{
			key: "capabilities",
			label: "Capabilities",
			render: (r) => (
				<div className="flex gap-1">
					{r.capabilities.map((c) => (
						<span
							key={c}
							className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-800"
						>
							{c}
						</span>
					))}
				</div>
			),
		},
		{
			key: "is_active",
			label: "Status",
			render: (r) => <StatusBadge status={r.is_active ? "active" : "inactive"} />,
		},
		{
			key: "actions",
			label: "",
			render: (r) => (
				<div className="flex gap-2">
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
			<StaffForm
				staff={editing ?? undefined}
				onClose={() => {
					setShowForm(false);
					setEditing(null);
				}}
			/>
		);
	}

	return (
		<div>
			<div className="mb-4 flex justify-end">
				<button
					type="button"
					onClick={() => {
						setEditing(null);
						setShowForm(true);
					}}
					className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
				>
					<Plus size={16} />
					Add Staff
				</button>
			</div>
			<DataTable
				data={staffMembers as (Staff & Record<string, unknown>)[]}
				columns={columns as Column<Staff & Record<string, unknown>>[]}
				searchable
				searchKeys={["name"]}
			/>
			<ConfirmDialog
				open={!!deleting}
				title="Delete Staff Member"
				message={`Are you sure you want to delete "${deleting?.name}"?`}
				confirmLabel="Delete"
				destructive
				onConfirm={handleDelete}
				onCancel={() => setDeleting(null)}
			/>
		</div>
	);
}
