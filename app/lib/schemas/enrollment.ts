import { z } from "zod";

const dayOfWeek = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri"]);

export const enrollmentStatusEnum = z.enum(["pending", "active", "cancelled"]);

export const createEnrollmentSchema = z
	.object({
		student_id: z.string().uuid(),
		start_date: z.coerce.date(),
		end_date: z.coerce.date().nullable().optional(),
		contract_days: z.array(dayOfWeek).min(1).max(5),
		status: enrollmentStatusEnum.default("pending"),
		notes: z.string().trim().max(2000).nullable().optional(),
	})
	.refine(
		(data) => {
			if (data.end_date && data.start_date) {
				return data.end_date >= data.start_date;
			}
			return true;
		},
		{ message: "End date must be on or after start date", path: ["end_date"] },
	);

export const updateEnrollmentSchema = z
	.object({
		start_date: z.coerce.date().optional(),
		end_date: z.coerce.date().nullable().optional(),
		contract_days: z.array(dayOfWeek).min(1).max(5).optional(),
		status: enrollmentStatusEnum.optional(),
		notes: z.string().trim().max(2000).nullable().optional(),
	})
	.refine(
		(data) => {
			if (data.end_date && data.start_date) {
				return data.end_date >= data.start_date;
			}
			return true;
		},
		{ message: "End date must be on or after start date", path: ["end_date"] },
	);

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
