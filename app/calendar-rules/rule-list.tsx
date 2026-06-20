"use client";

import { Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCalendarRuleAction, toggleRuleActiveAction } from "@/app/actions/calendar-rules";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { RuleForm } from "./rule-form";
import { RuleStatusIndicator } from "./rule-status-indicator";

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

interface RuleListProps {
	rules: CalendarRuleRecord[];
	schools: { id: string; name: string }[];
	students: { id: string; name: string }[];
}

export function RuleList({ rules, schools, students }: RuleListProps) {
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<CalendarRuleRecord | null>(null);
	const [deleting, setDeleting] = useState<CalendarRuleRecord | null>(null);
	const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

	const filtered =
		filter === "all"
			? rules
			: filter === "active"
				? rules.filter((r) => r.is_active)
				: rules.filter((r) => !r.is_active);

	const handleToggle = async (rule: CalendarRuleRecord) => {
		await toggleRuleActiveAction(rule.id, !rule.is_active);
	};

	const handleDelete = async () => {
		if (!deleting) return;
		await deleteCalendarRuleAction(deleting.id);
		setDeleting(null);
	};

	if (showForm) {
		return (
			<RuleForm
				rule={editing ?? undefined}
				schools={schools}
				students={students}
				onClose={() => {
					setShowForm(false);
					setEditing(null);
				}}
			/>
		);
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex gap-2">
					{(["all", "active", "inactive"] as const).map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setFilter(f)}
							className={`rounded-md px-3 py-1.5 text-sm font-medium ${
								filter === f
									? "bg-[var(--color-primary)] text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={() => {
						setEditing(null);
						setShowForm(true);
					}}
					className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
				>
					<Plus size={16} />
					Add Rule
				</button>
			</div>

			<div className="space-y-3">
				{filtered.length === 0 && (
					<p className="py-8 text-center text-sm text-gray-500">No rules found.</p>
				)}
				{filtered.map((rule) => (
					<div
						key={rule.id}
						className={`rounded-lg border p-4 ${
							!rule.is_active ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200 bg-white"
						}`}
					>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<span className="font-medium text-gray-900">{rule.rule_type}</span>
									<RuleStatusIndicator
										startDate={rule.start_date}
										endDate={rule.end_date}
										isActive={rule.is_active}
									/>
								</div>
								<div className="mt-1 text-sm text-gray-600">
									<span className="font-medium">Target:</span>{" "}
									{rule.target_type === "all" ? "All schools" : (rule.target_name ?? "-")}
									{rule.target_type !== "all" && (
										<span className="text-gray-400"> ({rule.target_type})</span>
									)}
								</div>
								<div className="mt-1 text-sm text-gray-500">
									{rule.start_date} to {rule.end_date}
									{rule.days_of_week && rule.days_of_week.length > 0 && (
										<span> -- {rule.days_of_week.join(", ")}</span>
									)}
									{rule.switch_from_to && <span> -- {rule.switch_from_to}</span>}
									{rule.start_week && <span> -- Start week: {rule.start_week}</span>}
									{rule.early_dismissal_time && (
										<span> -- ED time: {rule.early_dismissal_time}</span>
									)}
								</div>
								{rule.description && (
									<p className="mt-1 text-sm text-gray-400">{rule.description}</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => handleToggle(rule)}
									className="rounded p-1 text-gray-400 hover:text-gray-600"
									aria-label={rule.is_active ? "Deactivate" : "Activate"}
									title={rule.is_active ? "Deactivate" : "Activate"}
								>
									{rule.is_active ? (
										<ToggleRight size={20} className="text-green-600" />
									) : (
										<ToggleLeft size={20} />
									)}
								</button>
								<button
									type="button"
									onClick={() => {
										setEditing(rule);
										setShowForm(true);
									}}
									className="rounded p-1 text-gray-400 hover:text-gray-600"
									aria-label="Edit"
								>
									<Pencil size={16} />
								</button>
								<button
									type="button"
									onClick={() => setDeleting(rule)}
									className="rounded p-1 text-gray-400 hover:text-red-600"
									aria-label="Delete"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					</div>
				))}
			</div>

			<ConfirmDialog
				open={!!deleting}
				title="Delete Rule"
				message={`Are you sure you want to delete this ${deleting?.rule_type} rule? This action cannot be undone.`}
				confirmLabel="Delete"
				destructive
				onConfirm={handleDelete}
				onCancel={() => setDeleting(null)}
			/>
		</div>
	);
}
