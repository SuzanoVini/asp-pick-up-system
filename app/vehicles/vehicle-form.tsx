"use client";

import { useState } from "react";
import { createVehicleAction, updateVehicleAction } from "@/app/actions/vehicles";
import { FormField } from "@/app/components/ui/form-field";

interface VehicleFormProps {
	vehicle?: {
		id: string;
		name: string;
		total_seats: number;
		kids_seats: number;
		booster_seats: number;
		license_plate: string | null;
		is_active: boolean;
	};
	onClose: () => void;
}

export function VehicleForm({ vehicle, onClose }: VehicleFormProps) {
	const isEdit = !!vehicle;
	const [name, setName] = useState(vehicle?.name ?? "");
	const [totalSeats, setTotalSeats] = useState(vehicle?.total_seats ?? 8);
	const [kidsSeats, setKidsSeats] = useState(vehicle?.kids_seats ?? 6);
	const [boosterSeats, setBoosterSeats] = useState(vehicle?.booster_seats ?? 2);
	const [plate, setPlate] = useState(vehicle?.license_plate ?? "");
	const [isActive, setIsActive] = useState(vehicle?.is_active ?? true);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setErrors({});

		const data = {
			name,
			total_seats: totalSeats,
			kids_seats: kidsSeats,
			booster_seats: boosterSeats,
			license_plate: plate || null,
			is_active: isActive,
		};

		const result = isEdit
			? await updateVehicleAction(vehicle.id, data)
			: await createVehicleAction(data);

		setSaving(false);
		if (result.error) {
			setErrors(result.error as Record<string, string[]>);
		} else {
			onClose();
		}
	};

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<h3 className="mb-4 text-lg font-semibold">{isEdit ? "Edit Vehicle" : "Add Vehicle"}</h3>
			<form onSubmit={handleSubmit}>
				<FormField label="Name" required error={errors.name}>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
					/>
				</FormField>
				<div className="grid grid-cols-3 gap-4">
					<FormField label="Total Seats" required error={errors.total_seats}>
						<input
							type="number"
							min={1}
							value={totalSeats}
							onChange={(e) => setTotalSeats(Number(e.target.value))}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
						/>
					</FormField>
					<FormField label="Kids Seats" required error={errors.kids_seats}>
						<input
							type="number"
							min={1}
							value={kidsSeats}
							onChange={(e) => setKidsSeats(Number(e.target.value))}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
						/>
					</FormField>
					<FormField label="Booster Seats" error={errors.booster_seats}>
						<input
							type="number"
							min={0}
							value={boosterSeats}
							onChange={(e) => setBoosterSeats(Number(e.target.value))}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
						/>
					</FormField>
				</div>
				<FormField label="License Plate" error={errors.license_plate}>
					<input
						type="text"
						value={plate}
						onChange={(e) => setPlate(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
					/>
				</FormField>
				{isEdit && (
					<FormField label="Active">
						<label className="inline-flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={isActive}
								onChange={(e) => setIsActive(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300"
							/>
							<span className="text-sm text-gray-700">Vehicle is active</span>
						</label>
					</FormField>
				)}
				<div className="mt-4 flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
					>
						{saving ? "Saving..." : isEdit ? "Update" : "Create"}
					</button>
				</div>
			</form>
		</div>
	);
}
