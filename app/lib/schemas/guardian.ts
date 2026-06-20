import { z } from "zod";

export const createGuardianSchema = z.object({
	student_id: z.string().uuid(),
	name: z.string().trim().min(1).max(500),
	phone: z.string().trim().max(50).nullable().optional(),
	email: z.string().trim().email().max(500).nullable().optional(),
	is_primary: z.boolean().default(true),
});

export const updateGuardianSchema = createGuardianSchema.omit({ student_id: true }).partial();

export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
