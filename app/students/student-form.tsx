"use client";

import { useState } from "react";
import { FormField } from "@/app/components/ui/form-field";
import { createStudentAction, updateStudentAction } from "@/app/actions/students";

interface School {
	id: string;
	name: string;
}

interface StudentFormProps {
	student?: {
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
	};
	schools: School[];
	onClose: () => void;
}

export function StudentForm({ student, schools, onClose }: StudentFormProps) {
	const isEdit = !!student;
	const [name, setName] = useState(student?.name ?? "");
	const [schoolId, setSchoolId] = useState(student?.school_id ?? "");
	const [dob, setDob] = useState(student?.date_of_birth ?? "");
	const [homeAddress, setHomeAddress] = useState(student?.home_address ?? "");
	const [dropOffOnly, setDropOffOnly] = useState(student?.drop_off_only ?? false);
	const [dismissalTime, setDismissalTime] = useState(student?.dismissal_time ?? "");
	const [edTime, setEdTime] = useState(student?.early_dismissal_time ?? "");
	const [firstPickup, setFirstPickup] = useState(student?.first_pickup_date ?? "");
	const [status, setStatus] = useState(student?.status ?? "active");
	const [commentsPickup, setCommentsPickup] = useState(student?.comments_pickup ?? "");
	const [commentsDropoff, setCommentsDropoff] = useState(student?.comments_dropoff ?? "");
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setErrors({});

		const data = {
			name,
			school_id: schoolId || null,
			date_of_birth: dob || null,
			home_address: homeAddress || null,
			drop_off_only: dropOffOnly,
			dismissal_time: dismissalTime || null,
			early_dismissal_time: edTime || null,
			first_pickup_date: firstPickup || null,
			status,
			comments_pickup: commentsPickup || null,
			comments_dropoff: commentsDropoff || null,
		};

		const result = isEdit
			? await updateStudentAction(student.id, data)
			: await createStudentAction(data);

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
			<h3 className="mb-4 text-lg font-semibold">{isEdit ? "Edit Student" : "Add Student"}</h3>
			<form onSubmit={handleSubmit}>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField label="Name" required error={errors.name}>
						<input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
					</FormField>
					<FormField label="School" error={errors.school_id}>
						<select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={inputClass}>
							<option value="">-- Select --</option>
							{schools.map((s) => (
								<option key={s.id} value={s.id}>{s.name}</option>
							))}
						</select>
					</FormField>
					<FormField label="Date of Birth" error={errors.date_of_birth}>
						<input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
					</FormField>
					<FormField label="First Pickup Date" error={errors.first_pickup_date}>
						<input type="date" value={firstPickup} onChange={(e) => setFirstPickup(e.target.value)} className={inputClass} />
					</FormField>
					<FormField label="Dismissal Time Override" error={errors.dismissal_time}>
						<input type="time" value={dismissalTime} onChange={(e) => setDismissalTime(e.target.value)} className={inputClass} />
					</FormField>
					<FormField label="Early Dismissal Time Override" error={errors.early_dismissal_time}>
						<input type="time" value={edTime} onChange={(e) => setEdTime(e.target.value)} className={inputClass} />
					</FormField>
				</div>
				<FormField label="Home Address" error={errors.home_address}>
					<textarea value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} rows={2} className={inputClass} />
				</FormField>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField label="Pickup Comments" error={errors.comments_pickup}>
						<textarea value={commentsPickup} onChange={(e) => setCommentsPickup(e.target.value)} rows={2} className={inputClass} />
					</FormField>
					<FormField label="Drop-off Comments" error={errors.comments_dropoff}>
						<textarea value={commentsDropoff} onChange={(e) => setCommentsDropoff(e.target.value)} rows={2} className={inputClass} />
					</FormField>
				</div>
				<div className="mt-2 flex gap-6">
					<FormField label="">
						<label className="inline-flex items-center gap-2 cursor-pointer">
							<input type="checkbox" checked={dropOffOnly} onChange={(e) => setDropOffOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
							<span className="text-sm text-gray-700">Drop-off only</span>
						</label>
					</FormField>
					{isEdit && (
						<FormField label="Status" error={errors.status}>
							<select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
								<option value="active">Active</option>
								<option value="pending">Pending</option>
								<option value="former">Former</option>
							</select>
						</FormField>
					)}
				</div>
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
