"use client";

import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { useState, useTransition } from "react";
import { bulkSetWeek, toggleAvailability } from "@/app/actions/staff-schedule";
import { WeekControls } from "./week-controls";

interface StaffMember {
	id: string;
	name: string;
	capabilities: string[];
	is_active: boolean;
}

interface AvailabilityEntry {
	staff_id: string;
	date: string;
	is_available: boolean;
}

interface AssignmentEntry {
	staff_id: string;
	date: string;
	role: string;
	asp_vehicles?: { name: string } | null;
}

interface StaffScheduleGridProps {
	staff: StaffMember[];
	initialAvailability: AvailabilityEntry[];
	initialAssignments: AssignmentEntry[];
	initialWeekStart: string;
}

function getWeekDates(weekStart: string): string[] {
	const start = startOfWeek(parseISO(weekStart), { weekStartsOn: 1 });
	return Array.from({ length: 5 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
}

export function StaffScheduleGrid({
	staff,
	initialAvailability,
	initialAssignments,
	initialWeekStart,
}: StaffScheduleGridProps) {
	const [weekStart, setWeekStart] = useState(initialWeekStart);
	const [isPending, startTransition] = useTransition();
	const weekDates = getWeekDates(weekStart);
	const dayLabels = weekDates.map((d) => format(parseISO(d), "EEE MM/dd"));

	const availMap = new Map<string, boolean>();
	for (const a of initialAvailability) {
		availMap.set(`${a.staff_id}-${a.date}`, a.is_available);
	}

	const assignMap = new Map<string, AssignmentEntry>();
	for (const a of initialAssignments) {
		assignMap.set(`${a.staff_id}-${a.date}`, a);
	}

	const activeStaff = staff.filter((s) => s.is_active);

	function handleToggle(staffId: string, date: string) {
		const key = `${staffId}-${date}`;
		const current = availMap.get(key) ?? false;
		startTransition(() => {
			toggleAvailability(staffId, date, !current);
		});
	}

	function handleSetWeek() {
		const staffIds = activeStaff.map((s) => s.id);
		startTransition(() => {
			bulkSetWeek(staffIds, weekDates, true);
		});
	}

	function handlePrevWeek() {
		const prev = format(addDays(parseISO(weekStart), -7), "yyyy-MM-dd");
		setWeekStart(prev);
	}

	function handleNextWeek() {
		const next = format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd");
		setWeekStart(next);
	}

	const weekLabel = `${format(parseISO(weekDates[0]), "MMM d")} - ${format(parseISO(weekDates[4]), "MMM d, yyyy")}`;

	return (
		<div>
			<WeekControls
				onPrevWeek={handlePrevWeek}
				onNextWeek={handleNextWeek}
				onSetWeek={handleSetWeek}
				weekLabel={weekLabel}
			/>

			<div className="overflow-x-auto rounded-lg border border-gray-200">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50">
							<th className="px-3 py-2 text-left font-medium text-gray-700">Staff</th>
							<th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Role</th>
							{dayLabels.map((label, i) => (
								<th key={weekDates[i]} className="px-2 py-2 text-center font-medium text-gray-700">
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{activeStaff.map((s) => (
							<tr key={s.id} className="border-b border-gray-100">
								<td className="px-3 py-2 font-medium text-gray-900">{s.name}</td>
								<td className="px-1 py-2 text-center text-xs text-gray-500">
									{s.capabilities.join("/")}
								</td>
								{weekDates.map((date) => {
									const key = `${s.id}-${date}`;
									const available = availMap.get(key) ?? false;
									const assignment = assignMap.get(key);

									return (
										<td key={date} className="px-2 py-1 text-center">
											<button
												type="button"
												onClick={() => handleToggle(s.id, date)}
												disabled={isPending}
												className={`inline-block w-full rounded px-2 py-1 text-xs font-medium transition ${
													available
														? "bg-green-100 text-green-800 hover:bg-green-200"
														: "bg-gray-100 text-gray-400 hover:bg-gray-200"
												}`}
											>
												{available ? "Available" : "Off"}
											</button>
											{assignment && (
												<div className="mt-0.5 text-[10px] text-blue-600">
													{assignment.role} - {assignment.asp_vehicles?.name ?? ""}
												</div>
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
