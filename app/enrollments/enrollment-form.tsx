"use client";

import { useState } from "react";
import { createEnrollmentAction, updateEnrollmentAction } from "@/app/actions/enrollments";
import { FormField } from "@/app/components/ui/form-field";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

interface EnrollmentFormProps {
	enrollment?: {
		id: string;
		student_id: string;
		start_date: string;
		end_date: string | null;
		contract_days: string[];
		status: string;
		notes: string | null;
	};
	students: { id: string; name: string }[];
	onClose: () => void;
}

export function EnrollmentForm({ enrollment, students, onClose }: EnrollmentFormProps) {
	const isEdit = !!enrollment;
	const [studentId, setStudentId] = useState(enrollment?.student_id ?? "");
	const [startDate, setStartDate] = useState(enrollment?.start_date ?? "");
	const [endDate, setEndDate] = useState(enrollment?.end_date ?? "");
	const [contractDays, setContractDays] = useState<string[]>(enrollment?.contract_days ?? []);
	const [notes, setNotes] = useState(enrollment?.notes ?? "");
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);

	const toggleDay = (day: string) => {
		setContractDays((prev) =>
			prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (contractDays.length === 0) {
			setErrors({ contract_days: ["Select at least one day"] });
			return;
		}
		setSaving(true);
		setErrors({});

		const data = isEdit
			? {
					start_date: startDate,
					end_date: endDate || null,
					contract_days: contractDays,
					notes: notes || null,
				}
			: {
					student_id: studentId,
					start_date: startDate,
					end_date: endDate || null,
					contract_days: contractDays,
					status: "pending" as const,
					notes: notes || null,
				};

		const result = isEdit
			? await updateEnrollmentAction(enrollment.id, data)
			: await createEnrollmentAction(data);

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
				{isEdit ? "Edit Enrollment" : "Add Enrollment"}
			</h3>
			<form onSubmit={handleSubmit}>
				{!isEdit && (
					<FormField label="Student" required error={errors.student_id}>
						<select
							value={studentId}
							onChange={(e) => setStudentId(e.target.value)}
							className={inputClass}
						>
							<option value="">-- Select Student --</option>
							{students.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
					</FormField>
				)}
				<div className="grid grid-cols-2 gap-4">
					<FormField label="Start Date" required error={errors.start_date}>
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className={inputClass}
						/>
					</FormField>
					<FormField label="End Date" error={errors.end_date}>
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							className={inputClass}
						/>
					</FormField>
				</div>
				<FormField label="Contract Days" required error={errors.contract_days}>
					<div className="flex gap-3">
						{DAYS.map((day) => (
							<label key={day} className="inline-flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									checked={contractDays.includes(day)}
									onChange={() => toggleDay(day)}
									className="h-4 w-4 rounded border-gray-300"
								/>
								<span className="text-sm text-gray-700">{day}</span>
							</label>
						))}
					</div>
				</FormField>
				<FormField label="Notes" error={errors.notes}>
					<textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						rows={2}
						className={inputClass}
					/>
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
						{saving ? "Saving..." : isEdit ? "Update" : "Create"}
					</button>
				</div>
			</form>
		</div>
	);
}
