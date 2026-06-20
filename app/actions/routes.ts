"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { generateRoutes } from "@/app/lib/routes/optimizer";
import { materializeAttendanceForDate } from "@/app/lib/routes/materialize-attendance";
import { writeRouteAuditEvent } from "@/app/lib/routes/audit";
import * as routesDb from "@/app/lib/supabase/routes";
import * as routeStopsDb from "@/app/lib/supabase/route-stops";
import * as staffScheduleDb from "@/app/lib/supabase/staff-schedule";
import type { DayOfWeek } from "@/app/lib/engine/types";

export async function generateRoutesForDate(date: string) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const results = await materializeAttendanceForDate(supabase, date);

	const [
		{ data: studentsRaw },
		{ data: schoolsRaw },
		{ data: vehiclesRaw },
	] = await Promise.all([
		supabase.from("asp_students").select("*").eq("status", "active"),
		supabase.from("asp_schools").select("*"),
		supabase.from("asp_vehicles").select("*").eq("is_active", true),
	]);

	const availability = await staffScheduleDb.getAvailabilityForDate(supabase, date);
	const availableStaff = (availability ?? []).map((a) => ({
		id: a.staff_id,
		name: (a as Record<string, unknown>).asp_staff
			? ((a as Record<string, unknown>).asp_staff as Record<string, unknown>).name as string
			: "",
		capabilities: (a as Record<string, unknown>).asp_staff
			? ((a as Record<string, unknown>).asp_staff as Record<string, unknown>).capabilities as string[]
			: [],
	}));

	const { data: settingsRows } = await supabase
		.from("asp_settings")
		.select("key, value")
		.in("key", ["route_origin_lat", "route_origin_lng"]);

	const settingsMap = new Map((settingsRows ?? []).map((r) => [r.key, r.value]));
	const originLat = settingsMap.get("route_origin_lat") as number | null;
	const originLng = settingsMap.get("route_origin_lng") as number | null;

	const genResult = generateRoutes({
		date,
		attendanceResults: results,
		students: (studentsRaw ?? []).map((s) => ({
			id: s.id,
			name: s.name,
			schoolId: s.school_id ?? "",
			dropOffOnly: s.drop_off_only ?? false,
			dateOfBirth: s.date_of_birth ?? null,
			dismissalTime: s.dismissal_time ?? null,
		})),
		schools: (schoolsRaw ?? []).map((s) => ({
			id: s.id,
			name: s.name,
			address: s.address ?? null,
			standardDismissalTime: s.standard_dismissal_time ?? "15:00",
			lat: s.lat ?? null,
			lng: s.lng ?? null,
		})),
		vehicles: (vehiclesRaw ?? []).map((v) => ({
			id: v.id,
			name: v.name,
			kidsSeats: v.kids_seats,
			boosterSeats: v.booster_seats,
			isActive: v.is_active,
		})),
		availableStaff,
		originLat,
		originLng,
	});

	for (const route of genResult.routes) {
		const dbRoute = await routesDb.createRoute(supabase, {
			date,
			vehicle_id: route.vehicleId,
			vehicle_name_snapshot: route.vehicleName,
			driver_name_snapshot: route.driverName,
			helper_name_snapshot: route.helperName,
			total_distance_km: route.totalDistanceKm,
		});

		const stopRows = route.stops.map((s) => ({
			route_id: dbRoute.id,
			student_id: s.studentId,
			school_id: s.schoolId,
			seat_number: s.seatNumber,
			order_index: s.orderIndex,
			distance_from_prev_km: s.distanceFromPrevKm,
			duration_from_prev_min: s.durationFromPrevMin,
			needs_booster: s.needsBooster,
			student_name_snapshot: s.studentNameSnapshot,
			school_name_snapshot: s.schoolNameSnapshot,
			school_address_snapshot: s.schoolAddressSnapshot,
			dismissal_time_snapshot: s.dismissalTimeSnapshot,
		}));

		if (stopRows.length > 0) {
			await routeStopsDb.createStopsBatch(supabase, stopRows);
		}

		await writeRouteAuditEvent(supabase, {
			entityType: "route",
			entityId: dbRoute.id,
			action: "create",
			changes: { date, vehicle: route.vehicleName, stops: stopRows.length },
			performedBy: user.id,
		});
	}

	revalidatePath("/routes");
	revalidatePath("/");
	return genResult;
}

export async function regenerateRoutesForDate(date: string) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const existing = await routesDb.getRoutesForDate(supabase, date);
	for (const route of existing ?? []) {
		if (route.status === "draft" || route.status === "stale") {
			await routesDb.deleteRoute(supabase, route.id);
		}
	}

	return generateRoutesForDate(date);
}

export async function markStaleRouteReviewed(routeId: string) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	await routesDb.updateRouteStatus(supabase, routeId, "active");
	await writeRouteAuditEvent(supabase, {
		entityType: "route",
		entityId: routeId,
		action: "update",
		changes: { status: { from: "stale", to: "active" } },
		performedBy: user.id,
	});

	revalidatePath("/routes");
}

export async function reopenCompletedRoute(routeId: string) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	await routesDb.updateRouteStatus(supabase, routeId, "active");
	await writeRouteAuditEvent(supabase, {
		entityType: "route",
		entityId: routeId,
		action: "update",
		changes: { status: { from: "completed", to: "active" }, reopened: true },
		performedBy: user.id,
	});

	revalidatePath("/routes");
}

export async function deleteDraftRoute(routeId: string) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const route = await routesDb.getRouteById(supabase, routeId);
	if (route.status !== "draft") {
		throw new Error("Only draft routes can be deleted");
	}

	await routesDb.deleteRoute(supabase, routeId);
	await writeRouteAuditEvent(supabase, {
		entityType: "route",
		entityId: routeId,
		action: "delete",
		changes: null,
		performedBy: user.id,
	});

	revalidatePath("/routes");
}
