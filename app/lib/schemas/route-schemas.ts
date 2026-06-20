import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const routeStatusEnum = z.enum(["draft", "active", "completed", "stale"]);

export const generateRouteSchema = z.object({
	date: z.string().regex(isoDateRegex, "Date must be YYYY-MM-DD format"),
});

export const createRouteStopSchema = z.object({
	route_id: z.string().uuid(),
	student_id: z.string().uuid(),
	school_id: z.string().uuid(),
	seat_number: z.number().int().positive("Seat number must be a positive integer"),
	order_index: z.number().int().nonnegative(),
	needs_booster: z.boolean().default(false),
	student_name_snapshot: z.string().trim().min(1).max(500),
	school_name_snapshot: z.string().trim().min(1).max(500),
	school_address_snapshot: z.string().trim().max(2000).nullable().optional(),
	dismissal_time_snapshot: z.string().nullable().optional(),
	drop_off_only: z
		.boolean()
		.optional()
		.refine((val) => val !== true, "Drop-off-only students cannot be added to routes"),
});

export const updateRouteStopSchema = z.object({
	seat_number: z.number().int().positive("Seat number must be a positive integer").optional(),
	order_index: z.number().int().nonnegative().optional(),
});

export const moveStopSchema = z.object({
	stop_id: z.string().uuid(),
	target_route_id: z.string().uuid(),
	new_seat_number: z.number().int().positive(),
	new_order_index: z.number().int().nonnegative(),
});

export const vehicleAssignmentSchema = z.object({
	vehicle_id: z.string().uuid(),
});

const validTransitions: Record<string, string[]> = {
	draft: ["active", "stale"],
	active: ["completed", "stale"],
	stale: ["active", "draft"],
	completed: ["draft"],
};

export const routeStatusTransitionSchema = z
	.object({
		route_id: z.string().uuid(),
		current_status: routeStatusEnum,
		new_status: routeStatusEnum,
	})
	.refine(
		(data) => {
			const allowed = validTransitions[data.current_status];
			return allowed?.includes(data.new_status) ?? false;
		},
		{
			message: "Invalid route status transition",
		},
	);

export const readinessOverrideSchema = z.object({
	route_id: z.string().uuid(),
	overridden_checks: z.array(z.string().min(1)).min(1, "Must specify which checks to override"),
	reason: z.string().trim().min(1, "Override reason is required").max(2000),
});

export const pdfExportRequestSchema = z.object({
	route_id: z.string().uuid(),
});

export type GenerateRouteInput = z.infer<typeof generateRouteSchema>;
export type CreateRouteStopInput = z.infer<typeof createRouteStopSchema>;
export type UpdateRouteStopInput = z.infer<typeof updateRouteStopSchema>;
export type MoveStopInput = z.infer<typeof moveStopSchema>;
export type VehicleAssignmentInput = z.infer<typeof vehicleAssignmentSchema>;
export type RouteStatusTransitionInput = z.infer<typeof routeStatusTransitionSchema>;
export type ReadinessOverrideInput = z.infer<typeof readinessOverrideSchema>;
export type PdfExportRequestInput = z.infer<typeof pdfExportRequestSchema>;
