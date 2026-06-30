import { buildRouteManagementView } from "../lib/routes/management";
import { isoDateSchema } from "../lib/schemas/route-management-schemas";
import { getAuthorizedUser, requireOwner } from "../lib/security/authorization";
import { getPlanStudents } from "../lib/supabase/route-plan-students";
import { getPlanForDate } from "../lib/supabase/route-plans";
import { getStopsForPlan } from "../lib/supabase/route-stops";
import { getRoutesForPlan } from "../lib/supabase/routes";
import { createClient } from "../lib/supabase/server";
import { getAssignmentsForDate } from "../lib/supabase/staff-schedule";

export function resolveRouteManagementDate(date: string | undefined, now = new Date()) {
	const parsed = isoDateSchema.safeParse(date);
	return parsed.success ? parsed.data : now.toISOString().slice(0, 10);
}

export async function loadRouteManagementPageData(searchDate: string | undefined) {
	const date = resolveRouteManagementDate(searchDate);
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const plan = await getPlanForDate(supabase, date);
	const [routes, stops, students, assignments, vehiclesResult] = plan
		? await Promise.all([
				getRoutesForPlan(supabase, plan.id),
				getStopsForPlan(supabase, plan.id),
				getPlanStudents(supabase, plan.id),
				getAssignmentsForDate(supabase, date),
				supabase.from("asp_vehicles").select("id, kids_seats, booster_seats"),
			])
		: [[], [], [], [], { data: [], error: null }];
	if (vehiclesResult.error) throw vehiclesResult.error;

	return {
		date,
		plan,
		view: buildRouteManagementView({
			date,
			plan,
			routes: routes ?? [],
			stops: stops ?? [],
			students: students ?? [],
			assignments: assignments ?? [],
			vehicles: vehiclesResult.data ?? [],
		}),
	};
}
