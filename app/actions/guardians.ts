"use server";

import { revalidatePath } from "next/cache";
import { createGuardianSchema, updateGuardianSchema } from "@/app/lib/schemas/guardian";
import * as guardiansDb from "@/app/lib/supabase/guardians";
import { createClient } from "@/app/lib/supabase/server";

export async function createGuardianAction(formData: Record<string, unknown>) {
	const parsed = createGuardianSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await guardiansDb.createGuardian(supabase, parsed.data);

	revalidatePath("/guardians");
	revalidatePath(`/students/${parsed.data.student_id}`);
	return { data };
}

export async function updateGuardianAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateGuardianSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await guardiansDb.updateGuardian(supabase, id, parsed.data);

	revalidatePath("/guardians");
	return { data };
}

export async function deleteGuardianAction(id: string) {
	const supabase = await createClient();
	await guardiansDb.deleteGuardian(supabase, id);

	revalidatePath("/guardians");
}
