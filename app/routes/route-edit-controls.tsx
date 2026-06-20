"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { reorderStops, removeStudentFromRoute } from "@/app/actions/route-editor";

interface RouteEditControlsProps {
	stopId: string;
	routeId: string;
	currentIndex: number;
	totalStops: number;
	allStopIds: Array<{ id: string; orderIndex: number; seatNumber: number }>;
}

export function RouteEditControls({
	stopId,
	routeId,
	currentIndex,
	totalStops,
	allStopIds,
}: RouteEditControlsProps) {
	const [isPending, startTransition] = useTransition();

	function handleMoveUp() {
		if (currentIndex <= 1) return;
		const reordered = allStopIds.map((s) => {
			if (s.orderIndex === currentIndex)
				return { ...s, orderIndex: currentIndex - 1, seatNumber: currentIndex - 1 };
			if (s.orderIndex === currentIndex - 1)
				return { ...s, orderIndex: currentIndex, seatNumber: currentIndex };
			return s;
		});
		startTransition(() => {
			reorderStops(routeId, reordered);
		});
	}

	function handleMoveDown() {
		if (currentIndex >= totalStops) return;
		const reordered = allStopIds.map((s) => {
			if (s.orderIndex === currentIndex)
				return { ...s, orderIndex: currentIndex + 1, seatNumber: currentIndex + 1 };
			if (s.orderIndex === currentIndex + 1)
				return { ...s, orderIndex: currentIndex, seatNumber: currentIndex };
			return s;
		});
		startTransition(() => {
			reorderStops(routeId, reordered);
		});
	}

	function handleRemove() {
		startTransition(() => {
			removeStudentFromRoute(stopId);
		});
	}

	return (
		<div className="flex items-center gap-0.5">
			<button
				type="button"
				onClick={handleMoveUp}
				disabled={isPending || currentIndex <= 1}
				className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
			>
				<ArrowUp size={12} />
			</button>
			<button
				type="button"
				onClick={handleMoveDown}
				disabled={isPending || currentIndex >= totalStops}
				className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
			>
				<ArrowDown size={12} />
			</button>
			<button
				type="button"
				onClick={handleRemove}
				disabled={isPending}
				className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
			>
				<Trash2 size={12} />
			</button>
		</div>
	);
}
