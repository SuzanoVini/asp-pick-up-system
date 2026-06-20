import { createClient } from "@/app/lib/supabase/server";
import { RuleList } from "./rule-list";

export default async function CalendarRulesPage() {
	const supabase = await createClient();

	const [{ data: rules }, { data: schools }, { data: students }] = await Promise.all([
		supabase
			.from("asp_calendar_rules")
			.select("*")
			.order("start_date", { ascending: false }),
		supabase
			.from("asp_schools")
			.select("id, name")
			.eq("status", "active")
			.order("name"),
		supabase
			.from("asp_students")
			.select("id, name")
			.eq("status", "active")
			.order("name"),
	]);

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Calendar Rules</h1>
			<RuleList
				rules={rules ?? []}
				schools={schools ?? []}
				students={students ?? []}
			/>
		</div>
	);
}
