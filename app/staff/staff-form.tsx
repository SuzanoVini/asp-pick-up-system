"use client";

import { useState } from "react";
import { FormField } from "@/app/components/ui/form-field";
import { createStaffAction, updateStaffAction } from "@/app/actions/staff";

interface StaffFormProps {
	staff?: {
		id: string;
		name: string;
		capabilities: string[];
		is_active: boolean;
	};
	onClose: () => void;
}

export function StaffForm({ staff, onClose }: StaffFormProps) {
	const isEdit = !!staff;
	const [name, setName] = useState(staff?.name ?? "");
	const [capabilities, setCapabilities] = useState<string[]>(staff?.capabilities ?? ["driver"]);
	const [isActive, setIsActive] = useState(staff?.is_active ?? true);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);

	const toggleCap = (cap: string) => {
		setCapabilities((prev) =>
			prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (capabilities.length === 0) {
			setErrors({ capabilities: ["At least one capability is required"] });
			return;
		}
		setSaving(true);
		setErrors({});

		const data = { name, capabilities, is_active: isActive };
		const result = isEdit
			? await updateStaffAction(staff.id, data)
			: await createStaffAction(data);

		setSaving(false);
		if (result.error) {
			setErrors(result.error as Record<string, string[]>);
		} else {
			onClose();
		}
	};

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<h3 className="mb-4 text-lg font-semibold">{isEdit ? "Edit Staff" : "Add Staff"}</h3>
			<form onSubmit={handleSubmit}>
				<FormField label="Name" required error={errors.name}>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
					/>
				</FormField>
				<FormField label="Capabilities" required error={errors.capabilities}>
					<div className="flex gap-4">
						{["driver", "helper"].map((cap) => (
							<label key={cap} className="inline-flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={capabilities.includes(cap)}
									onChange={() => toggleCap(cap)}
									className="h-4 w-4 rounded border-gray-300"
								/>
								<span className="text-sm capitalize text-gray-700">{cap}</span>
							</label>
						))}
					</div>
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
							<span className="text-sm text-gray-700">Staff member is active</span>
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
