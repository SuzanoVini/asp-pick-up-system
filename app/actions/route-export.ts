"use server";

import { format } from "date-fns";
import { zipSync } from "fflate";
import { revalidatePath } from "next/cache";
import { writeRouteAuditEvent } from "../lib/routes/audit";
import type { RouteStop } from "../lib/routes/types";
import { getAuthorizedUser, requireOwner } from "../lib/security/authorization";
import { buildRoutePdf, buildRoutePdfFilename } from "../lib/services/pdf/route-pdf";
import * as routeStopsDb from "../lib/supabase/route-stops";
import * as routesDb from "../lib/supabase/routes";
import { createClient } from "../lib/supabase/server";

type RouteRow = Awaited<ReturnType<typeof routesDb.getRouteById>>;
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Renders one lane to PDF and records the export. Shared by the per-lane export
 * (route history) and the plan-wide zip export (route management).
 */
async function exportOneRoute(supabase: SupabaseClient, route: RouteRow, userId: string) {
	const stopsRaw = await routeStopsDb.getStopsForRoute(supabase, route.id);

	const stops: RouteStop[] = (stopsRaw ?? []).map((s) => ({
		id: s.id,
		routeId: s.route_id,
		studentId: s.student_id,
		schoolId: s.school_id,
		seatNumber: s.seat_number,
		orderIndex: s.order_index,
		distanceFromPrevKm: s.distance_from_prev_km,
		durationFromPrevMin: s.duration_from_prev_min,
		needsBooster: s.needs_booster,
		studentNameSnapshot: s.student_name_snapshot,
		schoolNameSnapshot: s.school_name_snapshot,
		schoolAddressSnapshot: s.school_address_snapshot,
		dismissalTimeSnapshot: s.dismissal_time_snapshot,
		responsibleStaffId: s.responsible_staff_id,
		responsibleStaffNameSnapshot: s.responsible_staff_name_snapshot,
	}));

	const date = new Date(`${route.date}T00:00:00`);
	const dayOfWeek = format(date, "EEEE");

	const pdfBuffer = await buildRoutePdf({
		vehicleName: route.vehicle_name_snapshot,
		plateNumber: route.plate_number_snapshot,
		runNumber: route.run_number,
		driverName: route.driver_name_snapshot,
		helperName: route.helper_name_snapshot,
		date: route.date,
		dayOfWeek,
		stops,
		totalDistanceKm: route.total_distance_km,
	});

	await routesDb.markRouteExported(supabase, route.id, userId);

	await writeRouteAuditEvent(supabase, {
		entityType: "route",
		entityId: route.id,
		action: "update",
		changes: { exported: true },
		performedBy: userId,
	});

	const filename = buildRoutePdfFilename({
		driverName: route.driver_name_snapshot,
		vehicleName: route.vehicle_name_snapshot,
		date: route.date,
		dayOfWeek,
		runNumber: route.run_number,
	});

	return { pdfBuffer, filename };
}

function revalidateExport(date: string) {
	revalidatePath("/route-management");
	revalidatePath(`/route-management?date=${date}`);
	revalidatePath("/route-history");
}

export async function exportRoutePdf(routeId: string) {
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const route = await routesDb.getRouteById(supabase, routeId);
	const { pdfBuffer, filename } = await exportOneRoute(supabase, route, user.id);

	revalidateExport(route.date);

	return {
		buffer: Array.from(pdfBuffer),
		filename,
		contentType: "application/pdf",
	};
}

/**
 * Exports every lane of a day's plan in one click: one PDF per lane, bundled
 * into a single zip so the whole day downloads and prints as one unit.
 */
export async function exportPlanPdfs(planId: string) {
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const routes = await routesDb.getRoutesForPlan(supabase, planId);
	if (routes.length === 0) throw new Error("No route lanes to export for this date");

	const files: Record<string, Uint8Array> = {};
	for (const route of routes) {
		const { pdfBuffer, filename } = await exportOneRoute(supabase, route, user.id);
		// ponytail: identical driver+vehicle+run would collide; suffix on collision
		// rather than tracking uniqueness up front.
		let name = filename;
		for (let n = 2; files[name]; n += 1) name = filename.replace(/\.pdf$/, `-${n}.pdf`);
		files[name] = new Uint8Array(pdfBuffer);
	}

	const date = routes[0].date;
	revalidateExport(date);

	return {
		buffer: Array.from(zipSync(files)),
		filename: `asp-routes-${date}.zip`,
		contentType: "application/zip",
	};
}
