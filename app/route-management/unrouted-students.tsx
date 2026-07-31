"use client";

import { UserX } from "lucide-react";

interface UnroutedStudent {
	id: string;
	name: string;
	schoolName: string;
	needsBooster: boolean;
}

interface UnroutedStudentsProps {
	students: UnroutedStudent[];
}

export function UnroutedStudents({ students }: UnroutedStudentsProps) {
	if (students.length === 0) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-500">
				All routable students assigned
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
			<h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
				<UserX size={14} />
				Unrouted ({students.length})
			</h3>
			<ul className="space-y-1">
				{students.map((s) => (
					<li
						key={s.id}
						className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs"
					>
						<span className="font-medium text-gray-900">{s.name}</span>
						<span className="text-gray-500">{s.schoolName}</span>
						{s.needsBooster && (
							<span className="rounded bg-[#e6d9c7] px-1 text-[10px] font-medium text-[#7a2e0e]">
								Booster
							</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
