"use client";

import { GripVertical, Clock, MapPin } from "lucide-react";
import type { RouteStop } from "@/app/lib/routes/types";

interface RouteStopCardProps {
	stop: RouteStop;
	isDragging?: boolean;
}

export function RouteStopCard({ stop, isDragging }: RouteStopCardProps) {
	return (
		<div
			className={`flex items-center gap-2 px-4 py-2 ${
				isDragging ? "opacity-50 bg-blue-50" : ""
			}`}
		>
			<GripVertical
				size={14}
				className="shrink-0 cursor-grab text-gray-300"
			/>
			<span className="w-5 shrink-0 text-center text-xs font-medium text-gray-400">
				{stop.orderIndex}
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<span className="truncate text-sm font-medium text-gray-900">
						{stop.studentNameSnapshot}
					</span>
					{stop.needsBooster && (
						<span className="shrink-0 rounded bg-purple-100 px-1 text-[10px] font-medium text-purple-700">
							B
						</span>
					)}
				</div>
				<div className="flex items-center gap-2 text-[11px] text-gray-500">
					<span className="flex items-center gap-0.5">
						<MapPin size={9} />
						{stop.schoolNameSnapshot}
					</span>
					{stop.dismissalTimeSnapshot && (
						<span className="flex items-center gap-0.5">
							<Clock size={9} />
							{stop.dismissalTimeSnapshot}
						</span>
					)}
					{stop.distanceFromPrevKm !== null && (
						<span>{stop.distanceFromPrevKm} km</span>
					)}
				</div>
			</div>
			<span className="shrink-0 text-xs text-gray-400">
				Seat {stop.seatNumber}
			</span>
		</div>
	);
}
