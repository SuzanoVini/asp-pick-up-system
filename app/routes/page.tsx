import { createClient } from "@/app/lib/supabase/server";
import { computeAttendance } from "@/app/lib/engine/compute-attendance";
import { validateReadiness } from "@/app/lib/routes/readiness";
import { getSystemSettings } from "@/app/lib/supabase/settings";
import type { DayOfWeek, CalendarRule, Enrollment, ManualOverride, School, Student, SystemSettings } from "@/app/lib/engine/types";
import type { VehicleRoute, RouteStop } from "@/app/lib/routes/types";
import { RoutePlanner } from "./route-planner";

interface PageProps {
	searchParams: Promise<{ date?: string }>;
}

export default async function RoutePlannerPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const dateStr = params.date ?? new Date().toISOString().split("T")[0];

	const supabase = await createClient();

	const [
		{ data: studentsRaw },
		{ data: enrollmentsRaw },
		{ data: rulesRaw },
		{ data: schoolsRaw },
		{ data: routesRaw },
		{ data: overridesRaw },
	] = await Promise.all([
		supabase.from("asp_students").select("*").eq("status", "active"),
		supabase.from("asp_enrollments").select("*").eq("status", "active"),
		supabase.from("asp_calendar_rules").select("*").eq("is_active", true),
		supabase.from("asp_schools").select("*"),
		supabase.from("asp_routes").select("*").eq("date", dateStr).order("vehicle_name_snapshot"),
		supabase.from("asp_daily_attendance").select("*").eq("date", dateStr).eq("is_manual_override", true),
	]);

	const settings = await getSystemSettings(supabase);

	const students: Student[] = (studentsRaw ?? []).map((r) => ({
		id: r.id, name: r.name, schoolId: r.school_id ?? "", dateOfBirth: r.date_of_birth ?? null,
		dropOffOnly: r.drop_off_only ?? false, dismissalTime: r.dismissal_time ?? null,
		earlyDismissalTime: r.early_dismissal_time ?? null, status: r.status ?? "active",
	}));

	const enrollments: Enrollment[] = (enrollmentsRaw ?? []).map((r) => ({
		id: r.id, studentId: r.student_id, startDate: r.start_date, endDate: r.end_date ?? null,
		contractDays: (r.contract_days as DayOfWeek[]) ?? [], status: r.status ?? "active",
	}));

	const rules: CalendarRule[] = (rulesRaw ?? []).map((r) => ({
		id: r.id, ruleType: r.rule_type, targetType: r.target_type,
		targetStudentId: r.target_student_id ?? null, targetSchoolId: r.target_school_id ?? null,
		startDate: r.start_date, endDate: r.end_date,
		daysOfWeek: (r.days_of_week as DayOfWeek[]) ?? null,
		switchFromTo: r.switch_from_to ?? null, startWeek: r.start_week ?? null,
		earlyDismissalTime: r.early_dismissal_time ?? null, isActive: r.is_active ?? true,
	}));

	const schools: School[] = (schoolsRaw ?? []).map((r) => ({
		id: r.id, name: r.name,
		standardDismissalTime: r.standard_dismissal_time ?? "15:00",
		earlyDismissalTime: r.early_dismissal_time ?? "14:00",
	}));

	const overrides: ManualOverride[] = (overridesRaw ?? []).map((o) => ({
		studentId: o.student_id, status: o.status, effectiveDismissalTime: o.effective_dismissal_time,
	}));

	const engineSettings: SystemSettings = {
		defaultDismissalTime: settings.defaultDismissalTime,
		defaultEarlyDismissalTime: settings.defaultEarlyDismissalTime,
		timezone: settings.timezone,
	};

	const attendanceResults = computeAttendance({
		date: new Date(`${dateStr}T00:00:00`), students, enrollments, rules, schools,
		settings: engineSettings, existingOverrides: overrides,
	});

	const existingRoutes = routesRaw ?? [];
	const vehicleRoutes: VehicleRoute[] = [];

	for (const r of existingRoutes) {
		const { data: stops } = await supabase
			.from("asp_route_stops")
			.select("*")
			.eq("route_id", r.id)
			.order("order_index");

		const routeStops: RouteStop[] = (stops ?? []).map((s) => ({
			id: s.id, routeId: s.route_id, studentId: s.student_id, schoolId: s.school_id,
			seatNumber: s.seat_number, orderIndex: s.order_index,
			distanceFromPrevKm: s.distance_from_prev_km, durationFromPrevMin: s.duration_from_prev_min,
			needsBooster: s.needs_booster, studentNameSnapshot: s.student_name_snapshot,
			schoolNameSnapshot: s.school_name_snapshot, schoolAddressSnapshot: s.school_address_snapshot,
			dismissalTimeSnapshot: s.dismissal_time_snapshot,
		}));

		vehicleRoutes.push({
			id: r.id, date: r.date, vehicleId: r.vehicle_id, vehicleName: r.vehicle_name_snapshot,
			status: r.status, totalDistanceKm: r.total_distance_km,
			driverName: r.driver_name_snapshot, helperName: r.helper_name_snapshot,
			stops: routeStops, kidsSeats: 0, boosterSeats: 0,
			assignedCount: routeStops.length,
			boosterRequiredCount: routeStops.filter((s) => s.needsBooster).length,
		});
	}

	const routableIds = attendanceResults
		.filter((r) => ["P", "E", "ED"].includes(r.status))
		.filter((r) => {
			const student = students.find((s) => s.id === r.studentId);
			return student && !student.dropOffOnly;
		})
		.map((r) => r.studentId);

	const routedIds = new Set(vehicleRoutes.flatMap((r) => r.stops.map((s) => s.studentId)));
	const schoolMap = new Map((schoolsRaw ?? []).map((s) => [s.id, s.name]));

	const unroutedStudents = routableIds
		.filter((id) => !routedIds.has(id))
		.map((id) => {
			const student = students.find((s) => s.id === id);
			const result = attendanceResults.find((r) => r.studentId === id);
			return {
				id,
				name: student?.name ?? "Unknown",
				schoolName: schoolMap.get(student?.schoolId ?? "") ?? "Unknown",
				needsBooster: result?.needsBooster ?? false,
			};
		});

	const readiness = validateReadiness({
		routes: vehicleRoutes,
		allRoutableStudentIds: routableIds,
		date: dateStr,
	});

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Route Planner</h1>
				<form className="flex items-center gap-2">
					<input
						type="date"
						name="date"
						defaultValue={dateStr}
						className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
					/>
					<button
						type="submit"
						className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
					>
						View
					</button>
				</form>
			</div>

			<RoutePlanner
				date={dateStr}
				routes={vehicleRoutes}
				unroutedStudents={unroutedStudents}
				readiness={readiness}
				hasExistingRoutes={existingRoutes.length > 0}
			/>
		</div>
	);
}
