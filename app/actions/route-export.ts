"use server";

import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { writeRouteAuditEvent } from "../lib/routes/audit";
import type { RouteStop } from "../lib/routes/types";
import { getAuthorizedUser, requireOwner } from "../lib/security/authorization";
import { buildRoutePdf, buildRoutePdfFilename } from "../lib/services/pdf/route-pdf";
import * as routeStopsDb from "../lib/supabase/route-stops";
import * as routesDb from "../lib/supabase/routes";
import { createClient } from "../lib/supabase/server";

export async function exportRoutePdf(routeId: string) {
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const route = await routesDb.getRouteById(supabase, routeId);
	const stopsRaw = await routeStopsDb.getStopsForRoute(supabase, routeId);

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

	await routesDb.markRouteExported(supabase, routeId, user.id);

	await writeRouteAuditEvent(supabase, {
		entityType: "route",
		entityId: routeId,
		action: "update",
		changes: { exported: true, status: "completed" },
		performedBy: user.id,
	});

	revalidatePath("/route-management");
	revalidatePath(`/route-management?date=${route.date}`);
	revalidatePath("/route-history");

	const filename = buildRoutePdfFilename({
		driverName: route.driver_name_snapshot,
		vehicleName: route.vehicle_name_snapshot,
		date: route.date,
		dayOfWeek,
		runNumber: route.run_number,
	});

	return {
		buffer: Array.from(pdfBuffer),
		filename,
		contentType: "application/pdf",
	};
}
