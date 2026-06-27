import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAvailableStaffAndAssignmentsForDate(
	supabase: SupabaseClient,
	date: string,
) {
	const [staffResult, assignmentsResult] = await Promise.all([
		supabase
			.from("asp_staff")
			.select("*, asp_staff_availability!inner(date, is_available)")
			.eq("is_active", true)
			.eq("asp_staff_availability.date", date)
			.eq("asp_staff_availability.is_available", true)
			.order("name"),
		supabase
			.from("asp_staff_assignments")
			.select("*, asp_staff(name, capabilities), asp_vehicles(name)")
			.eq("date", date),
	]);
	if (staffResult.error) throw staffResult.error;
	if (assignmentsResult.error) throw assignmentsResult.error;
	return { staff: staffResult.data, assignments: assignmentsResult.data };
}

export async function upsertAssignmentForVehicleDate(
	supabase: SupabaseClient,
	staffId: string,
	date: string,
	vehicleId: string,
	role: "driver" | "helper",
) {
	const { data, error } = await supabase.rpc("upsert_staff_assignment_for_vehicle_date", {
		p_staff_id: staffId,
		p_date: date,
		p_vehicle_id: vehicleId,
		p_role: role,
	});
	if (error) throw error;
	return data;
}

export async function removeAssignmentForVehicleDateRole(
	supabase: SupabaseClient,
	date: string,
	vehicleId: string,
	role: "driver" | "helper",
) {
	const { data, error } = await supabase.rpc("remove_staff_assignment_for_vehicle_date_role", {
		p_date: date,
		p_vehicle_id: vehicleId,
		p_role: role,
	});
	if (error) throw error;
	return data;
}

export async function getAvailabilityForWeek(supabase: SupabaseClient, weekDates: string[]) {
	const { data, error } = await supabase
		.from("asp_staff_availability")
		.select("*, asp_staff(name, capabilities, is_active)")
		.in("date", weekDates)
		.order("date");

	if (error) throw error;
	return data;
}

export async function getAvailabilityForDate(supabase: SupabaseClient, date: string) {
	const { data, error } = await supabase
		.from("asp_staff_availability")
		.select("*, asp_staff(name, capabilities, is_active)")
		.eq("date", date)
		.eq("is_available", true);

	if (error) throw error;
	return data;
}

export async function setAvailability(
	supabase: SupabaseClient,
	staffId: string,
	date: string,
	isAvailable: boolean,
) {
	const { data, error } = await supabase
		.from("asp_staff_availability")
		.upsert({ staff_id: staffId, date, is_available: isAvailable }, { onConflict: "staff_id,date" })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function bulkSetWeekAvailability(
	supabase: SupabaseClient,
	staffIds: string[],
	weekDates: string[],
	isAvailable: boolean,
) {
	const rows = staffIds.flatMap((staffId) =>
		weekDates.map((date) => ({
			staff_id: staffId,
			date,
			is_available: isAvailable,
		})),
	);

	const { data, error } = await supabase
		.from("asp_staff_availability")
		.upsert(rows, { onConflict: "staff_id,date" })
		.select();

	if (error) throw error;
	return data;
}

export async function getAssignmentsForDate(supabase: SupabaseClient, date: string) {
	const { data, error } = await supabase
		.from("asp_staff_assignments")
		.select("*, asp_staff(name, capabilities), asp_vehicles(name)")
		.eq("date", date);

	if (error) throw error;
	return data;
}

export async function getAssignmentsForWeek(supabase: SupabaseClient, weekDates: string[]) {
	const { data, error } = await supabase
		.from("asp_staff_assignments")
		.select("*, asp_staff(name, capabilities), asp_vehicles(name)")
		.in("date", weekDates);

	if (error) throw error;
	return data;
}

export async function createAssignment(
	supabase: SupabaseClient,
	input: {
		staff_id: string;
		date: string;
		vehicle_id: string;
		role: "driver" | "helper";
	},
) {
	const { data, error } = await supabase
		.from("asp_staff_assignments")
		.insert(input)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updateAssignment(
	supabase: SupabaseClient,
	id: string,
	input: Record<string, unknown>,
) {
	const { data, error } = await supabase
		.from("asp_staff_assignments")
		.update(input)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function removeAssignment(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("asp_staff_assignments").delete().eq("id", id);
	if (error) throw error;
}

export async function removeAssignmentsForDate(supabase: SupabaseClient, date: string) {
	const { error } = await supabase.from("asp_staff_assignments").delete().eq("date", date);
	if (error) throw error;
}
