import { createClient } from "@/app/lib/supabase/server";
import { StudentList } from "./student-list";

export default async function StudentsPage() {
	const supabase = await createClient();

	const [{ data: students }, { data: schools }, { data: guardians }, { data: enrollments }] =
		await Promise.all([
			supabase.from("asp_students").select("*").order("name"),
			supabase.from("asp_schools").select("id, name").eq("status", "active").order("name"),
			supabase.from("asp_guardians").select("*"),
			supabase.from("asp_enrollments").select("*").order("start_date", { ascending: false }),
		]);

	const guardianList = guardians ?? [];
	const guardiansByStudent: Record<string, typeof guardianList> = {};
	for (const g of guardianList) {
		if (!guardiansByStudent[g.student_id]) guardiansByStudent[g.student_id] = [];
		guardiansByStudent[g.student_id]?.push(g);
	}

	const enrollmentList = enrollments ?? [];
	const enrollmentsByStudent: Record<string, typeof enrollmentList> = {};
	for (const e of enrollmentList) {
		if (!enrollmentsByStudent[e.student_id]) enrollmentsByStudent[e.student_id] = [];
		enrollmentsByStudent[e.student_id]?.push(e);
	}

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Students</h1>
			<StudentList
				students={students ?? []}
				schools={schools ?? []}
				guardiansByStudent={guardiansByStudent}
				enrollmentsByStudent={enrollmentsByStudent}
			/>
		</div>
	);
}
