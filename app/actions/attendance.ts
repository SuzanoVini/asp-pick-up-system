"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { manualOverrideSchema } from "@/app/lib/schemas/attendance";
import * as attendanceDb from "@/app/lib/supabase/attendance";

export async function saveManualOverrideAction(formData: Record<string, unknown>) {
	const parsed = manualOverrideSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const dateStr =
		parsed.data.date instanceof Date
			? parsed.data.date.toISOString().split("T")[0]
			: String(parsed.data.date);

	const data = await attendanceDb.saveManualOverride(
		supabase,
		parsed.data.student_id,
		dateStr,
		parsed.data.status,
		parsed.data.effective_dismissal_time,
	);

	// If student was marked absent and routes exist, mark routes stale.
	// Route stale-marking is handled via the route system in Plan 3.

	revalidatePath("/attendance");
	revalidatePath("/kids-and-schools");
	revalidatePath("/");
	return { data };
}
