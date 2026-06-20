import { format } from "date-fns";
import { Route, ClipboardList } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { computeAttendance } from "@/app/lib/engine/compute-attendance";
import type {
	Student,
	Enrollment,
	CalendarRule,
	School,
	SystemSettings,
	ManualOverride,
	DayOfWeek,
} from "@/app/lib/engine/types";
import { getSystemSettings } from "@/app/lib/supabase/settings";
import { TodaySummary } from "@/app/components/dashboard/today-summary";

interface PageProps {
	searchParams: Promise<{ date?: string }>;
}

function toEngineStudent(row: Record<string, unknown>): Student {
	return {
		id: row.id as string,
		name: row.name as string,
		schoolId: (row.school_id as string) ?? "",
		dateOfBirth: (row.date_of_birth as string) ?? null,
		dropOffOnly: (row.drop_off_only as boolean) ?? false,
		dismissalTime: (row.dismissal_time as string) ?? null,
		earlyDismissalTime: (row.early_dismissal_time as string) ?? null,
		status: (row.status as "active" | "pending" | "former") ?? "active",
	};
}

function toEngineEnrollment(row: Record<string, unknown>): Enrollment {
	return {
		id: row.id as string,
		studentId: row.student_id as string,
		startDate: row.start_date as string,
		endDate: (row.end_date as string) ?? null,
		contractDays: (row.contract_days as DayOfWeek[]) ?? [],
		status: (row.status as "pending" | "active" | "cancelled") ?? "active",
	};
}

function toEngineRule(row: Record<string, unknown>): CalendarRule {
	return {
		id: row.id as string,
		ruleType: row.rule_type as CalendarRule["ruleType"],
		targetType: row.target_type as CalendarRule["targetType"],
		targetStudentId: (row.target_student_id as string) ?? null,
		targetSchoolId: (row.target_school_id as string) ?? null,
		startDate: row.start_date as string,
		endDate: row.end_date as string,
		daysOfWeek: (row.days_of_week as DayOfWeek[]) ?? null,
		switchFromTo: (row.switch_from_to as string) ?? null,
		startWeek: (row.start_week as "Absent" | "Present") ?? null,
		earlyDismissalTime: (row.early_dismissal_time as string) ?? null,
		isActive: (row.is_active as boolean) ?? true,
	};
}

function toEngineSchool(row: Record<string, unknown>): School {
	return {
		id: row.id as string,
		name: row.name as string,
		standardDismissalTime: (row.standard_dismissal_time as string) ?? "15:00",
		earlyDismissalTime: (row.early_dismissal_time as string) ?? "14:00",
	};
}

export default async function DashboardPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const dateStr = params.date ?? new Date().toISOString().split("T")[0];
	const date = new Date(dateStr + "T00:00:00");

	const supabase = await createClient();

	const [
		{ data: studentsRaw },
		{ data: enrollmentsRaw },
		{ data: rulesRaw },
		{ data: schoolsRaw },
		{ data: overridesRaw },
	] = await Promise.all([
		supabase.from("asp_students").select("*").eq("status", "active"),
		supabase.from("asp_enrollments").select("*").eq("status", "active"),
		supabase.from("asp_calendar_rules").select("*").eq("is_active", true),
		supabase.from("asp_schools").select("*"),
		supabase
			.from("asp_daily_attendance")
			.select("*")
			.eq("date", dateStr)
			.eq("is_manual_override", true),
	]);

	const settings = await getSystemSettings(supabase);

	const students = (studentsRaw ?? []).map(toEngineStudent);
	const enrollments = (enrollmentsRaw ?? []).map(toEngineEnrollment);
	const rules = (rulesRaw ?? []).map(toEngineRule);
	const schools = (schoolsRaw ?? []).map(toEngineSchool);

	const overrides: ManualOverride[] = (overridesRaw ?? []).map((o) => ({
		studentId: o.student_id,
		status: o.status,
		effectiveDismissalTime: o.effective_dismissal_time,
	}));

	const engineSettings: SystemSettings = {
		defaultDismissalTime: settings.defaultDismissalTime,
		defaultEarlyDismissalTime: settings.defaultEarlyDismissalTime,
		timezone: settings.timezone,
	};

	const results = computeAttendance({
		date,
		students,
		enrollments,
		rules,
		schools,
		settings: engineSettings,
		existingOverrides: overrides,
	});

	const studentMap = new Map((studentsRaw ?? []).map((s) => [s.id, s]));

	const presentStudents = results.filter((r) => {
		const student = studentMap.get(r.studentId);
		const isDropOff = (student?.drop_off_only as boolean) ?? false;
		return ["P", "E", "ED"].includes(r.status) && !isDropOff;
	});

	const schoolsServed = new Set(
		presentStudents.map((r) => {
			const student = studentMap.get(r.studentId);
			return student?.school_id as string;
		}).filter(Boolean),
	).size;

	const presentCount = presentStudents.length;
	const absentCount = results.filter((r) => r.status === "A").length;
	const dropOffCount = results.filter((r) => r.status === "D").length;
	const totalExpected = results.length;

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Dashboard</h1>
					<p className="text-gray-500">{format(date, "EEEE, MMMM d, yyyy")}</p>
				</div>
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

			<TodaySummary
				schoolsServed={schoolsServed}
				presentCount={presentCount}
				absentCount={absentCount}
				dropOffCount={dropOffCount}
				totalExpected={totalExpected}
				unroutedCount={presentCount}
			/>

			<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Link
					href={`/routes?date=${dateStr}`}
					className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-[var(--color-primary)] hover:shadow-sm"
				>
					<Route size={24} className="text-[var(--color-primary)]" />
					<div>
						<p className="font-medium text-gray-900">Route Planner</p>
						<p className="text-sm text-gray-500">Generate and edit pickup routes</p>
					</div>
				</Link>
				<Link
					href={`/attendance?date=${dateStr}`}
					className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-[var(--color-primary)] hover:shadow-sm"
				>
					<ClipboardList size={24} className="text-[var(--color-primary)]" />
					<div>
						<p className="font-medium text-gray-900">Attendance</p>
						<p className="text-sm text-gray-500">View and manage daily attendance</p>
					</div>
				</Link>
			</div>
		</div>
	);
}
