"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import * as routesDb from "@/app/lib/supabase/routes";
import * as routeStopsDb from "@/app/lib/supabase/route-stops";
import * as staffScheduleDb from "@/app/lib/supabase/staff-schedule";
import { writeRouteAuditEvent } from "@/app/lib/routes/audit";

export async function moveStopBetweenVehicles(
	stopId: string,
	targetRouteId: string,
	newSeatNumber: number,
	newOrderIndex: number,
) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	await routeStopsDb.updateStop(supabase, stopId, {
		route_id: targetRouteId,
		seat_number: newSeatNumber,
		order_index: newOrderIndex,
	});

	await writeRouteAuditEvent(supabase, {
		entityType: "route_stop",
		entityId: stopId,
		action: "update",
		changes: { moved_to_route: targetRouteId },
		performedBy: user.id,
	});

	revalidatePath("/routes");
}

export async function reorderStops(routeId: string, stopOrder: { id: string; orderIndex: number; seatNumber: number }[]) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	for (const stop of stopOrder) {
		await routeStopsDb.updateStop(supabase, stop.id, {
			order_index: stop.orderIndex,
			seat_number: stop.seatNumber,
		});
	}

	revalidatePath("/routes");
}

export async function addUnroutedStudent(
	routeId: string,
	input: {
		student_id: string;
		school_id: string;
		seat_number: number;
		order_index: number;
		needs_booster: boolean;
		student_name_snapshot: string;
		school_name_snapshot: string;
		school_address_snapshot: string | null;
		dismissal_time_snapshot: string | null;
	},
) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const route = await routesDb.getRouteById(supabase, routeId);
	if (route.status === "completed") {
		throw new Error("Cannot add stops to a completed route");
	}

	await routeStopsDb.createStop(supabase, {
		route_id: routeId,
		...input,
	});

	await writeRouteAuditEvent(supabase, {
		entityType: "route_stop",
		entityId: routeId,
		action: "create",
		changes: { student_id: input.student_id, added: true },
		performedBy: user.id,
	});

	revalidatePath("/routes");
}

export async function removeStudentFromRoute(stopId: string) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	await routeStopsDb.removeStop(supabase, stopId);

	await writeRouteAuditEvent(supabase, {
		entityType: "route_stop",
		entityId: stopId,
		action: "delete",
		changes: null,
		performedBy: user.id,
	});

	revalidatePath("/routes");
}

export async function updateStaffAssignment(
	assignmentId: string,
	input: Record<string, unknown>,
) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	await staffScheduleDb.updateAssignment(supabase, assignmentId, input);

	revalidatePath("/routes");
	revalidatePath("/staff-schedule");
}

export async function completeRoute(routeId: string) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	await routesDb.markRouteExported(supabase, routeId, user.id);

	await writeRouteAuditEvent(supabase, {
		entityType: "route",
		entityId: routeId,
		action: "update",
		changes: { status: { from: "active", to: "completed" } },
		performedBy: user.id,
	});

	revalidatePath("/routes");
}
