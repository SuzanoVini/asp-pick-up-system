"use client";

import { useState } from "react";
import { FormField } from "@/app/components/ui/form-field";
import { createGuardianAction, updateGuardianAction } from "@/app/actions/guardians";

interface GuardianFormProps {
	guardian?: {
		id: string;
		student_id: string;
		name: string;
		phone: string | null;
		email: string | null;
		is_primary: boolean;
	};
	students: { id: string; name: string }[];
	onClose: () => void;
}

export function GuardianForm({ guardian, students, onClose }: GuardianFormProps) {
	const isEdit = !!guardian;
	const [studentId, setStudentId] = useState(guardian?.student_id ?? "");
	const [name, setName] = useState(guardian?.name ?? "");
	const [phone, setPhone] = useState(guardian?.phone ?? "");
	const [email, setEmail] = useState(guardian?.email ?? "");
	const [isPrimary, setIsPrimary] = useState(guardian?.is_primary ?? true);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setErrors({});

		const data = isEdit
			? { name, phone: phone || null, email: email || null, is_primary: isPrimary }
			: { student_id: studentId, name, phone: phone || null, email: email || null, is_primary: isPrimary };

		const result = isEdit
			? await updateGuardianAction(guardian.id, data)
			: await createGuardianAction(data);

		setSaving(false);
		if (result.error) {
			setErrors(result.error as Record<string, string[]>);
		} else {
			onClose();
		}
	};

	const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<h3 className="mb-4 text-lg font-semibold">{isEdit ? "Edit Guardian" : "Add Guardian"}</h3>
			<form onSubmit={handleSubmit}>
				{!isEdit && (
					<FormField label="Student" required error={errors.student_id}>
						<select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
							<option value="">-- Select Student --</option>
							{students.map((s) => (
								<option key={s.id} value={s.id}>{s.name}</option>
							))}
						</select>
					</FormField>
				)}
				<FormField label="Name" required error={errors.name}>
					<input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
				</FormField>
				<div className="grid grid-cols-2 gap-4">
					<FormField label="Phone" error={errors.phone}>
						<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
					</FormField>
					<FormField label="Email" error={errors.email}>
						<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
					</FormField>
				</div>
				<FormField label="">
					<label className="inline-flex items-center gap-2 cursor-pointer">
						<input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
						<span className="text-sm text-gray-700">Primary guardian</span>
					</label>
				</FormField>
				<div className="mt-4 flex justify-end gap-3">
					<button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
					<button type="submit" disabled={saving} className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
						{saving ? "Saving..." : isEdit ? "Update" : "Create"}
					</button>
				</div>
			</form>
		</div>
	);
}
