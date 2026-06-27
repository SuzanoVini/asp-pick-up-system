"use server";

import { revalidatePath } from "next/cache";
import { manualOverrideSchema } from "../lib/schemas/attendance";
import { getAuthorizedUser } from "../lib/security/authorization";
import { createClient } from "../lib/supabase/server";

export async function saveManualOverrideAction(formData: Record<string, unknown>) {
	const parsed = manualOverrideSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	await getAuthorizedUser(supabase);
	const dateStr =
		parsed.data.date instanceof Date
			? parsed.data.date.toISOString().split("T")[0]
			: String(parsed.data.date);

	const { data, error } = await supabase.rpc("save_attendance_override_and_sync_plan", {
		p_student_id: parsed.data.student_id,
		p_date: dateStr,
		p_status: parsed.data.status,
		p_effective_dismissal_time: parsed.data.effective_dismissal_time ?? null,
	});
	if (error) throw error;

	revalidatePath("/attendance");
	revalidatePath(`/attendance?date=${dateStr}`);
	revalidatePath("/route-management");
	revalidatePath(`/route-management?date=${dateStr}`);
	revalidatePath("/route-history");
	revalidatePath(`/route-history?date=${dateStr}`);
	revalidatePath("/kids-and-schools");
	revalidatePath("/");
	return { data };
}
