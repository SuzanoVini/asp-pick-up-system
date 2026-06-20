import { z } from "zod";

const capability = z.enum(["driver", "helper"]);

export const createStaffSchema = z.object({
	name: z.string().trim().min(1).max(500),
	capabilities: z.array(capability).min(1).max(2),
	is_active: z.boolean().default(true),
});

export const updateStaffSchema = createStaffSchema.partial();

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
