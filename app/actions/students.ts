"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { createStudentSchema, updateStudentSchema } from "@/app/lib/schemas/student";
import * as studentsDb from "@/app/lib/supabase/students";

export async function createStudentAction(formData: Record<string, unknown>) {
	const parsed = createStudentSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await studentsDb.createStudent(supabase, parsed.data);

	revalidatePath("/students");
	return { data };
}

export async function updateStudentAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateStudentSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	const data = await studentsDb.updateStudent(supabase, id, parsed.data);

	revalidatePath("/students");
	revalidatePath(`/students/${id}`);
	return { data };
}

export async function changeStudentStatusAction(id: string, status: string) {
	const supabase = await createClient();
	const data = await studentsDb.updateStudent(supabase, id, { status });

	revalidatePath("/students");
	revalidatePath("/former-students");
	return { data };
}

export async function deleteStudentAction(id: string) {
	const supabase = await createClient();
	await studentsDb.deleteStudent(supabase, id);

	revalidatePath("/students");
}
