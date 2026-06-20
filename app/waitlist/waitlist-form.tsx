"use client";

import { useState } from "react";
import { createWaitlistAction, updateWaitlistAction } from "@/app/actions/waitlist";
import { FormField } from "@/app/components/ui/form-field";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

interface WaitlistFormProps {
	entry?: {
		id: string;
		child_name: string;
		date_of_birth: string | null;
		school_name: string | null;
		parent_name: string | null;
		parent_email: string | null;
		parent_phone: string | null;
		intended_days: string[] | null;
		status: string;
	};
	onClose: () => void;
}

export function WaitlistForm({ entry, onClose }: WaitlistFormProps) {
	const isEdit = !!entry;
	const [childName, setChildName] = useState(entry?.child_name ?? "");
	const [dob, setDob] = useState(entry?.date_of_birth ?? "");
	const [schoolName, setSchoolName] = useState(entry?.school_name ?? "");
	const [parentName, setParentName] = useState(entry?.parent_name ?? "");
	const [parentEmail, setParentEmail] = useState(entry?.parent_email ?? "");
	const [parentPhone, setParentPhone] = useState(entry?.parent_phone ?? "");
	const [intendedDays, setIntendedDays] = useState<string[]>(entry?.intended_days ?? []);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);

	const toggleDay = (day: string) => {
		setIntendedDays((prev) =>
			prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setErrors({});

		const data = {
			child_name: childName,
			date_of_birth: dob || null,
			school_name: schoolName || null,
			parent_name: parentName || null,
			parent_email: parentEmail || null,
			parent_phone: parentPhone || null,
			intended_days: intendedDays.length > 0 ? intendedDays : null,
			...(isEdit ? {} : { status: "waiting" as const }),
		};

		const result = isEdit
			? await updateWaitlistAction(entry.id, data)
			: await createWaitlistAction(data);

		setSaving(false);
		if (result.error) {
			setErrors(result.error as Record<string, string[]>);
		} else {
			onClose();
		}
	};

	const inputClass =
		"w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<h3 className="mb-4 text-lg font-semibold">
				{isEdit ? "Edit Waitlist Entry" : "Add to Waitlist"}
			</h3>
			<form onSubmit={handleSubmit}>
				<FormField label="Child Name" required error={errors.child_name}>
					<input
						type="text"
						value={childName}
						onChange={(e) => setChildName(e.target.value)}
						className={inputClass}
					/>
				</FormField>
				<div className="grid grid-cols-2 gap-4">
					<FormField label="Date of Birth" error={errors.date_of_birth}>
						<input
							type="date"
							value={dob}
							onChange={(e) => setDob(e.target.value)}
							className={inputClass}
						/>
					</FormField>
					<FormField label="School" error={errors.school_name}>
						<input
							type="text"
							value={schoolName}
							onChange={(e) => setSchoolName(e.target.value)}
							className={inputClass}
						/>
					</FormField>
				</div>
				<div className="grid grid-cols-3 gap-4">
					<FormField label="Parent Name" error={errors.parent_name}>
						<input
							type="text"
							value={parentName}
							onChange={(e) => setParentName(e.target.value)}
							className={inputClass}
						/>
					</FormField>
					<FormField label="Parent Email" error={errors.parent_email}>
						<input
							type="email"
							value={parentEmail}
							onChange={(e) => setParentEmail(e.target.value)}
							className={inputClass}
						/>
					</FormField>
					<FormField label="Parent Phone" error={errors.parent_phone}>
						<input
							type="tel"
							value={parentPhone}
							onChange={(e) => setParentPhone(e.target.value)}
							className={inputClass}
						/>
					</FormField>
				</div>
				<FormField label="Intended Days">
					<div className="flex gap-3">
						{DAYS.map((day) => (
							<label key={day} className="inline-flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									checked={intendedDays.includes(day)}
									onChange={() => toggleDay(day)}
									className="h-4 w-4 rounded border-gray-300"
								/>
								<span className="text-sm text-gray-700">{day}</span>
							</label>
						))}
					</div>
				</FormField>
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
						{saving ? "Saving..." : isEdit ? "Update" : "Add to Waitlist"}
					</button>
				</div>
			</form>
		</div>
	);
}
