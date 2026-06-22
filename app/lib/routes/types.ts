import type { AttendanceResult } from "../engine/types";

export type RouteStatus = "draft" | "active" | "completed" | "stale";

export interface RouteGenerationInput {
	date: string;
	attendanceResults: AttendanceResult[];
	students: Array<{
		id: string;
		name: string;
		schoolId: string;
		dropOffOnly: boolean;
		dateOfBirth: string | null;
		dismissalTime: string | null;
	}>;
	schools: Array<{
		id: string;
		name: string;
		address: string | null;
		standardDismissalTime: string;
		lat: number | null;
		lng: number | null;
	}>;
	vehicles: Array<{
		id: string;
		name: string;
		kidsSeats: number;
		boosterSeats: number;
		isActive: boolean;
	}>;
	availableStaff: Array<{
		id: string;
		name: string;
		capabilities: string[];
	}>;
	originLat: number | null;
	originLng: number | null;
	orderedSchoolIds?: string[];
}

export interface RouteStop {
	id: string;
	routeId: string;
	studentId: string;
	schoolId: string;
	seatNumber: number;
	orderIndex: number;
	distanceFromPrevKm: number | null;
	durationFromPrevMin: number | null;
	needsBooster: boolean;
	studentNameSnapshot: string;
	schoolNameSnapshot: string;
	schoolAddressSnapshot: string | null;
	dismissalTimeSnapshot: string | null;
}

export interface VehicleRoute {
	id: string;
	date: string;
	vehicleId: string;
	vehicleName: string;
	status: RouteStatus;
	totalDistanceKm: number | null;
	driverName: string | null;
	helperName: string | null;
	stops: RouteStop[];
	kidsSeats: number;
	boosterSeats: number;
	assignedCount: number;
	boosterRequiredCount: number;
}

export interface RouteGenerationResult {
	routes: VehicleRoute[];
	unroutedStudentIds: string[];
	warnings: string[];
}

export type ReadinessSeverity = "blocker" | "warning";

export interface ReadinessCheck {
	name: string;
	severity: ReadinessSeverity;
	passed: boolean;
	message: string;
}

export interface ReadinessResult {
	checks: ReadinessCheck[];
	canExport: boolean;
	blockerCount: number;
	warningCount: number;
}

export type RouteEditActionType = "move" | "reorder" | "add" | "remove";

export interface RouteEditAction {
	type: RouteEditActionType;
	stopId?: string;
	studentId?: string;
	sourceRouteId?: string;
	targetRouteId?: string;
	newSeatNumber?: number;
	newOrderIndex?: number;
}

export interface StaffScheduleEntry {
	staffId: string;
	staffName: string;
	capabilities: string[];
	dates: Array<{
		date: string;
		isAvailable: boolean;
		assignment: {
			vehicleId: string;
			vehicleName: string;
			role: "driver" | "helper";
		} | null;
	}>;
}
