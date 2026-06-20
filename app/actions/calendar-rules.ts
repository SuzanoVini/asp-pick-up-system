"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import {
	createCalendarRuleSchema,
	updateCalendarRuleSchema,
} from "@/app/lib/schemas/calendar-rule";
import * as rulesDb from "@/app/lib/supabase/calendar-rules";

export async function createCalendarRuleAction(formData: Record<string, unknown>) {
	const parsed = createCalendarRuleSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await rulesDb.createCalendarRule(supabase, parsed.data);

	revalidatePath("/calendar-rules");
	revalidatePath("/attendance");
	return { data };
}

export async function updateCalendarRuleAction(
	id: string,
	formData: Record<string, unknown>,
) {
	const parsed = updateCalendarRuleSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await rulesDb.updateCalendarRule(supabase, id, parsed.data);

	revalidatePath("/calendar-rules");
	revalidatePath("/attendance");
	return { data };
}

export async function toggleRuleActiveAction(id: string, isActive: boolean) {
	const supabase = await createClient();
	const data = await rulesDb.updateCalendarRule(supabase, id, { is_active: isActive });

	revalidatePath("/calendar-rules");
	revalidatePath("/attendance");
	return { data };
}

export async function deleteCalendarRuleAction(id: string) {
	const supabase = await createClient();
	await rulesDb.deleteCalendarRule(supabase, id);

	revalidatePath("/calendar-rules");
	revalidatePath("/attendance");
}
