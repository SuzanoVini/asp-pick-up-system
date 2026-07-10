import { buildRouteManagementView } from "../lib/routes/management";
import { isoDateSchema } from "../lib/schemas/route-management-schemas";
import { getAuthorizedUser, requireOwner } from "../lib/security/authorization";
import { getPlanStudents } from "../lib/supabase/route-plan-students";
import { getPlanForDate } from "../lib/supabase/route-plans";
import { getStopsForPlan } from "../lib/supabase/route-stops";
import { getRoutesForPlan } from "../lib/supabase/routes";
import { createClient } from "../lib/supabase/server";
import { getSystemSettings } from "../lib/supabase/settings";
import { getAvailableStaffAndAssignmentsForDate } from "../lib/supabase/staff-schedule";
import { getActiveVehicles } from "../lib/supabase/vehicles";
import { todayInTimeZone } from "../lib/utils/dates";

export function resolveRouteManagementDate(date: string | undefined, today: string) {
	const parsed = isoDateSchema.safeParse(date);
	return parsed.success ? parsed.data : today;
}

export async function loadRouteManagementPageData(searchDate: string | undefined) {
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);
	const settings = await getSystemSettings(supabase);
	const date = resolveRouteManagementDate(searchDate, todayInTimeZone(settings.timezone));

	const plan = await getPlanForDate(supabase, date);
	const [routes, stops, students, vehicles, schedule] = plan
		? await Promise.all([
				getRoutesForPlan(supabase, plan.id),
				getStopsForPlan(supabase, plan.id),
				getPlanStudents(supabase, plan.id),
				getActiveVehicles(supabase),
				getAvailableStaffAndAssignmentsForDate(supabase, date),
			])
		: [[], [], [], [], { staff: [], assignments: [] }];

	return {
		date,
		plan,
		view: buildRouteManagementView({
			date,
			plan,
			routes: routes ?? [],
			stops: stops ?? [],
			students: students ?? [],
			assignments: schedule.assignments ?? [],
			vehicles: vehicles ?? [],
		}),
		editor: {
			routes: routes ?? [],
			stops: stops ?? [],
			students: students ?? [],
			vehicles: vehicles ?? [],
			staff: schedule.staff ?? [],
			assignments: schedule.assignments ?? [],
		},
	};
}
