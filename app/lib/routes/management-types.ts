import type { AttendanceStatus } from "../engine/types";
import type { ReadinessResult, RouteStatus } from "./types";

export interface RoutePlanRow {
	id: string;
	plan_date: string;
	status: "draft" | "finalized";
	present_count: number;
	routable_count: number;
	drop_off_count: number;
	absent_count: number;
	school_count: number;
	generated_at: string;
	generated_by: string | null;
	finalized_at: string | null;
	finalized_by: string | null;
	created_at: string;
	updated_at: string;
	created_by: string | null;
	updated_by: string | null;
}

export interface RoutePlanStudentRow {
	id: string;
	plan_id: string;
	student_id: string;
	school_id: string | null;
	attendance_status: AttendanceStatus;
	drop_off_only: boolean;
	needs_booster: boolean;
	student_name_snapshot: string;
	school_name_snapshot: string;
	created_at: string;
	updated_at: string;
	created_by: string | null;
	updated_by: string | null;
}

export interface ManagedRouteRow {
	id: string;
	date: string;
	vehicle_id: string | null;
	status: RouteStatus;
	total_distance_km: number | null;
	vehicle_name_snapshot: string | null;
	driver_name_snapshot: string | null;
	helper_name_snapshot: string | null;
	exported_at: string | null;
	exported_by: string | null;
	created_at: string;
	updated_at: string;
	created_by: string | null;
	updated_by: string | null;
	plan_id: string | null;
	run_number: number;
	plate_number_snapshot: string | null;
}

export interface ManagedStopRow {
	id: string;
	route_id: string;
	student_id: string;
	school_id: string;
	seat_number: number;
	order_index: number;
	distance_from_prev_km: number | null;
	duration_from_prev_min: number | null;
	needs_booster: boolean;
	student_name_snapshot: string;
	school_name_snapshot: string;
	school_address_snapshot: string | null;
	dismissal_time_snapshot: string | null;
	created_at: string;
	updated_at: string;
	created_by: string | null;
	updated_by: string | null;
	responsible_staff_id: string | null;
	responsible_staff_name_snapshot: string | null;
}

export interface StaffAssignmentRow {
	id: string;
	staff_id: string;
	date: string;
	vehicle_id: string;
	role: "driver" | "helper";
	created_at: string;
	updated_at: string;
	created_by: string | null;
	updated_by: string | null;
}

export interface ManagedVehicleRow {
	id: string;
	name: string;
	kids_seats: number;
	booster_seats: number;
	license_plate: string | null;
	is_active: boolean;
}

export interface ManagedStaffRow {
	id: string;
	name: string;
	capabilities: Array<"driver" | "helper">;
	is_available: boolean;
}

export interface RouteManagementData {
	date: string;
	plan: RoutePlanRow | null;
	students: RoutePlanStudentRow[];
	routes: ManagedRouteRow[];
	stops: ManagedStopRow[];
	vehicles: ManagedVehicleRow[];
	staff: ManagedStaffRow[];
	assignments: StaffAssignmentRow[];
	readiness: ReadinessResult | null;
}
