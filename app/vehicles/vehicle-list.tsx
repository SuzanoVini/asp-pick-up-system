"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteVehicleAction } from "@/app/actions/vehicles";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { type Column, DataTable } from "@/app/components/ui/data-table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { VehicleForm } from "./vehicle-form";

interface Vehicle {
	id: string;
	name: string;
	total_seats: number;
	kids_seats: number;
	booster_seats: number;
	license_plate: string | null;
	is_active: boolean;
}

export function VehicleList({ vehicles }: { vehicles: Vehicle[] }) {
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Vehicle | null>(null);
	const [deleting, setDeleting] = useState<Vehicle | null>(null);

	const handleDelete = async () => {
		if (!deleting) return;
		await deleteVehicleAction(deleting.id);
		setDeleting(null);
	};

	const columns: Column<Vehicle>[] = [
		{ key: "name", label: "Name", sortable: true },
		{ key: "total_seats", label: "Total Seats", sortable: true },
		{ key: "kids_seats", label: "Kids Seats", sortable: true },
		{ key: "booster_seats", label: "Booster Seats", sortable: true },
		{ key: "license_plate", label: "Plate", render: (r) => r.license_plate || "-" },
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
			<VehicleForm
				vehicle={editing ?? undefined}
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
					Add Vehicle
				</button>
			</div>
			<DataTable
				data={vehicles as (Vehicle & Record<string, unknown>)[]}
				columns={columns as Column<Vehicle & Record<string, unknown>>[]}
				searchable
				searchKeys={["name", "license_plate"]}
			/>
			<ConfirmDialog
				open={!!deleting}
				title="Delete Vehicle"
				message={`Are you sure you want to delete "${deleting?.name}"?`}
				confirmLabel="Delete"
				destructive
				onConfirm={handleDelete}
				onCancel={() => setDeleting(null)}
			/>
		</div>
	);
}
