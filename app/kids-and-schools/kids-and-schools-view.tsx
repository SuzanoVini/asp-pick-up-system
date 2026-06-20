"use client";

import { CalendarOff, Users, UserX } from "lucide-react";
import { useState } from "react";
import { SchoolGroup } from "./school-group";

interface SectionedStudent {
	studentId: string;
	studentName: string;
	schoolName: string;
	schoolId: string;
	status: string;
	dismissalTime: string | null;
	needsBooster: boolean;
	isOnRoute: boolean;
	isDropOffOnly: boolean;
	standardDismissalTime: string;
}

interface KidsAndSchoolsViewProps {
	present: SectionedStudent[];
	dropOff: SectionedStudent[];
	absent: SectionedStudent[];
	notScheduled: SectionedStudent[];
}

function groupBySchool(students: SectionedStudent[]): Record<string, SectionedStudent[]> {
	const groups: Record<string, SectionedStudent[]> = {};
	for (const s of students) {
		if (!groups[s.schoolName]) groups[s.schoolName] = [];
		groups[s.schoolName]?.push(s);
	}
	return groups;
}

function sortStudents(students: SectionedStudent[], by: "name" | "school"): SectionedStudent[] {
	return [...students].sort((a, b) =>
		by === "name"
			? a.studentName.localeCompare(b.studentName)
			: a.schoolName.localeCompare(b.schoolName) || a.studentName.localeCompare(b.studentName),
	);
}

export function KidsAndSchoolsView({
	present,
	dropOff,
	absent,
	notScheduled,
}: KidsAndSchoolsViewProps) {
	const [sortBy, setSortBy] = useState<"school" | "name">("school");

	const sortedPresent = sortStudents(present, sortBy);
	const sortedDropOff = sortStudents(dropOff, sortBy);
	const sortedAbsent = sortStudents(absent, sortBy);

	const presentBySchool = groupBySchool(sortedPresent);
	const dropOffBySchool = groupBySchool(sortedDropOff);

	const unrouted = present.filter((s) => !s.isOnRoute);

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex gap-4 text-sm text-gray-600">
					<span>Present: {present.length}</span>
					<span>Drop-off: {dropOff.length}</span>
					<span>Absent: {absent.length}</span>
					<span>Not Scheduled: {notScheduled.length}</span>
					{unrouted.length > 0 && (
						<span className="font-medium text-red-600">Unrouted: {unrouted.length}</span>
					)}
				</div>
				<div className="flex gap-2">
					{(["school", "name"] as const).map((s) => (
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
							By {s}
						</button>
					))}
				</div>
			</div>

			{/* Present Section */}
			{present.length > 0 && (
				<div className="mb-6">
					<div className="mb-3 flex items-center gap-2">
						<Users size={18} className="text-green-600" />
						<h2 className="text-lg font-semibold text-gray-800">Present ({present.length})</h2>
					</div>
					<div className="space-y-3">
						{Object.entries(presentBySchool)
							.sort(([a], [b]) => a.localeCompare(b))
							.map(([schoolName, students]) => (
								<SchoolGroup key={schoolName} schoolName={schoolName} students={students} />
							))}
					</div>
				</div>
			)}

			{/* Drop-off Only Section */}
			{dropOff.length > 0 && (
				<div className="mb-6">
					<div className="mb-3 flex items-center gap-2">
						<Users size={18} className="text-gray-500" />
						<h2 className="text-lg font-semibold text-gray-800">
							Drop-off Only ({dropOff.length})
						</h2>
					</div>
					<div className="space-y-3">
						{Object.entries(dropOffBySchool)
							.sort(([a], [b]) => a.localeCompare(b))
							.map(([schoolName, students]) => (
								<SchoolGroup key={schoolName} schoolName={schoolName} students={students} />
							))}
					</div>
				</div>
			)}

			{/* Absent Section */}
			{absent.length > 0 && (
				<div className="mb-6">
					<div className="mb-3 flex items-center gap-2">
						<UserX size={18} className="text-red-500" />
						<h2 className="text-lg font-semibold text-gray-800">Absent ({absent.length})</h2>
					</div>
					<div className="rounded-lg border border-gray-200 bg-white p-4">
						<div className="space-y-1">
							{sortedAbsent.map((s) => (
								<div
									key={s.studentId}
									className="flex items-center justify-between text-sm text-red-700"
								>
									<span>{s.studentName}</span>
									<span className="text-gray-500">{s.schoolName}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Not Scheduled Section */}
			{notScheduled.length > 0 && (
				<div className="mb-6">
					<div className="mb-3 flex items-center gap-2">
						<CalendarOff size={18} className="text-blue-500" />
						<h2 className="text-lg font-semibold text-gray-800">
							Not Scheduled ({notScheduled.length})
						</h2>
					</div>
					<div className="rounded-lg border border-gray-200 bg-white p-4">
						<div className="space-y-1">
							{notScheduled
								.sort((a, b) => a.studentName.localeCompare(b.studentName))
								.map((s) => (
									<div
										key={s.studentId}
										className="flex items-center justify-between text-sm text-blue-700"
									>
										<span>{s.studentName}</span>
										<span className="text-gray-500">{s.schoolName}</span>
									</div>
								))}
						</div>
					</div>
				</div>
			)}

			{present.length === 0 &&
				dropOff.length === 0 &&
				absent.length === 0 &&
				notScheduled.length === 0 && (
					<p className="py-8 text-center text-sm text-gray-500">No students found for this date.</p>
				)}
		</div>
	);
}
