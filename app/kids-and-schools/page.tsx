import { computeAttendance } from "@/app/lib/engine/compute-attendance";
import type {
	AttendanceResult,
	CalendarRule,
	DayOfWeek,
	School as EngineSchool,
	Enrollment,
	ManualOverride,
	Student,
	SystemSettings,
} from "@/app/lib/engine/types";
import { createClient } from "@/app/lib/supabase/server";
import { getSystemSettings } from "@/app/lib/supabase/settings";
import { todayInTimeZone } from "@/app/lib/utils/dates";
import { KidsAndSchoolsView } from "./kids-and-schools-view";

interface PageProps {
	searchParams: Promise<{ date?: string; sort?: string }>;
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

function toEngineSchool(row: Record<string, unknown>): EngineSchool {
	return {
		id: row.id as string,
		name: row.name as string,
		standardDismissalTime: (row.standard_dismissal_time as string) ?? "15:00",
		earlyDismissalTime: (row.early_dismissal_time as string) ?? "14:00",
	};
}

interface SectionedStudent {
	studentId: string;
	studentName: string;
	schoolName: string;
	schoolId: string;
	status: string;
	dismissalTime: string | null;
	needsBooster: boolean;
	isOnRoute: boolean;
	isDropOffOnly: boolean;
	standardDismissalTime: string;
}

function categorizeStudents(
	results: AttendanceResult[],
	studentsRaw: Record<string, unknown>[],
	schoolsRaw: Record<string, unknown>[],
) {
	const studentMap = new Map(studentsRaw.map((s) => [s.id as string, s]));
	const schoolMap = new Map(schoolsRaw.map((s) => [s.id as string, s]));

	const present: SectionedStudent[] = [];
	const dropOff: SectionedStudent[] = [];
	const absent: SectionedStudent[] = [];
	const notScheduled: SectionedStudent[] = [];

	for (const r of results) {
		const student = studentMap.get(r.studentId);
		if (!student) continue;
		const school = schoolMap.get(student.school_id as string);
		const isDropOffOnly = (student.drop_off_only as boolean) ?? false;

		const item: SectionedStudent = {
			studentId: r.studentId,
			studentName: student.name as string,
			schoolName: (school?.name as string) ?? "Unknown",
			schoolId: (student.school_id as string) ?? "",
			status: r.status,
			dismissalTime:
				r.effectiveDismissalTime ??
				(student.dismissal_time as string) ??
				(school?.standard_dismissal_time as string) ??
				null,
			needsBooster: r.needsBooster,
			isOnRoute: false,
			isDropOffOnly,
			standardDismissalTime: (school?.standard_dismissal_time as string) ?? "15:00",
		};

		if (isDropOffOnly && ["P", "E", "ED", "D"].includes(r.status)) {
			dropOff.push(item);
		} else if (r.status === "A") {
			absent.push(item);
		} else if (r.status === "N") {
			notScheduled.push(item);
		} else if (["P", "E", "ED"].includes(r.status)) {
			present.push(item);
		}
	}

	return { present, dropOff, absent, notScheduled };
}

export default async function KidsAndSchoolsPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();
	const settings = await getSystemSettings(supabase);
	const dateStr = params.date ?? todayInTimeZone(settings.timezone);
	const date = new Date(`${dateStr}T00:00:00`);

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

	const sections = categorizeStudents(results, studentsRaw ?? [], schoolsRaw ?? []);

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Kids & Schools</h1>
				<form className="flex items-center gap-2">
					<label htmlFor="date" className="text-sm font-medium text-gray-700">
						Date:
					</label>
					<input
						type="date"
						id="date"
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

			<KidsAndSchoolsView
				present={sections.present}
				dropOff={sections.dropOff}
				absent={sections.absent}
				notScheduled={sections.notScheduled}
			/>
		</div>
	);
}
