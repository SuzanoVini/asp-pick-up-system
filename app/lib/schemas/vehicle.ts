import { z } from "zod";

export const createVehicleSchema = z.object({
	name: z.string().trim().min(1).max(500),
	total_seats: z.number().int().positive(),
	kids_seats: z.number().int().positive(),
	booster_seats: z.number().int().nonnegative().default(0),
	license_plate: z.string().trim().max(20).nullable().optional(),
	is_active: z.boolean().default(true),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
