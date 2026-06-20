"use client";

import { Car, User, HardHat } from "lucide-react";
import type { VehicleRoute } from "@/app/lib/routes/types";
import { RouteStopCard } from "./route-stop-card";

interface VehicleRouteCardProps {
	route: VehicleRoute;
}

export function VehicleRouteCard({ route }: VehicleRouteCardProps) {
	const capacityClass =
		route.assignedCount > route.kidsSeats
			? "text-red-700 bg-red-50"
			: route.assignedCount === route.kidsSeats
				? "text-amber-700 bg-amber-50"
				: "text-green-700 bg-green-50";

	const statusColors: Record<string, string> = {
		draft: "bg-gray-100 text-gray-700",
		active: "bg-blue-100 text-blue-700",
		completed: "bg-green-100 text-green-700",
		stale: "bg-red-100 text-red-700",
	};

	return (
		<div className="rounded-lg border border-gray-200 bg-white">
			<div className="border-b border-gray-100 px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Car size={16} className="text-gray-600" />
						<span className="font-semibold text-gray-900">
							{route.vehicleName}
						</span>
						<span
							className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[route.status] ?? ""}`}
						>
							{route.status}
						</span>
					</div>
					<span
						className={`rounded px-2 py-0.5 text-xs font-medium ${capacityClass}`}
					>
						{route.assignedCount}/{route.kidsSeats} seats
					</span>
				</div>
				<div className="mt-1 flex gap-3 text-xs text-gray-500">
					{route.driverName && (
						<span className="flex items-center gap-1">
							<User size={10} /> {route.driverName}
						</span>
					)}
					{route.helperName && (
						<span className="flex items-center gap-1">
							<HardHat size={10} /> {route.helperName}
						</span>
					)}
					{route.boosterRequiredCount > 0 && (
						<span
							className={
								route.boosterRequiredCount > route.boosterSeats
									? "text-amber-600"
									: ""
							}
						>
							Boosters: {route.boosterRequiredCount}/{route.boosterSeats}
						</span>
					)}
				</div>
			</div>
			<div className="divide-y divide-gray-50">
				{route.stops.length === 0 ? (
					<div className="px-4 py-3 text-center text-xs text-gray-400">
						No students assigned
					</div>
				) : (
					route.stops.map((stop) => (
						<RouteStopCard key={stop.id || stop.studentId} stop={stop} />
					))
				)}
			</div>
		</div>
	);
}
