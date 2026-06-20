import { createClient } from "@/app/lib/supabase/server";
import { StaffList } from "./staff-list";

export default async function StaffPage() {
	const supabase = await createClient();
	const { data: staff } = await supabase.from("asp_staff").select("*").order("name");

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Staff</h1>
			<StaffList staffMembers={staff ?? []} />
		</div>
	);
}
