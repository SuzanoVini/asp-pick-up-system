import type {
	AttendanceStatus,
	CalendarRule,
	Enrollment,
	ManualOverride,
	School,
	Student,
	SystemSettings,
} from "../types";

let idCounter = 0;
function nextId(): string {
	idCounter++;
	return `test-${idCounter.toString().padStart(4, "0")}`;
}

export function resetIds(): void {
	idCounter = 0;
}

export function makeStudent(overrides: Partial<Student> = {}): Student {
	return {
		id: nextId(),
		name: "Test Student",
		schoolId: "school-1",
		dateOfBirth: "2015-06-01",
		dropOffOnly: false,
		dismissalTime: null,
		earlyDismissalTime: null,
		status: "active",
		...overrides,
	};
}

export function makeEnrollment(studentId: string, overrides: Partial<Enrollment> = {}): Enrollment {
	return {
		id: nextId(),
		studentId,
		startDate: "2026-01-01",
		endDate: null,
		contractDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
		status: "active",
		...overrides,
	};
}

export function makeRule(overrides: Partial<CalendarRule> = {}): CalendarRule {
	return {
		id: nextId(),
		ruleType: "District-Wide Break",
		targetType: "all",
		targetStudentId: null,
		targetSchoolId: null,
		startDate: "2026-10-01",
		endDate: "2026-10-31",
		daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
		switchFromTo: null,
		startWeek: null,
		earlyDismissalTime: null,
		isActive: true,
		...overrides,
	};
}

export function makeSchool(overrides: Partial<School> = {}): School {
	return {
		id: "school-1",
		name: "Test School",
		standardDismissalTime: "15:00",
		earlyDismissalTime: "14:00",
		...overrides,
	};
}

export function makeSettings(overrides: Partial<SystemSettings> = {}): SystemSettings {
	return {
		defaultDismissalTime: "15:00",
		defaultEarlyDismissalTime: "14:00",
		timezone: "America/Vancouver",
		...overrides,
	};
}

export function makeOverride(
	studentId: string,
	status: AttendanceStatus,
	effectiveDismissalTime: string | null = null,
): ManualOverride {
	return { studentId, status, effectiveDismissalTime };
}

// Monday 2026-10-05
export const MONDAY = new Date("2026-10-05T00:00:00");
// Tuesday 2026-10-06
export const TUESDAY = new Date("2026-10-06T00:00:00");
// Wednesday 2026-10-07
export const WEDNESDAY = new Date("2026-10-07T00:00:00");
// Thursday 2026-10-08
export const THURSDAY = new Date("2026-10-08T00:00:00");
// Friday 2026-10-09
export const FRIDAY = new Date("2026-10-09T00:00:00");
// Saturday 2026-10-10
export const SATURDAY = new Date("2026-10-10T00:00:00");
