"use client";

import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";

interface WeekControlsProps {
	weekStart: string;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	onSetWeek: () => void;
	weekLabel: string;
}

export function WeekControls({
	weekStart,
	onPrevWeek,
	onNextWeek,
	onSetWeek,
	weekLabel,
}: WeekControlsProps) {
	return (
		<div className="mb-4 flex items-center justify-between">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onPrevWeek}
					className="rounded-md border border-gray-300 p-1.5 hover:bg-gray-50"
				>
					<ChevronLeft size={16} />
				</button>
				<span className="min-w-[200px] text-center text-sm font-medium">
					{weekLabel}
				</span>
				<button
					type="button"
					onClick={onNextWeek}
					className="rounded-md border border-gray-300 p-1.5 hover:bg-gray-50"
				>
					<ChevronRight size={16} />
				</button>
			</div>
			<button
				type="button"
				onClick={onSetWeek}
				className="flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
			>
				<CalendarPlus size={14} />
				Set Week
			</button>
		</div>
	);
}
