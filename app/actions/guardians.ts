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
	try {
		const data = await guardiansDb.createGuardian(supabase, parsed.data);
		revalidatePath("/guardians");
		revalidatePath(`/students/${parsed.data.student_id}`);
		return { data };
	} catch (error) {
		if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
			return { error: { student_id: ["Select an existing student"] } };
		}

		return { error: { _form: ["Could not create guardian. Please try again."] } };
	}
}

export async function updateGuardianAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateGuardianSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	try {
		const data = await guardiansDb.updateGuardian(supabase, id, parsed.data);
		revalidatePath("/guardians");
		return { data };
	} catch {
		return { error: { _form: ["Could not update guardian. Please try again."] } };
	}
}

export async function deleteGuardianAction(id: string) {
	const supabase = await createClient();
	await guardiansDb.deleteGuardian(supabase, id);

	revalidatePath("/guardians");
}
