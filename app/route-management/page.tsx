import { createOrRefreshRoutePlan } from "../actions/route-management";
import { isoDateSchema } from "../lib/schemas/route-management-schemas";
import { FinalizePlanForm } from "./finalize-plan-form";
import { loadRouteManagementPageData } from "./page-data";
import { ReadinessPanel } from "./readiness-panel";
import { RouteManagementBoard } from "./route-management-board";
import { UnroutedStudents } from "./unrouted-students";

interface PageProps {
	searchParams: Promise<{ date?: string }>;
}

export default async function RouteManagementPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const { date, plan, view, editor } = await loadRouteManagementPageData(params.date);

	async function createPlan(formData: FormData) {
		"use server";
		const parsed = isoDateSchema.parse(String(formData.get("date") ?? ""));
		await createOrRefreshRoutePlan({ date: parsed });
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Route Management</h1>
					<p className="text-sm text-gray-500">
						Build and review the persisted route board for the selected date.
					</p>
				</div>
				<form className="flex items-center gap-2">
					<input
						type="date"
						name="date"
						defaultValue={date}
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

			<div className="rounded-lg border border-gray-200 bg-white p-4">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<p className="text-sm font-medium text-gray-900">
							{plan ? `Plan status: ${plan.status}` : "No route plan for this date"}
						</p>
						<p className="text-xs text-gray-500">
							{plan
								? `${view.routes.length} route lane(s), ${view.unroutedStudents.length} unrouted student(s)`
								: "Create the plan from materialized attendance to start assigning routes."}
						</p>
					</div>
					<form action={createPlan}>
						<input type="hidden" name="date" value={date} />
						<button
							type="submit"
							className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							{plan ? "Refresh pickup list" : "Create route plan"}
						</button>
					</form>
				</div>
			</div>

			{plan ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
					<div className="space-y-4 lg:col-span-3">
						<RouteManagementBoard
							planId={plan.id}
							editable={plan.status === "draft"}
							finalized={plan.status === "finalized"}
							routes={editor.routes}
							stops={editor.stops}
							unroutedStudents={view.unroutedStudents}
							vehicles={editor.vehicles}
							staff={editor.staff}
							assignments={editor.assignments}
						/>
					</div>
					<div className="space-y-4">
						<UnroutedStudents students={view.unroutedStudents} />
						<ReadinessPanel result={view.readiness} />
						{plan.status === "draft" && (
							<FinalizePlanForm planId={plan.id} readiness={view.readiness} />
						)}
					</div>
				</div>
			) : (
				<div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
					No persisted route-management plan exists for {date}.
				</div>
			)}
		</div>
	);
}
