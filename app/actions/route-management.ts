"use server";

import { revalidatePath } from "next/cache";
import { materializeAttendanceForDate } from "../lib/routes/materialize-attendance";
import {
	type CreateOrRefreshRoutePlanInput,
	createOrRefreshRoutePlanSchema,
} from "../lib/schemas/route-management-schemas";
import { getAuthorizedUser, requireOwner } from "../lib/security/authorization";
import { getPlanForDate, replacePlanSnapshot } from "../lib/supabase/route-plans";
import { getRoutesForPlan } from "../lib/supabase/routes";
import { createClient } from "../lib/supabase/server";

export async function createOrRefreshRoutePlan(input: CreateOrRefreshRoutePlanInput) {
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const { date } = createOrRefreshRoutePlanSchema.parse(input);
	const attendance = await materializeAttendanceForDate(supabase, date);
	const existingPlan = await getPlanForDate(supabase, date);
	const routes = existingPlan ? await getRoutesForPlan(supabase, existingPlan.id) : [];
	let plan = existingPlan;

	if (!existingPlan || (existingPlan.status === "draft" && routes.length === 0)) {
		const [studentsResult, schoolsResult] = await Promise.all([
			supabase
				.from("asp_students")
				.select("id, name, school_id, drop_off_only")
				.eq("status", "active"),
			supabase.from("asp_schools").select("id, name"),
		]);
		if (studentsResult.error) throw studentsResult.error;
		if (schoolsResult.error) throw schoolsResult.error;

		const students = new Map((studentsResult.data ?? []).map((student) => [student.id, student]));
		const schools = new Map((schoolsResult.data ?? []).map((school) => [school.id, school]));
		const snapshots = attendance.map((result) => {
			const student = students.get(result.studentId);
			if (!student) throw new Error(`Missing student metadata for ${result.studentId}`);
			const school = student.school_id ? schools.get(student.school_id) : null;
			if (student.school_id && !school) {
				throw new Error(`Missing school metadata for ${student.school_id}`);
			}
			return {
				student_id: result.studentId,
				school_id: school?.id ?? null,
				attendance_status: result.status,
				drop_off_only: student.drop_off_only ?? false,
				needs_booster: result.needsBooster,
				student_name_snapshot: student.name,
				school_name_snapshot: school?.name ?? "Unassigned school",
			};
		});

		plan = await replacePlanSnapshot(supabase, date, snapshots);
	}

	revalidatePath("/route-management");
	revalidatePath(`/route-management?date=${date}`);
	return plan;
}
