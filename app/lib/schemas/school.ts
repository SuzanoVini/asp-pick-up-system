import { z } from "zod";

export const schoolStatusEnum = z.enum(["active", "inactive"]);

export const createSchoolSchema = z.object({
	name: z.string().trim().min(1).max(500),
	address: z.string().trim().max(2000).nullable().optional(),
	standard_dismissal_time: z.string().default("15:00"),
	early_dismissal_time: z.string().default("14:00"),
	status: schoolStatusEnum.default("active"),
});

export const updateSchoolSchema = createSchoolSchema.partial();

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
