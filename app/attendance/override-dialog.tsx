"use client";

import { useState } from "react";
import { saveManualOverrideAction } from "@/app/actions/attendance";

const STATUSES = [
	{ value: "P", label: "Present" },
	{ value: "A", label: "Absent" },
	{ value: "N", label: "Not Scheduled" },
	{ value: "E", label: "Extra" },
	{ value: "ED", label: "Early Dismissal" },
	{ value: "D", label: "Drop-off" },
] as const;

interface OverrideDialogProps {
	open: boolean;
	studentId: string;
	studentName: string;
	currentStatus: string;
	date: string;
	onClose: () => void;
}

export function OverrideDialog({
	open,
	studentId,
	studentName,
	currentStatus,
	date,
	onClose,
}: OverrideDialogProps) {
	const [status, setStatus] = useState(currentStatus);
	const [dismissalTime, setDismissalTime] = useState("");
	const [saving, setSaving] = useState(false);

	if (!open) return null;

	const handleSave = async () => {
		setSaving(true);
		await saveManualOverrideAction({
			student_id: studentId,
			date,
			status,
			effective_dismissal_time: status === "ED" ? dismissalTime || null : null,
		});
		setSaving(false);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="fixed inset-0 bg-black/50"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape") onClose();
				}}
				aria-label="Close"
			/>
			<div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
				<h3 className="text-lg font-semibold">Override Attendance</h3>
				<p className="mt-1 text-sm text-gray-600">
					{studentName} -- {date}
				</p>

				<div className="mt-4">
					<label htmlFor="override-status" className="mb-1 block text-sm font-medium text-gray-700">
						Status
					</label>
					<select
						id="override-status"
						value={status}
						onChange={(e) => setStatus(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					>
						{STATUSES.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</select>
				</div>

				{status === "ED" && (
					<div className="mt-3">
						<label
							htmlFor="override-dismissal-time"
							className="mb-1 block text-sm font-medium text-gray-700"
						>
							Dismissal Time
						</label>
						<input
							id="override-dismissal-time"
							type="time"
							value={dismissalTime}
							onChange={(e) => setDismissalTime(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
						/>
					</div>
				)}

				<div className="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={saving}
						className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
					>
						{saving ? "Saving..." : "Save Override"}
					</button>
				</div>
			</div>
		</div>
	);
}
