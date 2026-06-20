"use server";

import { revalidatePath } from "next/cache";
import { createEnrollmentSchema, updateEnrollmentSchema } from "@/app/lib/schemas/enrollment";
import * as enrollmentsDb from "@/app/lib/supabase/enrollments";
import { createClient } from "@/app/lib/supabase/server";
import * as studentsDb from "@/app/lib/supabase/students";

export async function createEnrollmentAction(formData: Record<string, unknown>) {
	const parsed = createEnrollmentSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await enrollmentsDb.createEnrollment(supabase, parsed.data);

	if (parsed.data.status === "active") {
		await studentsDb.updateStudent(supabase, parsed.data.student_id, { status: "active" });
	}

	revalidatePath("/enrollments");
	revalidatePath("/students");
	return { data };
}

export async function updateEnrollmentAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateEnrollmentSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await enrollmentsDb.updateEnrollment(supabase, id, parsed.data);

	revalidatePath("/enrollments");
	revalidatePath("/students");
	return { data };
}

export async function cancelEnrollmentAction(id: string) {
	const supabase = await createClient();
	const enrollment = await enrollmentsDb.getEnrollmentById(supabase, id);

	await enrollmentsDb.updateEnrollment(supabase, id, { status: "cancelled" });

	const remaining = await enrollmentsDb.countActiveEnrollments(supabase, enrollment.student_id);

	// Cancelling the last active enrollment transitions student to former
	if (remaining === 0) {
		await studentsDb.updateStudent(supabase, enrollment.student_id, { status: "former" });
	}

	revalidatePath("/enrollments");
	revalidatePath("/students");
	revalidatePath("/former-students");
	return { success: true };
}

export async function activateEnrollmentAction(id: string) {
	const supabase = await createClient();
	const enrollment = await enrollmentsDb.getEnrollmentById(supabase, id);

	await enrollmentsDb.updateEnrollment(supabase, id, { status: "active" });

	// Activating an enrollment also activates the student
	await studentsDb.updateStudent(supabase, enrollment.student_id, { status: "active" });

	revalidatePath("/enrollments");
	revalidatePath("/students");
	revalidatePath("/former-students");
	return { success: true };
}
