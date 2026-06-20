"use client";

import { useState } from "react";
import { Plus, Pencil, XCircle, CheckCircle } from "lucide-react";
import { DataTable, type Column } from "@/app/components/ui/data-table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { EnrollmentForm } from "./enrollment-form";
import { cancelEnrollmentAction, activateEnrollmentAction } from "@/app/actions/enrollments";

interface Enrollment {
	id: string;
	student_id: string;
	start_date: string;
	end_date: string | null;
	contract_days: string[];
	status: string;
	notes: string | null;
}

interface Props {
	enrollments: Enrollment[];
	students: { id: string; name: string }[];
	studentNames: Record<string, string>;
}

export function EnrollmentList({ enrollments, students, studentNames }: Props) {
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Enrollment | null>(null);
	const [cancelling, setCancelling] = useState<Enrollment | null>(null);
	const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "active" | "cancelled">("all");

	const filtered = statusFilter === "all" ? enrollments : enrollments.filter((e) => e.status === statusFilter);

	const handleCancel = async () => {
		if (!cancelling) return;
		await cancelEnrollmentAction(cancelling.id);
		setCancelling(null);
	};

	const handleActivate = async (id: string) => {
		await activateEnrollmentAction(id);
	};

	const columns: Column<Enrollment>[] = [
		{
			key: "student_id",
			label: "Student",
			sortable: true,
			render: (r) => studentNames[r.student_id] ?? "-",
		},
		{
			key: "contract_days",
			label: "Days",
			render: (r) => r.contract_days.join(", "),
		},
		{ key: "start_date", label: "Start", sortable: true },
		{
			key: "end_date",
			label: "End",
			render: (r) => r.end_date ?? "Ongoing",
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
					{r.status === "pending" && (
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); handleActivate(r.id); }}
							className="rounded p-1 text-green-500 hover:text-green-700"
							title="Activate"
						>
							<CheckCircle size={16} />
						</button>
					)}
					{r.status !== "cancelled" && (
						<>
							<button
								type="button"
								onClick={(e) => { e.stopPropagation(); setEditing(r); setShowForm(true); }}
								className="rounded p-1 text-gray-400 hover:text-gray-600"
								aria-label="Edit"
							>
								<Pencil size={16} />
							</button>
							<button
								type="button"
								onClick={(e) => { e.stopPropagation(); setCancelling(r); }}
								className="rounded p-1 text-gray-400 hover:text-red-600"
								title="Cancel enrollment"
							>
								<XCircle size={16} />
							</button>
						</>
					)}
				</div>
			),
		},
	];

	if (showForm) {
		return <EnrollmentForm enrollment={editing ?? undefined} students={students} onClose={() => { setShowForm(false); setEditing(null); }} />;
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex gap-2">
					{(["all", "pending", "active", "cancelled"] as const).map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setStatusFilter(f)}
							className={`rounded-md px-3 py-1.5 text-sm font-medium ${
								statusFilter === f
									? "bg-[var(--color-primary)] text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							{f.charAt(0).toUpperCase() + f.slice(1)}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={() => { setEditing(null); setShowForm(true); }}
					className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
				>
					<Plus size={16} /> Add Enrollment
				</button>
			</div>
			<DataTable data={filtered as (Enrollment & Record<string, unknown>)[]} columns={columns as Column<Enrollment & Record<string, unknown>>[]} searchable searchKeys={["student_id"]} />
			<ConfirmDialog
				open={!!cancelling}
				title="Cancel Enrollment"
				message="Cancel this enrollment? If this is the student's last active enrollment, they will be marked as a former student."
				confirmLabel="Cancel Enrollment"
				destructive
				onConfirm={handleCancel}
				onCancel={() => setCancelling(null)}
			/>
		</div>
	);
}
