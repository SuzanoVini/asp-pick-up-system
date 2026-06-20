import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAttendance } from "../engine/compute-attendance";
import type {
	Student,
	Enrollment,
	CalendarRule,
	School,
	SystemSettings,
	ManualOverride,
	DayOfWeek,
	AttendanceResult,
} from "../engine/types";
import { getSystemSettings } from "../supabase/settings";

export async function materializeAttendanceForDate(
	supabase: SupabaseClient,
	date: string,
): Promise<AttendanceResult[]> {
	const [
		{ data: studentsRaw },
		{ data: enrollmentsRaw },
		{ data: rulesRaw },
		{ data: schoolsRaw },
		{ data: existingRows },
	] = await Promise.all([
		supabase.from("asp_students").select("*").eq("status", "active"),
		supabase.from("asp_enrollments").select("*").eq("status", "active"),
		supabase.from("asp_calendar_rules").select("*").eq("is_active", true),
		supabase.from("asp_schools").select("*"),
		supabase.from("asp_daily_attendance").select("*").eq("date", date),
	]);

	const settings = await getSystemSettings(supabase);

	const overrides: ManualOverride[] = (existingRows ?? [])
		.filter((r) => r.is_manual_override)
		.map((r) => ({
			studentId: r.student_id,
			status: r.status,
			effectiveDismissalTime: r.effective_dismissal_time,
		}));

	const students: Student[] = (studentsRaw ?? []).map((r) => ({
		id: r.id,
		name: r.name,
		schoolId: r.school_id ?? "",
		dateOfBirth: r.date_of_birth ?? null,
		dropOffOnly: r.drop_off_only ?? false,
		dismissalTime: r.dismissal_time ?? null,
		earlyDismissalTime: r.early_dismissal_time ?? null,
		status: r.status ?? "active",
	}));

	const enrollments: Enrollment[] = (enrollmentsRaw ?? []).map((r) => ({
		id: r.id,
		studentId: r.student_id,
		startDate: r.start_date,
		endDate: r.end_date ?? null,
		contractDays: (r.contract_days as DayOfWeek[]) ?? [],
		status: r.status ?? "active",
	}));

	const rules: CalendarRule[] = (rulesRaw ?? []).map((r) => ({
		id: r.id,
		ruleType: r.rule_type,
		targetType: r.target_type,
		targetStudentId: r.target_student_id ?? null,
		targetSchoolId: r.target_school_id ?? null,
		startDate: r.start_date,
		endDate: r.end_date,
		daysOfWeek: (r.days_of_week as DayOfWeek[]) ?? null,
		switchFromTo: r.switch_from_to ?? null,
		startWeek: r.start_week ?? null,
		earlyDismissalTime: r.early_dismissal_time ?? null,
		isActive: r.is_active ?? true,
	}));

	const schools: School[] = (schoolsRaw ?? []).map((r) => ({
		id: r.id,
		name: r.name,
		standardDismissalTime: r.standard_dismissal_time ?? "15:00",
		earlyDismissalTime: r.early_dismissal_time ?? "14:00",
	}));

	const engineSettings: SystemSettings = {
		defaultDismissalTime: settings.defaultDismissalTime,
		defaultEarlyDismissalTime: settings.defaultEarlyDismissalTime,
		timezone: settings.timezone,
	};

	const results = computeAttendance({
		date: new Date(`${date}T00:00:00`),
		students,
		enrollments,
		rules,
		schools,
		settings: engineSettings,
		existingOverrides: overrides,
	});

	const existingMap = new Map((existingRows ?? []).map((r) => [r.student_id, r]));
	const now = new Date().toISOString();

	for (const result of results) {
		const existing = existingMap.get(result.studentId);

		if (existing && existing.is_manual_override) {
			continue;
		}

		const row = {
			student_id: result.studentId,
			date,
			status: result.status,
			original_status: result.status,
			effective_dismissal_time: result.effectiveDismissalTime,
			is_manual_override: result.isManualOverride,
			applied_rule_ids: result.appliedRules,
			modified_by: result.isManualOverride ? "manual" : "system",
			materialized_at: now,
		};

		if (existing) {
			await supabase
				.from("asp_daily_attendance")
				.update(row)
				.eq("id", existing.id);
		} else {
			await supabase.from("asp_daily_attendance").insert(row);
		}
	}

	return results;
}
