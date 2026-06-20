import { z } from "zod";

export const attendanceStatusEnum = z.enum(["P", "A", "N", "E", "ED", "D"]);

export const manualOverrideSchema = z.object({
	student_id: z.string().uuid(),
	date: z.coerce.date(),
	status: attendanceStatusEnum,
	effective_dismissal_time: z.string().nullable().optional(),
});

export type ManualOverrideInput = z.infer<typeof manualOverrideSchema>;
