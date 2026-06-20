import { z } from "zod";

export const studentStatusEnum = z.enum(["active", "pending", "former"]);

export const createStudentSchema = z.object({
	name: z.string().trim().min(1).max(500),
	school_id: z.string().uuid().nullable().optional(),
	date_of_birth: z.coerce.date().nullable().optional(),
	home_address: z.string().trim().max(2000).nullable().optional(),
	drop_off_only: z.boolean().default(false),
	dismissal_time: z.string().nullable().optional(),
	early_dismissal_time: z.string().nullable().optional(),
	first_pickup_date: z.coerce.date().nullable().optional(),
	status: studentStatusEnum.default("active"),
	comments_pickup: z.string().trim().max(2000).nullable().optional(),
	comments_dropoff: z.string().trim().max(2000).nullable().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
