import { createClient } from "@/app/lib/supabase/server";
import { SchoolList } from "./school-list";

export default async function SchoolsPage() {
	const supabase = await createClient();
	const { data: schools } = await supabase
		.from("asp_schools")
		.select("*")
		.order("name");

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Schools</h1>
			<SchoolList schools={schools ?? []} />
		</div>
	);
}
