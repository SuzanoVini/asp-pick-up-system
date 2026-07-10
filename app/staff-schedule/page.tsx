import { addDays, format, startOfWeek } from "date-fns";
import { createClient } from "@/app/lib/supabase/server";
import { StaffScheduleGrid } from "./staff-schedule-grid";

export default async function StaffSchedulePage() {
	const supabase = await createClient();

	const today = new Date();
	const monday = startOfWeek(today, { weekStartsOn: 1 });
	const weekStart = format(monday, "yyyy-MM-dd");

	const weekDates = Array.from({ length: 5 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd"));

	const [{ data: staff }, { data: availability }, { data: assignments }] = await Promise.all([
		supabase.from("asp_staff").select("*").order("name"),
		supabase
			.from("asp_staff_availability")
			.select("staff_id, date, is_available")
			.in("date", weekDates),
		supabase
			.from("asp_staff_assignments")
			.select("staff_id, date, role, asp_vehicles(name)")
			.in("date", weekDates),
	]);

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Staff Schedule</h1>
			<StaffScheduleGrid
				staff={staff ?? []}
				initialAvailability={availability ?? []}
				initialAssignments={
					(assignments ?? []) as unknown as Array<{
						staff_id: string;
						date: string;
						role: string;
						asp_vehicles?: { name: string } | null;
					}>
				}
				initialWeekStart={weekStart}
			/>
		</div>
	);
}
