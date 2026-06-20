import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const staffRoleEnum = z.enum(["driver", "helper"]);

export const staffAvailabilityToggleSchema = z.object({
	staff_id: z.string().uuid(),
	date: z.string().regex(isoDateRegex, "Date must be YYYY-MM-DD format"),
	is_available: z.boolean(),
});

export const bulkWeekAvailabilitySchema = z.object({
	week_start_date: z.string().regex(isoDateRegex, "Date must be YYYY-MM-DD format"),
	staff_ids: z.array(z.string().uuid()).min(1, "At least one staff member required"),
});

export const staffAssignmentSchema = z.object({
	staff_id: z.string().uuid(),
	date: z.string().regex(isoDateRegex, "Date must be YYYY-MM-DD format"),
	vehicle_id: z.string().uuid(),
	role: staffRoleEnum,
});

export type StaffAvailabilityToggleInput = z.infer<typeof staffAvailabilityToggleSchema>;
export type BulkWeekAvailabilityInput = z.infer<typeof bulkWeekAvailabilitySchema>;
export type StaffAssignmentInput = z.infer<typeof staffAssignmentSchema>;
