import { z } from "zod";
import { READINESS_CHECK_NAMES } from "../routes/types";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
	const match = isoDateRegex.exec(value);
	if (!match) return false;
	const year = Number(value.slice(0, 4));
	if (year === 0) return false;
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	const parsed = new Date(0);
	parsed.setUTCHours(0, 0, 0, 0);
	parsed.setUTCFullYear(year, month - 1, day);
	return (
		parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === day
	);
}

export const isoDateSchema = z
	.string()
	.regex(isoDateRegex, "Date must be YYYY-MM-DD format")
	.refine(isCalendarDate, "Date must be a valid calendar date");
export const uuidSchema = z.string().uuid();
export const nullableUuidSchema = uuidSchema.nullable();

const readinessCheckNamesSchema = z
	.array(z.enum(READINESS_CHECK_NAMES))
	.max(READINESS_CHECK_NAMES.length)
	.refine((names) => new Set(names).size === names.length, "Readiness check names must be unique");

export const createOrRefreshRoutePlanSchema = z.object({ date: isoDateSchema });
export const addRouteTableSchema = z.object({ planId: uuidSchema });
export const removeRouteTableSchema = z.object({
	routeId: uuidSchema,
	confirmNonEmpty: z.boolean().optional(),
});
export const setRouteVehicleSchema = z.object({
	routeId: uuidSchema,
	vehicleId: nullableUuidSchema,
});
export const setRouteStaffSchema = z.object({
	routeId: uuidSchema,
	role: z.enum(["driver", "helper"]),
	staffId: nullableUuidSchema,
});
export const assignStudentSchema = z.object({
	routeId: uuidSchema,
	studentId: uuidSchema,
	responsibleStaffId: nullableUuidSchema,
});
export const assignSchoolGroupSchema = z.object({
	routeId: uuidSchema,
	schoolId: uuidSchema,
});
export const removeStudentStopSchema = z.object({ stopId: uuidSchema });
export const moveStudentStopSchema = z.object({
	stopId: uuidSchema,
	targetRouteId: uuidSchema,
});
export const reorderRouteStopsSchema = z.object({
	routeId: uuidSchema,
	orderedStopIds: z
		.array(uuidSchema)
		.min(1)
		.refine((ids) => new Set(ids).size === ids.length, "Stop IDs must be unique"),
});
export const updateStopResponsibleStaffSchema = z.object({
	stopId: uuidSchema,
	staffId: nullableUuidSchema,
});
export const finalizeRoutePlanSchema = z.object({
	planId: uuidSchema,
	acknowledgedWarnings: readinessCheckNamesSchema,
	override: z
		.object({
			checkNames: readinessCheckNamesSchema.min(1),
			reason: z.string().trim().min(1).max(2000),
		})
		.nullable(),
});
export const exportRouteSchema = z.object({ routeId: uuidSchema });
export const reopenRoutePlanSchema = z.object({
	planId: uuidSchema,
	reason: z.string().trim().min(1).max(2000),
});
export const markStaleRouteReviewedSchema = z.object({ routeId: uuidSchema });

export type CreateOrRefreshRoutePlanInput = z.infer<typeof createOrRefreshRoutePlanSchema>;
export type AddRouteTableInput = z.infer<typeof addRouteTableSchema>;
export type RemoveRouteTableInput = z.infer<typeof removeRouteTableSchema>;
export type SetRouteVehicleInput = z.infer<typeof setRouteVehicleSchema>;
export type SetRouteStaffInput = z.infer<typeof setRouteStaffSchema>;
export type AssignStudentInput = z.infer<typeof assignStudentSchema>;
export type AssignSchoolGroupInput = z.infer<typeof assignSchoolGroupSchema>;
export type RemoveStudentStopInput = z.infer<typeof removeStudentStopSchema>;
export type MoveStudentStopInput = z.infer<typeof moveStudentStopSchema>;
export type ReorderRouteStopsInput = z.infer<typeof reorderRouteStopsSchema>;
export type UpdateStopResponsibleStaffInput = z.infer<typeof updateStopResponsibleStaffSchema>;
export type FinalizeRoutePlanInput = z.infer<typeof finalizeRoutePlanSchema>;
export type ExportRouteInput = z.infer<typeof exportRouteSchema>;
export type ReopenRoutePlanInput = z.infer<typeof reopenRoutePlanSchema>;
export type MarkStaleRouteReviewedInput = z.infer<typeof markStaleRouteReviewedSchema>;
