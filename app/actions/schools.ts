"use server";

import { revalidatePath } from "next/cache";
import { createSchoolSchema, updateSchoolSchema } from "@/app/lib/schemas/school";
import * as schoolsDb from "@/app/lib/supabase/schools";
import { createClient } from "@/app/lib/supabase/server";

export async function createSchoolAction(formData: Record<string, unknown>) {
	const parsed = createSchoolSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await schoolsDb.createSchool(supabase, parsed.data);

	revalidatePath("/schools");
	return { data };
}

export async function updateSchoolAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateSchoolSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await schoolsDb.updateSchool(supabase, id, parsed.data);

	revalidatePath("/schools");
	return { data };
}

export async function deleteSchoolAction(id: string) {
	const supabase = await createClient();
	await schoolsDb.deleteSchool(supabase, id);

	revalidatePath("/schools");
}
