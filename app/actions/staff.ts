"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { createStaffSchema, updateStaffSchema } from "@/app/lib/schemas/staff";
import * as staffDb from "@/app/lib/supabase/staff";

export async function createStaffAction(formData: Record<string, unknown>) {
	const parsed = createStaffSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await staffDb.createStaffMember(supabase, parsed.data);

	revalidatePath("/staff");
	return { data };
}

export async function updateStaffAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateStaffSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await staffDb.updateStaffMember(supabase, id, parsed.data);

	revalidatePath("/staff");
	return { data };
}

export async function deleteStaffAction(id: string) {
	const supabase = await createClient();
	await staffDb.deleteStaffMember(supabase, id);

	revalidatePath("/staff");
}
