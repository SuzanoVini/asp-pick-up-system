"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteSchoolAction } from "@/app/actions/schools";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { type Column, DataTable } from "@/app/components/ui/data-table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { SchoolForm } from "./school-form";

interface School {
	id: string;
	name: string;
	address: string | null;
	standard_dismissal_time: string;
	early_dismissal_time: string;
	status: string;
	student_count?: number;
}

export function SchoolList({ schools }: { schools: School[] }) {
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<School | null>(null);
	const [deleting, setDeleting] = useState<School | null>(null);
	const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

	const filtered = filter === "all" ? schools : schools.filter((s) => s.status === filter);

	const handleDelete = async () => {
		if (!deleting) return;
		await deleteSchoolAction(deleting.id);
		setDeleting(null);
	};

	const columns: Column<School>[] = [
		{ key: "name", label: "Name", sortable: true },
		{ key: "address", label: "Address", sortable: false, render: (r) => r.address || "-" },
		{
			key: "standard_dismissal_time",
			label: "Dismissal",
			sortable: false,
		},
		{
			key: "early_dismissal_time",
			label: "Early Dismissal",
			sortable: false,
		},
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
			<SchoolForm
				school={editing ?? undefined}
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
					{(["all", "active", "inactive"] as const).map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setFilter(f)}
							className={`rounded-md px-3 py-1.5 text-sm font-medium ${
								filter === f
									? "bg-[var(--color-primary)] text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
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
					<Plus size={16} />
					Add School
				</button>
			</div>
			<DataTable
				data={filtered as (School & Record<string, unknown>)[]}
				columns={columns as Column<School & Record<string, unknown>>[]}
				searchable
				searchKeys={["name", "address"]}
			/>
			<ConfirmDialog
				open={!!deleting}
				title="Delete School"
				message={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
				confirmLabel="Delete"
				destructive
				onConfirm={handleDelete}
				onCancel={() => setDeleting(null)}
			/>
		</div>
	);
}
