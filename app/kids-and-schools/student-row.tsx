"use client";

import { StatusBadge } from "@/app/components/ui/status-badge";

interface StudentRowProps {
	name: string;
	status: string;
	dismissalTime: string | null;
	needsBooster: boolean;
	isOnRoute: boolean;
	isNonStandardDismissal: boolean;
}

export function StudentRow({
	name,
	status,
	dismissalTime,
	needsBooster,
	isOnRoute,
	isNonStandardDismissal,
}: StudentRowProps) {
	return (
		<div
			className={`flex items-center justify-between rounded-md border px-3 py-2 ${
				isOnRoute
					? "border-blue-200 bg-blue-50"
					: "border-gray-100 bg-white"
			}`}
		>
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium text-gray-900">{name}</span>
				{needsBooster && (
					<span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
						Booster
					</span>
				)}
				{isOnRoute && (
					<span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
						On Route
					</span>
				)}
			</div>
			<div className="flex items-center gap-3">
				<span
					className={`text-sm ${
						isNonStandardDismissal
							? "font-medium text-yellow-700"
							: "text-gray-500"
					}`}
				>
					{dismissalTime ?? "-"}
				</span>
				<StatusBadge status={status} type="attendance" />
			</div>
		</div>
	);
}
