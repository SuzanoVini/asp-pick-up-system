"use client";

import { useState } from "react";
import { createSchoolAction, updateSchoolAction } from "@/app/actions/schools";
import { FormField } from "@/app/components/ui/form-field";

interface SchoolFormProps {
	school?: {
		id: string;
		name: string;
		address: string | null;
		standard_dismissal_time: string;
		early_dismissal_time: string;
		status: string;
	};
	onClose: () => void;
}

export function SchoolForm({ school, onClose }: SchoolFormProps) {
	const isEdit = !!school;
	const [name, setName] = useState(school?.name ?? "");
	const [address, setAddress] = useState(school?.address ?? "");
	const [dismissalTime, setDismissalTime] = useState(school?.standard_dismissal_time ?? "15:00");
	const [edTime, setEdTime] = useState(school?.early_dismissal_time ?? "14:00");
	const [status, setStatus] = useState(school?.status ?? "active");
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setErrors({});

		const data = {
			name,
			address: address || null,
			standard_dismissal_time: dismissalTime,
			early_dismissal_time: edTime,
			status,
		};

		const result = isEdit
			? await updateSchoolAction(school.id, data)
			: await createSchoolAction(data);

		setSaving(false);

		if (result.error) {
			setErrors(result.error as Record<string, string[]>);
		} else {
			onClose();
		}
	};

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<h3 className="mb-4 text-lg font-semibold">{isEdit ? "Edit School" : "Add School"}</h3>
			<form onSubmit={handleSubmit}>
				<FormField label="Name" required error={errors.name}>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
					/>
				</FormField>
				<FormField label="Address" error={errors.address}>
					<textarea
						value={address}
						onChange={(e) => setAddress(e.target.value)}
						rows={2}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
					/>
				</FormField>
				<div className="grid grid-cols-2 gap-4">
					<FormField label="Dismissal Time" error={errors.standard_dismissal_time}>
						<input
							type="time"
							value={dismissalTime}
							onChange={(e) => setDismissalTime(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
						/>
					</FormField>
					<FormField label="Early Dismissal Time" error={errors.early_dismissal_time}>
						<input
							type="time"
							value={edTime}
							onChange={(e) => setEdTime(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
						/>
					</FormField>
				</div>
				{isEdit && (
					<FormField label="Status" error={errors.status}>
						<select
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
						>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
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
