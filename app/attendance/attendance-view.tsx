"use client";

import { AlertTriangle, PenLine } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { OverrideDialog } from "./override-dialog";

interface AttendanceRow {
	studentId: string;
	studentName: string;
	schoolName: string;
	status: string;
	effectiveDismissalTime: string | null;
	needsBooster: boolean;
	appliedRules: string[];
	conflicts: { description: string }[];
	isManualOverride: boolean;
}

interface AttendanceViewProps {
	rows: AttendanceRow[];
	date: string;
	ruleNames: Record<string, string>;
}

export function AttendanceView({ rows, date, ruleNames }: AttendanceViewProps) {
	const [overrideTarget, setOverrideTarget] = useState<AttendanceRow | null>(null);
	const [sortBy, setSortBy] = useState<"name" | "school" | "status">("name");

	const sorted = [...rows].sort((a, b) => {
		if (sortBy === "name") return a.studentName.localeCompare(b.studentName);
		if (sortBy === "school") return a.schoolName.localeCompare(b.schoolName);
		return a.status.localeCompare(b.status);
	});

	return (
		<div>
			<div className="mb-4 flex gap-2">
				{(["name", "school", "status"] as const).map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => setSortBy(s)}
						className={`rounded-md px-3 py-1.5 text-sm font-medium ${
							sortBy === s
								? "bg-[var(--color-primary)] text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						Sort by {s}
					</button>
				))}
			</div>

			<div className="overflow-hidden rounded-lg border border-gray-200">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-3 text-left font-medium text-gray-700">Student</th>
							<th className="px-4 py-3 text-left font-medium text-gray-700">School</th>
							<th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
							<th className="px-4 py-3 text-left font-medium text-gray-700">Dismissal</th>
							<th className="px-4 py-3 text-left font-medium text-gray-700">Applied Rules</th>
							<th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{sorted.map((row) => (
							<tr
								key={row.studentId}
								className={`${
									row.isManualOverride ? "bg-amber-50" : ""
								} ${row.conflicts.length > 0 ? "bg-yellow-50" : ""}`}
							>
								<td className="px-4 py-3">
									<div className="flex items-center gap-2">
										<span className="font-medium">{row.studentName}</span>
										{row.needsBooster && (
											<span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
												Booster
											</span>
										)}
										{row.isManualOverride && (
											<span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
												Override
											</span>
										)}
									</div>
								</td>
								<td className="px-4 py-3 text-gray-600">{row.schoolName}</td>
								<td className="px-4 py-3">
									<StatusBadge status={row.status} type="attendance" />
								</td>
								<td className="px-4 py-3 text-gray-600">{row.effectiveDismissalTime ?? "-"}</td>
								<td className="px-4 py-3">
									{row.conflicts.length > 0 ? (
										<div className="flex items-center gap-1 text-yellow-700">
											<AlertTriangle size={14} />
											<span className="text-xs">{row.conflicts[0].description}</span>
										</div>
									) : row.appliedRules.length > 0 ? (
										<span className="text-xs text-gray-500">
											{row.appliedRules.map((id) => ruleNames[id] ?? id.slice(0, 8)).join(", ")}
										</span>
									) : (
										<span className="text-xs text-gray-400">Base schedule</span>
									)}
								</td>
								<td className="px-4 py-3">
									<button
										type="button"
										onClick={() => setOverrideTarget(row)}
										className="rounded p-1 text-gray-400 hover:text-gray-600"
										aria-label="Override status"
										title="Override status"
									>
										<PenLine size={16} />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{sorted.length === 0 && (
				<p className="py-8 text-center text-sm text-gray-500">No students found for this date.</p>
			)}

			{overrideTarget && (
				<OverrideDialog
					open
					studentId={overrideTarget.studentId}
					studentName={overrideTarget.studentName}
					currentStatus={overrideTarget.status}
					date={date}
					onClose={() => setOverrideTarget(null)}
				/>
			)}
		</div>
	);
}
