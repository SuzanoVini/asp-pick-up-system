"use client";

import { School as SchoolIcon } from "lucide-react";
import { StudentRow } from "./student-row";

interface StudentData {
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

interface SchoolGroupProps {
	schoolName: string;
	students: StudentData[];
}

export function SchoolGroup({ schoolName, students }: SchoolGroupProps) {
	if (students.length === 0) return null;

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<div className="mb-3 flex items-center gap-2">
				<SchoolIcon size={16} className="text-gray-500" />
				<h3 className="font-semibold text-gray-800">{schoolName}</h3>
				<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
					{students.length}
				</span>
			</div>
			<div className="space-y-1.5">
				{students.map((s) => (
					<StudentRow
						key={s.studentId}
						name={s.studentName}
						status={s.status}
						dismissalTime={s.dismissalTime}
						needsBooster={s.needsBooster}
						isOnRoute={s.isOnRoute}
						isNonStandardDismissal={
							s.dismissalTime != null && s.dismissalTime !== s.standardDismissalTime
						}
					/>
				))}
			</div>
		</div>
	);
}
