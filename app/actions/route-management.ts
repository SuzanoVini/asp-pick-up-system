"use server";

import { revalidatePath } from "next/cache";
import { buildRouteManagementView } from "../lib/routes/management";
import { materializeAttendanceForDate } from "../lib/routes/materialize-attendance";
import { refreshRouteDistances } from "../lib/routes/refresh-distances";
import {
	type AddRouteTableInput,
	type AssignSchoolGroupInput,
	type AssignStudentInput,
	addRouteTableSchema,
	assignSchoolGroupSchema,
	assignStudentSchema,
	type CreateOrRefreshRoutePlanInput,
	createOrRefreshRoutePlanSchema,
	type FinalizeRoutePlanInput,
	finalizeRoutePlanSchema,
	type MoveStudentStopInput,
	moveStudentStopSchema,
	type RemoveRouteTableInput,
	type RemoveStudentStopInput,
	type ReorderRouteStopsInput,
	removeRouteTableSchema,
	removeStudentStopSchema,
	reorderRouteStopsSchema,
	type SetRouteStaffInput,
	type SetRouteVehicleInput,
	setRouteStaffSchema,
	setRouteVehicleSchema,
	type UpdateStopResponsibleStaffInput,
	updateStopResponsibleStaffSchema,
} from "../lib/schemas/route-management-schemas";
import { getAuthorizedUser, requireOwner } from "../lib/security/authorization";
import { getPlanStudents } from "../lib/supabase/route-plan-students";
import {
	finalizePlan,
	getPlanById,
	getPlanForDate,
	replacePlanSnapshot,
} from "../lib/supabase/route-plans";
import {
	assignRouteSchoolGroup,
	assignRouteStudent,
	getStopById,
	getStopsForPlan,
	getStopsForRoute,
	moveRouteStop,
	removeRouteStop,
	reorderRouteStops as reorderRouteStopsRpc,
	setRouteStopResponsibleStaff,
} from "../lib/supabase/route-stops";
import {
	createRouteLane,
	deleteRouteLane,
	getRoutesForPlan,
	getRouteWithPlan,
	type RouteWithPlanRow,
	setRouteVehicle as setRouteVehicleRpc,
} from "../lib/supabase/routes";
import { createClient } from "../lib/supabase/server";
import { getSystemSettings } from "../lib/supabase/settings";
import { getStaffById } from "../lib/supabase/staff";
import {
	getAssignmentsForDate,
	getAvailabilityForDate,
	removeAssignmentForVehicleDateRole,
	upsertAssignmentForVehicleDate,
} from "../lib/supabase/staff-schedule";
import { getActiveVehicles, getVehicleById } from "../lib/supabase/vehicles";

type OwnerContext = { supabase: Awaited<ReturnType<typeof createClient>> };
type EditableRoute = RouteWithPlanRow & { plan_id: string };

async function getEditableRoute(
	supabase: Awaited<ReturnType<typeof createClient>>,
	routeId: string,
	ownerContext?: OwnerContext,
): Promise<EditableRoute> {
	const context = ownerContext ?? (await authorizeOwner(supabase));
	const route = await getRouteWithPlan(context.supabase, routeId);
	const plan = Array.isArray(route.asp_route_plans)
		? route.asp_route_plans[0]
		: route.asp_route_plans;
	if (!route.plan_id || plan?.status !== "draft") throw new Error("Route plan is not editable");
	if (route.status === "completed") throw new Error("Completed routes are not editable");
	return route as EditableRoute;
}

async function authorizeOwner(
	supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<OwnerContext> {
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);
	return { supabase };
}

function revalidateRouteManagement(date: string) {
	revalidatePath("/route-management");
	revalidatePath(`/route-management?date=${date}`);
}

async function getRouteOrigin(supabase: Awaited<ReturnType<typeof createClient>>) {
	const settings = await getSystemSettings(supabase);
	return settings.routeOriginLat !== null && settings.routeOriginLng !== null
		? { lat: settings.routeOriginLat, lng: settings.routeOriginLng }
		: null;
}

async function refreshAffectedRoutes(
	supabase: Awaited<ReturnType<typeof createClient>>,
	routeIds: readonly string[],
) {
	const origin = await getRouteOrigin(supabase);
	for (const routeId of new Set(routeIds)) {
		await refreshRouteDistances(supabase, routeId, origin);
	}
}

async function validateAvailableStaff(
	supabase: Awaited<ReturnType<typeof createClient>>,
	staffId: string,
	date: string,
	role?: "driver" | "helper",
) {
	const [staff, availability] = await Promise.all([
		getStaffById(supabase, staffId),
		getAvailabilityForDate(supabase, date),
	]);
	if (!staff.is_active) throw new Error("Staff member must be active");
	if (role && !staff.capabilities?.includes(role)) {
		throw new Error(`Staff member is not capable of the ${role} role`);
	}
	if (!(availability ?? []).some((row) => row.staff_id === staffId)) {
		throw new Error("Staff member must be available on this date");
	}
}

async function getPlanAssignmentState(
	supabase: Awaited<ReturnType<typeof createClient>>,
	planId: string,
) {
	const [students, stops] = await Promise.all([
		getPlanStudents(supabase, planId),
		getStopsForPlan(supabase, planId),
	]);
	return {
		students: students ?? [],
		assignedStudentIds: new Set((stops ?? []).map((stop) => stop.student_id)),
	};
}

export async function createOrRefreshRoutePlan(input: CreateOrRefreshRoutePlanInput) {
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const { date } = createOrRefreshRoutePlanSchema.parse(input);
	const attendance = await materializeAttendanceForDate(supabase, date);
	const existingPlan = await getPlanForDate(supabase, date);
	const routes = existingPlan ? await getRoutesForPlan(supabase, existingPlan.id) : [];
	let plan = existingPlan;

	if (!existingPlan || (existingPlan.status === "draft" && routes.length === 0)) {
		const [studentsResult, schoolsResult] = await Promise.all([
			supabase
				.from("asp_students")
				.select("id, name, school_id, drop_off_only")
				.eq("status", "active"),
			supabase.from("asp_schools").select("id, name"),
		]);
		if (studentsResult.error) throw studentsResult.error;
		if (schoolsResult.error) throw schoolsResult.error;

		const students = new Map((studentsResult.data ?? []).map((student) => [student.id, student]));
		const schools = new Map((schoolsResult.data ?? []).map((school) => [school.id, school]));
		const snapshots = attendance.map((result) => {
			const student = students.get(result.studentId);
			if (!student) throw new Error(`Missing student metadata for ${result.studentId}`);
			const school = student.school_id ? schools.get(student.school_id) : null;
			if (student.school_id && !school) {
				throw new Error(`Missing school metadata for ${student.school_id}`);
			}
			return {
				student_id: result.studentId,
				school_id: school?.id ?? null,
				attendance_status: result.status,
				drop_off_only: student.drop_off_only ?? false,
				needs_booster: result.needsBooster,
				student_name_snapshot: student.name,
				school_name_snapshot: school?.name ?? "Unassigned school",
			};
		});

		plan = await replacePlanSnapshot(supabase, date, snapshots);
	}

	revalidateRouteManagement(date);
	return plan;
}

export async function addRouteTable(input: AddRouteTableInput) {
	const { planId } = addRouteTableSchema.parse(input);
	const supabase = await createClient();
	await authorizeOwner(supabase);
	const plan = await getPlanById(supabase, planId);
	if (plan.status !== "draft") throw new Error("Route plan is not editable");
	const route = await createRouteLane(supabase, planId);
	revalidateRouteManagement(plan.plan_date);
	return route;
}

export async function removeRouteTable(input: RemoveRouteTableInput) {
	const { routeId, confirmNonEmpty = false } = removeRouteTableSchema.parse(input);
	const supabase = await createClient();
	const route = await getEditableRoute(supabase, routeId);
	const stops = await getStopsForRoute(supabase, routeId);
	if (stops?.length && !confirmNonEmpty) throw new Error("Route deletion requires confirmation");
	const result = await deleteRouteLane(supabase, routeId, confirmNonEmpty);
	revalidateRouteManagement(route.date);
	return result;
}

export async function setRouteVehicle(input: SetRouteVehicleInput) {
	const { routeId, vehicleId } = setRouteVehicleSchema.parse(input);
	const supabase = await createClient();
	const route = await getEditableRoute(supabase, routeId);
	if (vehicleId) {
		const vehicle = await getVehicleById(supabase, vehicleId);
		if (!vehicle.is_active) throw new Error("Vehicle must be active");
	}
	const result = await setRouteVehicleRpc(supabase, routeId, vehicleId);
	revalidateRouteManagement(route.date);
	return result;
}

export async function setRouteStaff(input: SetRouteStaffInput) {
	const { routeId, role, staffId } = setRouteStaffSchema.parse(input);
	const supabase = await createClient();
	const route = await getEditableRoute(supabase, routeId);
	if (!route.vehicle_id) throw new Error("Select a vehicle before assigning staff");
	if (staffId) await validateAvailableStaff(supabase, staffId, route.date, role);
	const result = staffId
		? await upsertAssignmentForVehicleDate(supabase, staffId, route.date, route.vehicle_id, role)
		: await removeAssignmentForVehicleDateRole(supabase, route.date, route.vehicle_id, role);
	revalidateRouteManagement(route.date);
	return result;
}

export async function assignStudent(input: AssignStudentInput) {
	const { routeId, studentId, responsibleStaffId } = assignStudentSchema.parse(input);
	const supabase = await createClient();
	const route = await getEditableRoute(supabase, routeId);
	const { students, assignedStudentIds } = await getPlanAssignmentState(supabase, route.plan_id);
	const student = students.find((row) => row.student_id === studentId);
	if (!student) throw new Error("Student is not in the same plan");
	if (!["P", "E", "ED"].includes(student.attendance_status) || student.drop_off_only) {
		throw new Error("Student is not routable");
	}
	if (!student.school_id) throw new Error("Student requires a school");
	if (assignedStudentIds.has(studentId)) throw new Error("Student is already assigned");
	if (responsibleStaffId) {
		await validateAvailableStaff(supabase, responsibleStaffId, route.date);
	}
	const result = await assignRouteStudent(supabase, routeId, studentId, responsibleStaffId);
	await refreshAffectedRoutes(supabase, [routeId]);
	revalidateRouteManagement(route.date);
	return result;
}

export async function assignSchoolGroup(input: AssignSchoolGroupInput) {
	const { routeId, schoolId } = assignSchoolGroupSchema.parse(input);
	const supabase = await createClient();
	const route = await getEditableRoute(supabase, routeId);
	const { students, assignedStudentIds } = await getPlanAssignmentState(supabase, route.plan_id);
	const hasStudents = students.some(
		(student) =>
			student.school_id === schoolId &&
			["P", "E", "ED"].includes(student.attendance_status) &&
			!student.drop_off_only &&
			!assignedStudentIds.has(student.student_id),
	);
	if (!hasStudents) throw new Error("School has no unassigned routable students");
	const result = await assignRouteSchoolGroup(supabase, routeId, schoolId);
	await refreshAffectedRoutes(supabase, [routeId]);
	revalidateRouteManagement(route.date);
	return result;
}

export async function removeStudentStop(input: RemoveStudentStopInput) {
	const { stopId } = removeStudentStopSchema.parse(input);
	const supabase = await createClient();
	const ownerContext = await authorizeOwner(supabase);
	const stop = await getStopById(supabase, stopId);
	const route = await getEditableRoute(supabase, stop.route_id, ownerContext);
	const result = await removeRouteStop(supabase, stopId);
	await refreshAffectedRoutes(supabase, [route.id]);
	revalidateRouteManagement(route.date);
	return result;
}

export async function moveStudentStop(input: MoveStudentStopInput) {
	const { stopId, targetRouteId } = moveStudentStopSchema.parse(input);
	const supabase = await createClient();
	const ownerContext = await authorizeOwner(supabase);
	const stop = await getStopById(supabase, stopId);
	const source = await getEditableRoute(supabase, stop.route_id, ownerContext);
	const target = await getEditableRoute(supabase, targetRouteId, ownerContext);
	if (source.plan_id !== target.plan_id) throw new Error("Routes must belong to the same plan");
	const result = await moveRouteStop(supabase, stopId, targetRouteId);
	await refreshAffectedRoutes(supabase, [source.id, target.id]);
	revalidateRouteManagement(source.date);
	return result;
}

export async function reorderRouteStops(input: ReorderRouteStopsInput) {
	const { routeId, orderedStopIds } = reorderRouteStopsSchema.parse(input);
	const supabase = await createClient();
	const route = await getEditableRoute(supabase, routeId);
	const currentStops = await getStopsForRoute(supabase, routeId);
	const currentStopIds = new Set((currentStops ?? []).map((stop) => stop.id));
	if (
		currentStopIds.size !== orderedStopIds.length ||
		orderedStopIds.some((stopId) => !currentStopIds.has(stopId))
	) {
		throw new Error("Reorder must include every current route stop exactly once");
	}
	const result = await reorderRouteStopsRpc(supabase, routeId, orderedStopIds);
	await refreshAffectedRoutes(supabase, [routeId]);
	revalidateRouteManagement(route.date);
	return result;
}

export async function updateStopResponsibleStaff(input: UpdateStopResponsibleStaffInput) {
	const { stopId, staffId } = updateStopResponsibleStaffSchema.parse(input);
	const supabase = await createClient();
	const ownerContext = await authorizeOwner(supabase);
	const stop = await getStopById(supabase, stopId);
	const route = await getEditableRoute(supabase, stop.route_id, ownerContext);
	if (staffId) await validateAvailableStaff(supabase, staffId, route.date);
	const result = await setRouteStopResponsibleStaff(supabase, stopId, staffId);
	revalidateRouteManagement(route.date);
	return result;
}

export async function finalizeRoutePlan(input: FinalizeRoutePlanInput) {
	const parsed = finalizeRoutePlanSchema.parse(input);
	const supabase = await createClient();
	await authorizeOwner(supabase);
	const plan = await getPlanById(supabase, parsed.planId);
	if (plan.status !== "draft") throw new Error("Route plan is not editable");

	const [routes, stops, students, vehicles, assignments] = await Promise.all([
		getRoutesForPlan(supabase, plan.id),
		getStopsForPlan(supabase, plan.id),
		getPlanStudents(supabase, plan.id),
		getActiveVehicles(supabase),
		getAssignmentsForDate(supabase, plan.plan_date),
	]);
	const readiness = buildRouteManagementView({
		date: plan.plan_date,
		plan,
		routes: routes ?? [],
		stops: stops ?? [],
		students: students ?? [],
		vehicles: vehicles ?? [],
		assignments: assignments ?? [],
	}).readiness;
	const warnings = readiness.checks
		.filter((check) => !check.passed && check.severity === "warning")
		.map((check) => check.name);
	const blockers = readiness.checks
		.filter((check) => !check.passed && check.severity === "blocker")
		.map((check) => check.name);
	if (warnings.some((name) => !parsed.acknowledgedWarnings.includes(name))) {
		throw new Error("All current warnings must be acknowledged");
	}
	if (
		blockers.length !== (parsed.override?.checkNames.length ?? 0) ||
		blockers.some((name) => !parsed.override?.checkNames.includes(name))
	) {
		throw new Error("All current blockers require an explicit override");
	}

	const result = await finalizePlan(
		supabase,
		plan.id,
		warnings,
		blockers,
		parsed.override?.reason ?? null,
	);
	revalidateRouteManagement(plan.plan_date);
	return result;
}
