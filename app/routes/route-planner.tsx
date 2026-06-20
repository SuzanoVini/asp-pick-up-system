"use client";

import { useTransition } from "react";
import { RefreshCw, FileText } from "lucide-react";
import type { VehicleRoute, ReadinessResult } from "@/app/lib/routes/types";
import { VehicleRouteCard } from "./vehicle-route-card";
import { UnroutedStudents } from "./unrouted-students";
import { ReadinessPanel } from "./readiness-panel";
import { generateRoutesForDate, regenerateRoutesForDate } from "@/app/actions/routes";

interface UnroutedStudent {
	id: string;
	name: string;
	schoolName: string;
	needsBooster: boolean;
}

interface RoutePlannerProps {
	date: string;
	routes: VehicleRoute[];
	unroutedStudents: UnroutedStudent[];
	readiness: ReadinessResult;
	hasExistingRoutes: boolean;
}

export function RoutePlanner({
	date,
	routes,
	unroutedStudents,
	readiness,
	hasExistingRoutes,
}: RoutePlannerProps) {
	const [isPending, startTransition] = useTransition();

	function handleGenerate() {
		startTransition(() => {
			if (hasExistingRoutes) {
				regenerateRoutesForDate(date);
			} else {
				generateRoutesForDate(date);
			}
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={handleGenerate}
					disabled={isPending}
					className="flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
				>
					<RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
					{hasExistingRoutes ? "Regenerate Routes" : "Generate Routes"}
				</button>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
				<div className="space-y-4 lg:col-span-3">
					{routes.length === 0 ? (
						<div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
							No routes generated for this date. Click "Generate Routes" to create them.
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
							{routes.map((route) => (
								<VehicleRouteCard key={route.id || route.vehicleId} route={route} />
							))}
						</div>
					)}
				</div>

				<div className="space-y-4">
					<UnroutedStudents students={unroutedStudents} />
					{routes.length > 0 && <ReadinessPanel result={readiness} />}
				</div>
			</div>
		</div>
	);
}
