"use client";

import { useState } from "react";
import { FormField } from "@/app/components/ui/form-field";
import {
	createCalendarRuleAction,
	updateCalendarRuleAction,
} from "@/app/actions/calendar-rules";

const RULE_TYPES = [
	"District-Wide Break",
	"District Pro-D Day",
	"School-Specific Holiday",
	"School Pro-D Day",
	"Early Dismissal",
	"Student Temporary Absence",
	"Attends Every Other Week",
	"Temporary Day Switch",
	"Extra Pickup Day",
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

interface CalendarRuleRecord {
	id: string;
	rule_type: string;
	target_type: string;
	target_student_id: string | null;
	target_school_id: string | null;
	target_name: string | null;
	start_date: string;
	end_date: string;
	days_of_week: string[] | null;
	switch_from_to: string | null;
	description: string | null;
	start_week: string | null;
	early_dismissal_time: string | null;
	is_active: boolean;
}

interface RuleFormProps {
	rule?: CalendarRuleRecord;
	schools: { id: string; name: string }[];
	students: { id: string; name: string }[];
	onClose: () => void;
}

function getTargetTypeForRuleType(ruleType: string): string {
	if (ruleType === "District-Wide Break" || ruleType === "District Pro-D Day") return "all";
	if (ruleType === "School-Specific Holiday" || ruleType === "School Pro-D Day") return "school";
	if (ruleType === "Early Dismissal") return "school";
	return "student";
}

function needsSchoolTarget(ruleType: string, targetType: string): boolean {
	return targetType === "school";
}

function needsStudentTarget(ruleType: string, targetType: string): boolean {
	return targetType === "student";
}

function needsDaysOfWeek(ruleType: string): boolean {
	return ruleType !== "Temporary Day Switch";
}

function needsSwitchFromTo(ruleType: string): boolean {
	return ruleType === "Temporary Day Switch";
}

function needsStartWeek(ruleType: string): boolean {
	return ruleType === "Attends Every Other Week";
}

function needsEarlyDismissalTime(ruleType: string): boolean {
	return ruleType === "Early Dismissal";
}

export function RuleForm({ rule, schools, students, onClose }: RuleFormProps) {
	const isEditing = !!rule;
	const [ruleType, setRuleType] = useState(rule?.rule_type ?? "District-Wide Break");
	const [targetType, setTargetType] = useState(rule?.target_type ?? getTargetTypeForRuleType(ruleType));
	const [targetSchoolId, setTargetSchoolId] = useState(rule?.target_school_id ?? "");
	const [targetStudentId, setTargetStudentId] = useState(rule?.target_student_id ?? "");
	const [startDate, setStartDate] = useState(rule?.start_date ?? "");
	const [endDate, setEndDate] = useState(rule?.end_date ?? "");
	const [daysOfWeek, setDaysOfWeek] = useState<string[]>(rule?.days_of_week ?? []);
	const [switchFromTo, setSwitchFromTo] = useState(rule?.switch_from_to ?? "");
	const [description, setDescription] = useState(rule?.description ?? "");
	const [startWeek, setStartWeek] = useState(rule?.start_week ?? "");
	const [earlyDismissalTime, setEarlyDismissalTime] = useState(rule?.early_dismissal_time ?? "");
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);

	const handleRuleTypeChange = (newType: string) => {
		setRuleType(newType);
		const defaultTarget = getTargetTypeForRuleType(newType);
		setTargetType(defaultTarget);
		if (defaultTarget === "all") {
			setTargetSchoolId("");
			setTargetStudentId("");
		}
	};

	const toggleDay = (day: string) => {
		setDaysOfWeek((prev) =>
			prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setErrors({});

		const targetName =
			targetType === "all"
				? "ALL"
				: targetType === "school"
					? schools.find((s) => s.id === targetSchoolId)?.name ?? ""
					: students.find((s) => s.id === targetStudentId)?.name ?? "";

		const formData: Record<string, unknown> = {
			rule_type: ruleType,
			target_type: targetType,
			target_school_id: targetType === "school" ? targetSchoolId || null : null,
			target_student_id: targetType === "student" ? targetStudentId || null : null,
			target_name: targetName,
			start_date: startDate,
			end_date: endDate,
			days_of_week: needsDaysOfWeek(ruleType) ? daysOfWeek : null,
			switch_from_to: needsSwitchFromTo(ruleType) ? switchFromTo || null : null,
			description: description || null,
			start_week: needsStartWeek(ruleType) ? startWeek || null : null,
			early_dismissal_time: needsEarlyDismissalTime(ruleType) ? earlyDismissalTime || null : null,
			is_active: true,
		};

		const result = isEditing
			? await updateCalendarRuleAction(rule.id, formData)
			: await createCalendarRuleAction(formData);

		if (result?.error) {
			setErrors(result.error as Record<string, string[]>);
			setSaving(false);
			return;
		}

		onClose();
	};

	return (
		<form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{isEditing ? "Edit Rule" : "New Rule"}</h2>
				<button
					type="button"
					onClick={onClose}
					className="text-sm text-gray-500 hover:text-gray-700"
				>
					Cancel
				</button>
			</div>

			<FormField label="Rule Type" error={errors.rule_type?.[0]}>
				<select
					value={ruleType}
					onChange={(e) => handleRuleTypeChange(e.target.value)}
					className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
				>
					{RULE_TYPES.map((rt) => (
						<option key={rt} value={rt}>{rt}</option>
					))}
				</select>
			</FormField>

			{targetType !== "all" && (
				<FormField label="Target Type" error={errors.target_type?.[0]}>
					<select
						value={targetType}
						onChange={(e) => setTargetType(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					>
						<option value="school">School</option>
						<option value="student">Student</option>
					</select>
				</FormField>
			)}

			{needsSchoolTarget(ruleType, targetType) && (
				<FormField label="School" error={errors.target_school_id?.[0]}>
					<select
						value={targetSchoolId}
						onChange={(e) => setTargetSchoolId(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					>
						<option value="">Select school...</option>
						{schools.map((s) => (
							<option key={s.id} value={s.id}>{s.name}</option>
						))}
					</select>
				</FormField>
			)}

			{needsStudentTarget(ruleType, targetType) && (
				<FormField label="Student" error={errors.target_student_id?.[0]}>
					<select
						value={targetStudentId}
						onChange={(e) => setTargetStudentId(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					>
						<option value="">Select student...</option>
						{students.map((s) => (
							<option key={s.id} value={s.id}>{s.name}</option>
						))}
					</select>
				</FormField>
			)}

			<div className="grid grid-cols-2 gap-4">
				<FormField label="Start Date" error={errors.start_date?.[0]}>
					<input
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					/>
				</FormField>
				<FormField label="End Date" error={errors.end_date?.[0]}>
					<input
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					/>
				</FormField>
			</div>

			{needsDaysOfWeek(ruleType) && (
				<FormField label="Days of Week" error={errors.days_of_week?.[0]}>
					<div className="flex gap-2">
						{DAYS.map((day) => (
							<button
								key={day}
								type="button"
								onClick={() => toggleDay(day)}
								className={`rounded-md px-3 py-1.5 text-sm font-medium ${
									daysOfWeek.includes(day)
										? "bg-[var(--color-primary)] text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								{day}
							</button>
						))}
					</div>
				</FormField>
			)}

			{needsSwitchFromTo(ruleType) && (
				<FormField label="Switch From > To (e.g. Mon>Wed)" error={errors.switch_from_to?.[0]}>
					<input
						type="text"
						value={switchFromTo}
						onChange={(e) => setSwitchFromTo(e.target.value)}
						placeholder="Mon>Wed"
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					/>
				</FormField>
			)}

			{needsStartWeek(ruleType) && (
				<FormField label="Start Week" error={errors.start_week?.[0]}>
					<select
						value={startWeek}
						onChange={(e) => setStartWeek(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					>
						<option value="">Select...</option>
						<option value="Absent">Absent</option>
						<option value="Present">Present</option>
					</select>
				</FormField>
			)}

			{needsEarlyDismissalTime(ruleType) && (
				<FormField label="Early Dismissal Time" error={errors.early_dismissal_time?.[0]}>
					<input
						type="time"
						value={earlyDismissalTime}
						onChange={(e) => setEarlyDismissalTime(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					/>
				</FormField>
			)}

			<FormField label="Description" error={errors.description?.[0]}>
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={2}
					className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					placeholder="Optional notes about this rule"
				/>
			</FormField>

			<div className="flex justify-end gap-3 pt-2">
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
					{saving ? "Saving..." : isEditing ? "Update Rule" : "Create Rule"}
				</button>
			</div>
		</form>
	);
}
