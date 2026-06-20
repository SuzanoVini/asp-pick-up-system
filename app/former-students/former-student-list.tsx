"use client";

import { Archive } from "lucide-react";
import { DataTable, type Column } from "@/app/components/ui/data-table";
import { EmptyState } from "@/app/components/ui/empty-state";

interface FormerStudent {
	id: string;
	name: string;
	school_id: string | null;
	date_of_birth: string | null;
	first_pickup_date: string | null;
}

interface Props {
	students: FormerStudent[];
	schoolNames: Record<string, string>;
}

export function FormerStudentList({ students, schoolNames }: Props) {
	if (students.length === 0) {
		return (
			<EmptyState
				icon={<Archive size={40} />}
				title="No former students"
				description="Students moved to former status will appear here."
			/>
		);
	}

	const columns: Column<FormerStudent>[] = [
		{ key: "name", label: "Name", sortable: true },
		{
			key: "school_id",
			label: "School",
			sortable: true,
			render: (r) => (r.school_id ? schoolNames[r.school_id] ?? "-" : "-"),
		},
		{
			key: "date_of_birth",
			label: "Date of Birth",
			render: (r) => r.date_of_birth ?? "-",
		},
		{
			key: "first_pickup_date",
			label: "First Pickup",
			render: (r) => r.first_pickup_date ?? "-",
		},
	];

	return (
		<DataTable
			data={students as (FormerStudent & Record<string, unknown>)[]}
			columns={columns as Column<FormerStudent & Record<string, unknown>>[]}
			searchable
			searchKeys={["name"]}
			emptyMessage="No former students found."
		/>
	);
}
