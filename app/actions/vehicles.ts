"use server";

import { revalidatePath } from "next/cache";
import { createVehicleSchema, updateVehicleSchema } from "@/app/lib/schemas/vehicle";
import { createClient } from "@/app/lib/supabase/server";
import * as vehiclesDb from "@/app/lib/supabase/vehicles";

export async function createVehicleAction(formData: Record<string, unknown>) {
	const parsed = createVehicleSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await vehiclesDb.createVehicle(supabase, parsed.data);

	revalidatePath("/vehicles");
	return { data };
}

export async function updateVehicleAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateVehicleSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await vehiclesDb.updateVehicle(supabase, id, parsed.data);

	revalidatePath("/vehicles");
	return { data };
}

export async function deleteVehicleAction(id: string) {
	const supabase = await createClient();
	await vehiclesDb.deleteVehicle(supabase, id);

	revalidatePath("/vehicles");
}
