"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/app/components/ui/data-table";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { GuardianForm } from "./guardian-form";
import { deleteGuardianAction } from "@/app/actions/guardians";

interface Guardian {
	id: string;
	student_id: string;
	name: string;
	phone: string | null;
	email: string | null;
	is_primary: boolean;
}

interface Props {
	guardians: Guardian[];
	students: { id: string; name: string }[];
	studentNames: Record<string, string>;
}

export function GuardianList({ guardians, students, studentNames }: Props) {
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Guardian | null>(null);
	const [deleting, setDeleting] = useState<Guardian | null>(null);

	const handleDelete = async () => {
		if (!deleting) return;
		await deleteGuardianAction(deleting.id);
		setDeleting(null);
	};

	const columns: Column<Guardian>[] = [
		{ key: "name", label: "Name", sortable: true },
		{
			key: "student_id",
			label: "Student",
			sortable: true,
			render: (r) => studentNames[r.student_id] ?? "-",
		},
		{ key: "phone", label: "Phone", render: (r) => r.phone || "-" },
		{ key: "email", label: "Email", render: (r) => r.email || "-" },
		{
			key: "is_primary",
			label: "Primary",
			render: (r) => r.is_primary ? (
				<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Yes</span>
			) : (
				<span className="text-xs text-gray-400">No</span>
			),
		},
		{
			key: "actions",
			label: "",
			render: (r) => (
				<div className="flex gap-2">
					<button type="button" onClick={(e) => { e.stopPropagation(); setEditing(r); setShowForm(true); }} className="rounded p-1 text-gray-400 hover:text-gray-600" aria-label="Edit"><Pencil size={16} /></button>
					<button type="button" onClick={(e) => { e.stopPropagation(); setDeleting(r); }} className="rounded p-1 text-gray-400 hover:text-red-600" aria-label="Delete"><Trash2 size={16} /></button>
				</div>
			),
		},
	];

	if (showForm) {
		return <GuardianForm guardian={editing ?? undefined} students={students} onClose={() => { setShowForm(false); setEditing(null); }} />;
	}

	return (
		<div>
			<div className="mb-4 flex justify-end">
				<button type="button" onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
					<Plus size={16} /> Add Guardian
				</button>
			</div>
			<DataTable data={guardians as (Guardian & Record<string, unknown>)[]} columns={columns as Column<Guardian & Record<string, unknown>>[]} searchable searchKeys={["name"]} />
			<ConfirmDialog open={!!deleting} title="Delete Guardian" message={`Are you sure you want to delete "${deleting?.name}"?`} confirmLabel="Delete" destructive onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
		</div>
	);
}
