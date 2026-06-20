"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import * as staffScheduleDb from "@/app/lib/supabase/staff-schedule";

export async function toggleAvailability(
	staffId: string,
	date: string,
	isAvailable: boolean,
) {
	const supabase = await createClient();
	await staffScheduleDb.setAvailability(supabase, staffId, date, isAvailable);
	revalidatePath("/staff-schedule");
}

export async function bulkSetWeek(
	staffIds: string[],
	weekDates: string[],
	isAvailable: boolean,
) {
	const supabase = await createClient();
	await staffScheduleDb.bulkSetWeekAvailability(
		supabase,
		staffIds,
		weekDates,
		isAvailable,
	);
	revalidatePath("/staff-schedule");
}
