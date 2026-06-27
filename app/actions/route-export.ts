"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import * as routesDb from "@/app/lib/supabase/routes";
import * as routeStopsDb from "@/app/lib/supabase/route-stops";
import { buildRoutePdf, buildRoutePdfFilename } from "@/app/lib/services/pdf/route-pdf";
import { writeRouteAuditEvent } from "@/app/lib/routes/audit";
import { validateReadiness } from "@/app/lib/routes/readiness";
import type { RouteStop, VehicleRoute } from "@/app/lib/routes/types";
import { format } from "date-fns";

export async function exportRoutePdf(routeId: string) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

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
	}));

	const date = new Date(`${route.date}T00:00:00`);
	const dayOfWeek = format(date, "EEEE");

	const pdfBuffer = await buildRoutePdf({
		vehicleName: route.vehicle_name_snapshot,
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

	revalidatePath("/routes");
	revalidatePath("/route-management");

	const filename = buildRoutePdfFilename({
		driverName: route.driver_name_snapshot,
		vehicleName: route.vehicle_name_snapshot,
		date: route.date,
		dayOfWeek,
	});

	return {
		buffer: Array.from(pdfBuffer),
		filename,
		contentType: "application/pdf",
	};
}
