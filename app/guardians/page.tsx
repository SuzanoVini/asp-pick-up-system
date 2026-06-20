import { createClient } from "@/app/lib/supabase/server";
import { GuardianList } from "./guardian-list";

export default async function GuardiansPage() {
	const supabase = await createClient();
	const [{ data: guardians }, { data: students }] = await Promise.all([
		supabase.from("asp_guardians").select("*").order("name"),
		supabase.from("asp_students").select("id, name").order("name"),
	]);

	const studentNames: Record<string, string> = {};
	for (const s of students ?? []) {
		studentNames[s.id] = s.name;
	}

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Guardians</h1>
			<GuardianList
				guardians={guardians ?? []}
				students={students ?? []}
				studentNames={studentNames}
			/>
		</div>
	);
}
