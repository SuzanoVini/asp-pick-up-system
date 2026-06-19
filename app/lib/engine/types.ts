export type AttendanceStatus = "P" | "A" | "N" | "E" | "ED" | "D";

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export type RuleType =
	| "District-Wide Break"
	| "District Pro-D Day"
	| "School-Specific Holiday"
	| "School Pro-D Day"
	| "Early Dismissal"
	| "Student Temporary Absence"
	| "Attends Every Other Week"
	| "Temporary Day Switch"
	| "Extra Pickup Day";

export type TargetType = "all" | "school" | "student";

export interface Student {
	id: string;
	name: string;
	schoolId: string;
	dateOfBirth: string | null;
	dropOffOnly: boolean;
	dismissalTime: string | null;
	earlyDismissalTime: string | null;
	status: "active" | "pending" | "former";
}

export interface Enrollment {
	id: string;
	studentId: string;
	startDate: string;
	endDate: string | null;
	contractDays: DayOfWeek[];
	status: "pending" | "active" | "cancelled";
}

export interface CalendarRule {
	id: string;
	ruleType: RuleType;
	targetType: TargetType;
	targetStudentId: string | null;
	targetSchoolId: string | null;
	startDate: string;
	endDate: string;
	daysOfWeek: DayOfWeek[] | null;
	switchFromTo: string | null;
	startWeek: "Absent" | "Present" | null;
	earlyDismissalTime: string | null;
	isActive: boolean;
}

export interface School {
	id: string;
	name: string;
	standardDismissalTime: string;
	earlyDismissalTime: string;
}

export interface SystemSettings {
	defaultDismissalTime: string;
	defaultEarlyDismissalTime: string;
	timezone: string;
}

export interface ManualOverride {
	studentId: string;
	status: AttendanceStatus;
	effectiveDismissalTime: string | null;
}

export interface ConflictInfo {
	studentId: string;
	conflictingRules: { ruleId: string; targetStatus: AttendanceStatus }[];
	description: string;
}

export interface IntermediateStatus {
	studentId: string;
	status: AttendanceStatus;
	appliedRuleIds: string[];
	effectiveDismissalTime: string | null;
}

export interface AttendanceInput {
	date: Date;
	students: Student[];
	enrollments: Enrollment[];
	rules: CalendarRule[];
	schools: School[];
	settings: SystemSettings;
	existingOverrides: ManualOverride[];
}

export interface AttendanceResult {
	studentId: string;
	status: AttendanceStatus;
	effectiveDismissalTime: string | null;
	needsBooster: boolean;
	appliedRules: string[];
	conflicts: ConflictInfo[];
	isManualOverride: boolean;
}
