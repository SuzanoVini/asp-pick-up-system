"use server";

import { revalidatePath } from "next/cache";
import { createWaitlistSchema, updateWaitlistSchema } from "@/app/lib/schemas/waitlist";
import { createClient } from "@/app/lib/supabase/server";
import * as waitlistDb from "@/app/lib/supabase/waitlist";

export async function createWaitlistAction(formData: Record<string, unknown>) {
	const parsed = createWaitlistSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await waitlistDb.createWaitlistEntry(supabase, parsed.data);

	revalidatePath("/waitlist");
	return { data };
}

export async function updateWaitlistAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateWaitlistSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await waitlistDb.updateWaitlistEntry(supabase, id, parsed.data);

	revalidatePath("/waitlist");
	return { data };
}

export async function deleteWaitlistAction(id: string) {
	const supabase = await createClient();
	await waitlistDb.deleteWaitlistEntry(supabase, id);

	revalidatePath("/waitlist");
}
