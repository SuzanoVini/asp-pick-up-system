import { z } from "zod";

export const waitlistStatusEnum = z.enum(["waiting", "offered", "enrolled", "declined"]);

export const createWaitlistSchema = z.object({
	child_name: z.string().trim().min(1).max(500),
	date_of_birth: z.coerce.date().nullable().optional(),
	school_name: z.string().trim().max(500).nullable().optional(),
	parent_name: z.string().trim().max(500).nullable().optional(),
	parent_email: z.string().trim().email().max(500).nullable().optional(),
	parent_phone: z.string().trim().max(50).nullable().optional(),
	intended_days: z
		.array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri"]))
		.nullable()
		.optional(),
	status: waitlistStatusEnum.default("waiting"),
});

export const updateWaitlistSchema = createWaitlistSchema.partial();

export type CreateWaitlistInput = z.infer<typeof createWaitlistSchema>;
export type UpdateWaitlistInput = z.infer<typeof updateWaitlistSchema>;
