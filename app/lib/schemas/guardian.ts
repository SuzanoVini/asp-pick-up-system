import { z } from "zod";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createGuardianSchema = z.object({
	student_id: z
		.string()
		.trim()
		.min(1, "Select a student")
		.refine((value) => uuidPattern.test(value), "Invalid student selected"),
	name: z.string().trim().min(1).max(500),
	phone: z.string().trim().max(50).nullable().optional(),
	email: z.string().trim().email().max(500).nullable().optional(),
	is_primary: z.boolean().default(true),
});

export const updateGuardianSchema = createGuardianSchema.omit({ student_id: true }).partial();

export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
