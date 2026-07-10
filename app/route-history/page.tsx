import { format } from "date-fns";
import { CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";
import type { ManagedRouteRow, ManagedStopRow } from "../lib/routes/management-types";
import { isoDateSchema } from "../lib/schemas/route-management-schemas";
import { getAuthorizedUser, requireOwner } from "../lib/security/authorization";
import { getHistoryPlans, getPlanForDate } from "../lib/supabase/route-plans";
import { getStopsForPlan } from "../lib/supabase/route-stops";
import { getRoutesForPlan } from "../lib/supabase/routes";
import { createClient } from "../lib/supabase/server";
import { RouteExportButton } from "../route-management/route-export-button";

interface PageProps {
	searchParams: Promise<{ date?: string }>;
}

function formatTimestamp(value: string | null): string | null {
	return value ? format(new Date(value), "MMM d, yyyy h:mm a") : null;
}

function RouteCard({ route, stops }: { route: ManagedRouteRow; stops: ManagedStopRow[] }) {
	const exportedAt = formatTimestamp(route.exported_at);
	return (
		<div className="rounded-lg border border-gray-200">
			<div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h3 className="font-semibold text-gray-950">
							{route.vehicle_name_snapshot ?? "Unassigned vehicle"}
							{route.plate_number_snapshot ? ` - ${route.plate_number_snapshot}` : ""}
							{route.run_number > 1 ? ` - Run ${route.run_number}` : ""}
						</h3>
						<p className="mt-1 text-xs text-gray-500">
							{exportedAt ? `Exported ${exportedAt}` : "Not exported"}
							{route.total_distance_km !== null ? ` · ${route.total_distance_km} km` : ""}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<span
							className={`rounded px-2 py-0.5 text-xs font-medium ${
								route.status === "completed"
									? "bg-green-100 text-green-700"
									: "bg-gray-100 text-gray-600"
							}`}
						>
							{route.status}
						</span>
						<RouteExportButton routeId={route.id} />
					</div>
				</div>
				<div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
					<span>Driver: {route.driver_name_snapshot ?? "Unassigned"}</span>
					<span>Helper: {route.helper_name_snapshot ?? "None"}</span>
				</div>
			</div>
			<div className="divide-y divide-gray-100">
				{stops.length === 0 && (
					<p className="px-4 py-3 text-sm text-gray-500">No stops on this route.</p>
				)}
				{stops.map((stop, index) => (
					<div key={stop.id} className="grid gap-2 px-4 py-3 md:grid-cols-[40px_1fr_auto]">
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
							{index + 1}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium text-gray-950">
								{stop.student_name_snapshot}
								{stop.needs_booster ? (
									<span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
										Booster
									</span>
								) : null}
							</p>
							<p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
								<MapPin size={12} />
								{stop.school_name_snapshot}
								{stop.school_address_snapshot ? ` · ${stop.school_address_snapshot}` : ""}
							</p>
							{stop.responsible_staff_name_snapshot ? (
								<p className="mt-0.5 text-xs text-gray-500">
									Responsible: {stop.responsible_staff_name_snapshot}
								</p>
							) : null}
						</div>
						<div className="text-left text-xs text-gray-500 md:text-right">
							{stop.dismissal_time_snapshot ? <p>{stop.dismissal_time_snapshot}</p> : null}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default async function RouteHistoryPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const requestedDate = isoDateSchema.safeParse(params.date);
	const recentPlans = await getHistoryPlans(supabase, { limit: 30 });
	const selectedDate = requestedDate.success
		? requestedDate.data
		: (recentPlans[0]?.plan_date ?? null);
	const plan = requestedDate.success
		? await getPlanForDate(supabase, requestedDate.data)
		: (recentPlans[0] ?? null);

	const [routes, stops] = plan
		? await Promise.all([getRoutesForPlan(supabase, plan.id), getStopsForPlan(supabase, plan.id)])
		: [[], []];
	const stopsByRoute = new Map<string, ManagedStopRow[]>();
	for (const stop of stops ?? []) {
		const routeStops = stopsByRoute.get(stop.route_id) ?? [];
		routeStops.push(stop);
		stopsByRoute.set(stop.route_id, routeStops);
	}
	const finalizedAt = plan ? formatTimestamp(plan.finalized_at) : null;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Route History</h1>
					<p className="text-sm text-gray-500">
						Persisted route plans as they were finalized and exported.
					</p>
				</div>
				<form className="flex items-center gap-2">
					<input
						type="date"
						name="date"
						defaultValue={selectedDate ?? undefined}
						className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
					/>
					<button
						type="submit"
						className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
					>
						View
					</button>
				</form>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
				<div className="space-y-4 lg:col-span-3">
					{plan ? (
						<>
							<div className="rounded-lg border border-gray-200 bg-white p-4">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="font-semibold text-gray-950">
											{format(new Date(`${plan.plan_date}T00:00:00`), "EEEE, MMMM d, yyyy")}
										</p>
										<p className="mt-1 text-xs text-gray-500">
											{plan.status === "finalized" && finalizedAt
												? `Finalized ${finalizedAt}`
												: "Draft plan (not finalized)"}
										</p>
									</div>
									<div className="flex flex-wrap gap-2 text-xs">
										<span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-600">
											{plan.routable_count} routable
										</span>
										<span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-600">
											{plan.drop_off_count} drop-off
										</span>
										<span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-600">
											{plan.absent_count} absent
										</span>
										<span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-600">
											{plan.school_count} school(s)
										</span>
									</div>
								</div>
							</div>
							{(routes ?? []).map((route) => (
								<RouteCard key={route.id} route={route} stops={stopsByRoute.get(route.id) ?? []} />
							))}
							{(routes ?? []).length === 0 && (
								<div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
									This plan has no route lanes.
								</div>
							)}
						</>
					) : (
						<div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
							{requestedDate.success
								? `No route plan exists for ${requestedDate.data}.`
								: "No finalized route plans yet. Finalize a plan in Route Management to see it here."}
						</div>
					)}
				</div>

				<div>
					<div className="rounded-lg border border-gray-200 bg-white">
						<div className="border-b border-gray-100 px-4 py-3">
							<h2 className="font-semibold text-gray-950">Finalized Plans</h2>
						</div>
						<div className="divide-y divide-gray-100">
							{recentPlans.length === 0 && (
								<p className="px-4 py-3 text-sm text-gray-500">Nothing finalized yet.</p>
							)}
							{recentPlans.map((recent) => (
								<Link
									key={recent.id}
									href={`/route-history?date=${recent.plan_date}`}
									className={`flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-gray-50 ${
										recent.plan_date === selectedDate ? "bg-gray-50 font-medium" : ""
									}`}
								>
									<span>{format(new Date(`${recent.plan_date}T00:00:00`), "MMM d, yyyy")}</span>
									<CheckCircle2 size={15} className="text-green-600" />
								</Link>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
