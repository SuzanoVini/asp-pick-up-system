"use client";

import { useState } from "react";
import { Plus, Pencil, Eye } from "lucide-react";
import { differenceInYears } from "date-fns";
import { DataTable, type Column } from "@/app/components/ui/data-table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { StudentForm } from "./student-form";
import { StudentDetail } from "./student-detail";

interface School { id: string; name: string; }

interface Student {
	id: string;
	name: string;
	school_id: string | null;
	date_of_birth: string | null;
	home_address: string | null;
	drop_off_only: boolean;
	dismissal_time: string | null;
	early_dismissal_time: string | null;
	first_pickup_date: string | null;
	status: string;
	comments_pickup: string | null;
	comments_dropoff: string | null;
}

interface Props {
	students: Student[];
	schools: School[];
	guardiansByStudent: Record<string, { id: string; name: string; phone: string | null; email: string | null; is_primary: boolean }[]>;
	enrollmentsByStudent: Record<string, { id: string; start_date: string; end_date: string | null; contract_days: string[]; status: string }[]>;
}

export function StudentList({ students, schools, guardiansByStudent, enrollmentsByStudent }: Props) {
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Student | null>(null);
	const [viewing, setViewing] = useState<Student | null>(null);
	const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "former">("active");
	const [schoolFilter, setSchoolFilter] = useState<string>("all");

	const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

	const filtered = students.filter((s) => {
		if (statusFilter !== "all" && s.status !== statusFilter) return false;
		if (schoolFilter !== "all" && s.school_id !== schoolFilter) return false;
		return true;
	});

	const columns: Column<Student>[] = [
		{ key: "name", label: "Name", sortable: true },
		{
			key: "school_id",
			label: "School",
			sortable: true,
			render: (r) => (r.school_id ? schoolMap.get(r.school_id) ?? "-" : "-"),
		},
		{
			key: "date_of_birth",
			label: "Age",
			render: (r) => {
				if (!r.date_of_birth) return "-";
				const age = differenceInYears(new Date(), new Date(r.date_of_birth));
				return (
					<span>
						{age}
						{age < 9 && (
							<span className="ml-1 inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-800">B</span>
						)}
					</span>
				);
			},
		},
		{
			key: "drop_off_only",
			label: "Type",
			render: (r) => r.drop_off_only ? <StatusBadge status="D" type="attendance" /> : null,
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
						onClick={(e) => { e.stopPropagation(); setViewing(r); }}
						className="rounded p-1 text-gray-400 hover:text-gray-600"
						aria-label="View details"
					>
						<Eye size={16} />
					</button>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); setEditing(r); setShowForm(true); }}
						className="rounded p-1 text-gray-400 hover:text-gray-600"
						aria-label="Edit"
					>
						<Pencil size={16} />
					</button>
				</div>
			),
		},
	];

	if (viewing) {
		return (
			<StudentDetail
				student={viewing}
				school={viewing.school_id ? { name: schoolMap.get(viewing.school_id) ?? "" } : null}
				guardians={guardiansByStudent[viewing.id] ?? []}
				enrollments={enrollmentsByStudent[viewing.id] ?? []}
				onBack={() => setViewing(null)}
			/>
		);
	}

	if (showForm) {
		return <StudentForm student={editing ?? undefined} schools={schools} onClose={() => { setShowForm(false); setEditing(null); }} />;
	}

	return (
		<div>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div className="flex gap-2">
					{(["active", "pending", "former", "all"] as const).map((f) => (
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
					<select
						value={schoolFilter}
						onChange={(e) => setSchoolFilter(e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
					>
						<option value="all">All Schools</option>
						{schools.map((s) => (
							<option key={s.id} value={s.id}>{s.name}</option>
						))}
					</select>
				</div>
				<button
					type="button"
					onClick={() => { setEditing(null); setShowForm(true); }}
					className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
				>
					<Plus size={16} />
					Add Student
				</button>
			</div>
			<DataTable
				data={filtered as (Student & Record<string, unknown>)[]}
				columns={columns as Column<Student & Record<string, unknown>>[]}
				searchable
				searchKeys={["name"]}
			/>
		</div>
	);
}
