import { createClient } from "@/app/lib/supabase/server";
import { WaitlistList } from "./waitlist-list";

export default async function WaitlistPage() {
	const supabase = await createClient();
	const { data: entries } = await supabase
		.from("asp_waitlist")
		.select("*")
		.order("waitlisted_on", { ascending: false });

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Waitlist</h1>
			<WaitlistList entries={entries ?? []} />
		</div>
	);
}
