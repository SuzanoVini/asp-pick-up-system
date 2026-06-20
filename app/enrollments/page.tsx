import { createClient } from "@/app/lib/supabase/server";
import { EnrollmentList } from "./enrollment-list";

export default async function EnrollmentsPage() {
	const supabase = await createClient();
	const [{ data: enrollments }, { data: students }] = await Promise.all([
		supabase.from("asp_enrollments").select("*").order("start_date", { ascending: false }),
		supabase.from("asp_students").select("id, name").order("name"),
	]);

	const studentNames: Record<string, string> = {};
	for (const s of students ?? []) {
		studentNames[s.id] = s.name;
	}

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Enrollments</h1>
			<EnrollmentList
				enrollments={enrollments ?? []}
				students={students ?? []}
				studentNames={studentNames}
			/>
		</div>
	);
}
