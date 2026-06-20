import { createClient } from "@/app/lib/supabase/server";
import { FormerStudentList } from "./former-student-list";

export default async function FormerStudentsPage() {
	const supabase = await createClient();
	const [{ data: students }, { data: schools }] = await Promise.all([
		supabase.from("asp_students").select("*").eq("status", "former").order("name"),
		supabase.from("asp_schools").select("id, name"),
	]);

	const schoolNames: Record<string, string> = {};
	for (const s of schools ?? []) {
		schoolNames[s.id] = s.name;
	}

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Former Students</h1>
			<FormerStudentList students={students ?? []} schoolNames={schoolNames} />
		</div>
	);
}
