"use server";

import { revalidatePath } from "next/cache";
import { writeRouteAuditEvent } from "@/app/lib/routes/audit";
import { materializeAttendanceForDate } from "@/app/lib/routes/materialize-attendance";
import { generateRoutes } from "@/app/lib/routes/optimizer";
import { computeRouteLegDistances, getDistanceWithCache } from "@/app/lib/routes/refresh-distances";
import type { VehicleRoute } from "@/app/lib/routes/types";
import * as routeStopsDb from "@/app/lib/supabase/route-stops";
import * as routesDb from "@/app/lib/supabase/routes";
import { createClient } from "@/app/lib/supabase/server";
import * as staffScheduleDb from "@/app/lib/supabase/staff-schedule";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface SchoolCoordinates {
	lat: number | null;
	lng: number | null;
}

interface SchoolForRoutes extends SchoolCoordinates {
	id: string;
	name: string;
	address: string | null;
	standardDismissalTime: string;
}

function parseCoordinate(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

async function getDistanceWithoutThrow(
	supabase: SupabaseClient,
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
) {
	try {
		return await getDistanceWithCache(supabase, from, to);
	} catch {
		return null;
	}
}

async function buildDrivingSchoolOrder(
	supabase: SupabaseClient,
	schools: SchoolForRoutes[],
	routableSchoolIds: Set<string>,
	origin: { lat: number; lng: number } | null,
) {
	if (!process.env.GOOGLE_MAPS_API_KEY || routableSchoolIds.size <= 1) return undefined;

	const routableSchools = schools.filter((s) => routableSchoolIds.has(s.id));
	const remaining = routableSchools
		.filter((s) => s.lat !== null && s.lng !== null)
		.map((s) => ({ id: s.id, lat: s.lat as number, lng: s.lng as number }));
	const ungeocoded = routableSchools
		.filter((s) => s.lat === null || s.lng === null)
		.map((s) => s.id);

	if (remaining.length === 0) return undefined;

	const ordered: string[] = [];
	let currentPoint = origin;

	if (!currentPoint) {
		const first = remaining.shift();
		if (!first) return [...ordered, ...ungeocoded];
		ordered.push(first.id);
		currentPoint = { lat: first.lat, lng: first.lng };
	}

	while (remaining.length > 0) {
		let nearestIndex = 0;
		let nearestDistance = Number.POSITIVE_INFINITY;

		for (let i = 0; i < remaining.length; i++) {
			const candidate = remaining[i];
			const distance = await getDistanceWithoutThrow(supabase, currentPoint, {
				lat: candidate.lat,
				lng: candidate.lng,
			});
			if (distance && distance.km < nearestDistance) {
				nearestDistance = distance.km;
				nearestIndex = i;
			}
		}

		const nearest = remaining.splice(nearestIndex, 1)[0];
		ordered.push(nearest.id);
		currentPoint = { lat: nearest.lat, lng: nearest.lng };
	}

	return [...ordered, ...ungeocoded];
}

async function enrichRouteDistances(
	supabase: SupabaseClient,
	routes: VehicleRoute[],
	schoolCoordinates: Map<string, SchoolCoordinates>,
	origin: { lat: number; lng: number } | null,
) {
	if (!process.env.GOOGLE_MAPS_API_KEY) return;

	const coordsMap = new Map(
		[...schoolCoordinates.entries()].map(([id, c]) => [
			id,
			c.lat !== null && c.lng !== null ? { lat: c.lat, lng: c.lng } : null,
		]),
	);

	for (const route of routes) {
		const { legs, totalKm } = await computeRouteLegDistances(
			route.stops.map((s) => ({ id: s.id, schoolId: s.schoolId })),
			coordsMap,
			origin,
			(from, to) => getDistanceWithCache(supabase, from, to),
		);

		for (const leg of legs) {
			const stop = route.stops.find((s) => s.id === leg.id);
			if (stop) {
				stop.distanceFromPrevKm = leg.km;
				stop.durationFromPrevMin = leg.minutes;
			}
		}
		route.totalDistanceKm = totalKm;
	}
}

export async function generateRoutesForDate(date: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const results = await materializeAttendanceForDate(supabase, date);

	const [{ data: studentsRaw }, { data: schoolsRaw }, { data: vehiclesRaw }] = await Promise.all([
		supabase.from("asp_students").select("*").eq("status", "active"),
		supabase.from("asp_schools").select("*"),
		supabase.from("asp_vehicles").select("*").eq("is_active", true),
	]);

	const availability = await staffScheduleDb.getAvailabilityForDate(supabase, date);
	const availableStaff = (availability ?? []).map((a) => ({
		id: a.staff_id,
		name: (a as Record<string, unknown>).asp_staff
			? (((a as Record<string, unknown>).asp_staff as Record<string, unknown>).name as string)
			: "",
		capabilities: (a as Record<string, unknown>).asp_staff
			? (((a as Record<string, unknown>).asp_staff as Record<string, unknown>)
					.capabilities as string[])
			: [],
	}));

	const { data: settingsRows } = await supabase
		.from("asp_settings")
		.select("key, value")
		.in("key", ["route_origin_lat", "route_origin_lng"]);

	const settingsMap = new Map((settingsRows ?? []).map((r) => [r.key, r.value]));
	const originLat = parseCoordinate(settingsMap.get("route_origin_lat"));
	const originLng = parseCoordinate(settingsMap.get("route_origin_lng"));
	const origin =
		originLat !== null && originLng !== null ? { lat: originLat, lng: originLng } : null;

	const schools = (schoolsRaw ?? []).map((s) => ({
		id: s.id,
		name: s.name,
		address: s.address ?? null,
		standardDismissalTime: s.standard_dismissal_time ?? "15:00",
		lat: s.lat ?? null,
		lng: s.lng ?? null,
	}));
	const activeStudents = (studentsRaw ?? []).map((s) => ({
		id: s.id,
		name: s.name,
		schoolId: s.school_id ?? "",
		dropOffOnly: s.drop_off_only ?? false,
		dateOfBirth: s.date_of_birth ?? null,
		dismissalTime: s.dismissal_time ?? null,
	}));
	const routableStatuses = new Set(["P", "E", "ED"]);
	const studentMap = new Map(activeStudents.map((s) => [s.id, s]));
	type ActiveStudent = (typeof activeStudents)[number];
	const routableSchoolIds = new Set(
		results
			.filter((r) => routableStatuses.has(r.status))
			.map((r) => studentMap.get(r.studentId))
			.filter((student): student is ActiveStudent => student !== undefined && !student.dropOffOnly)
			.map((student) => student.schoolId),
	);
	const orderedSchoolIds = await buildDrivingSchoolOrder(
		supabase,
		schools,
		routableSchoolIds,
		origin,
	);

	const genResult = generateRoutes({
		date,
		attendanceResults: results,
		students: activeStudents,
		schools,
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
		orderedSchoolIds,
	});

	const schoolCoordinates = new Map(schools.map((s) => [s.id, { lat: s.lat, lng: s.lng }]));
	await enrichRouteDistances(supabase, genResult.routes, schoolCoordinates, origin);

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
	const {
		data: { user },
	} = await supabase.auth.getUser();
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
	const {
		data: { user },
	} = await supabase.auth.getUser();
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
	const {
		data: { user },
	} = await supabase.auth.getUser();
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
	const {
		data: { user },
	} = await supabase.auth.getUser();
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
