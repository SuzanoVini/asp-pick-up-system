import { differenceInYears } from "date-fns";
import type { RouteGenerationInput, RouteGenerationResult, RouteStop, VehicleRoute } from "./types";

interface RoutableStudent {
	id: string;
	name: string;
	schoolId: string;
	dateOfBirth: string | null;
	dismissalTime: string | null;
	needsBooster: boolean;
	status: string;
}

interface SchoolGroup {
	schoolId: string;
	schoolName: string;
	schoolAddress: string | null;
	lat: number | null;
	lng: number | null;
	standardDismissalTime: string;
	students: RoutableStudent[];
}

interface GeocodedSchoolGroup extends SchoolGroup {
	lat: number;
	lng: number;
}

export function collectRoutableStudents(input: RouteGenerationInput): RoutableStudent[] {
	const routableStatuses = new Set(["P", "E", "ED"]);

	const results: RoutableStudent[] = [];

	for (const r of input.attendanceResults) {
		if (!routableStatuses.has(r.status)) continue;
		const student = input.students.find((s) => s.id === r.studentId);
		if (!student || student.dropOffOnly) continue;

		const needsBooster = student.dateOfBirth
			? differenceInYears(new Date(), new Date(student.dateOfBirth)) < 9
			: false;

		results.push({
			id: student.id,
			name: student.name,
			schoolId: student.schoolId,
			dateOfBirth: student.dateOfBirth,
			dismissalTime: r.effectiveDismissalTime ?? student.dismissalTime,
			needsBooster,
			status: r.status,
		});
	}

	return results;
}

export function groupBySchool(
	students: RoutableStudent[],
	schools: RouteGenerationInput["schools"],
): SchoolGroup[] {
	const schoolMap = new Map(schools.map((s) => [s.id, s]));
	const groups = new Map<string, SchoolGroup>();

	for (const student of students) {
		const school = schoolMap.get(student.schoolId);
		if (!school) continue;

		if (!groups.has(student.schoolId)) {
			groups.set(student.schoolId, {
				schoolId: school.id,
				schoolName: school.name,
				schoolAddress: school.address,
				lat: school.lat,
				lng: school.lng,
				standardDismissalTime: school.standardDismissalTime,
				students: [],
			});
		}
		const group = groups.get(student.schoolId);
		if (group) group.students.push(student);
	}

	return Array.from(groups.values());
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function sortSchoolsByDistance(
	groups: SchoolGroup[],
	originLat: number | null,
	originLng: number | null,
): SchoolGroup[] {
	if (groups.length <= 1) return groups;

	const geocoded = groups.filter((g): g is GeocodedSchoolGroup => g.lat !== null && g.lng !== null);
	const ungeocoded = groups.filter((g) => g.lat === null || g.lng === null);

	if (geocoded.length === 0) return groups;

	const sorted: SchoolGroup[] = [];
	const remaining = [...geocoded];

	let currentLat = originLat ?? geocoded[0].lat;
	let currentLng = originLng ?? geocoded[0].lng;

	if (originLat === null || originLng === null) {
		const first = remaining.shift();
		if (!first) return [...sorted, ...ungeocoded];
		sorted.push(first);
		currentLat = first.lat;
		currentLng = first.lng;
	}

	while (remaining.length > 0) {
		let nearestIdx = 0;
		let nearestDist = Number.POSITIVE_INFINITY;

		for (let i = 0; i < remaining.length; i++) {
			const dist = haversineDistance(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
			if (dist < nearestDist) {
				nearestDist = dist;
				nearestIdx = i;
			}
		}

		const nearest = remaining.splice(nearestIdx, 1)[0];
		sorted.push(nearest);
		currentLat = nearest.lat;
		currentLng = nearest.lng;
	}

	return [...sorted, ...ungeocoded];
}

export function assignToVehicles(
	orderedGroups: SchoolGroup[],
	vehicles: RouteGenerationInput["vehicles"],
): {
	assigned: Map<
		string,
		{
			vehicle: RouteGenerationInput["vehicles"][0];
			students: RoutableStudent[];
			schoolGroups: SchoolGroup[];
		}
	>;
	unrouted: RoutableStudent[];
} {
	const activeVehicles = vehicles.filter((v) => v.isActive);
	const assigned = new Map<
		string,
		{
			vehicle: RouteGenerationInput["vehicles"][0];
			students: RoutableStudent[];
			schoolGroups: SchoolGroup[];
		}
	>();
	const unrouted: RoutableStudent[] = [];

	for (const v of activeVehicles) {
		assigned.set(v.id, { vehicle: v, students: [], schoolGroups: [] });
	}

	const allStudents = orderedGroups.flatMap((g) =>
		g.students.map((s) => ({ student: s, group: g })),
	);

	for (const { student, group } of allStudents) {
		let placed = false;

		for (const [, entry] of assigned) {
			if (entry.students.length < entry.vehicle.kidsSeats) {
				entry.students.push(student);
				if (!entry.schoolGroups.find((sg) => sg.schoolId === group.schoolId)) {
					entry.schoolGroups.push(group);
				}
				placed = true;
				break;
			}
		}

		if (!placed) {
			unrouted.push(student);
		}
	}

	return { assigned, unrouted };
}

export function buildRoutePayloads(
	date: string,
	assigned: Map<
		string,
		{
			vehicle: RouteGenerationInput["vehicles"][0];
			students: RoutableStudent[];
			schoolGroups: SchoolGroup[];
		}
	>,
	staffAssignments: Map<
		string,
		{
			driverId: string | null;
			driverName: string | null;
			helperId: string | null;
			helperName: string | null;
		}
	>,
): VehicleRoute[] {
	const routes: VehicleRoute[] = [];

	for (const [vehicleId, entry] of assigned) {
		if (entry.students.length === 0) continue;

		const staff = staffAssignments.get(vehicleId) ?? {
			driverId: null,
			driverName: null,
			helperId: null,
			helperName: null,
		};

		const boosterRequired = entry.students.filter((s) => s.needsBooster).length;
		const stops: RouteStop[] = [];
		const seenSchools = new Set<string>();
		let orderIndex = 1;
		let seatNumber = 1;

		for (const student of entry.students) {
			const group = entry.schoolGroups.find((g) => g.schoolId === student.schoolId);
			const isFirstAtSchool = !seenSchools.has(student.schoolId);
			seenSchools.add(student.schoolId);

			stops.push({
				id: "",
				routeId: "",
				studentId: student.id,
				schoolId: student.schoolId,
				seatNumber: seatNumber++,
				orderIndex: orderIndex++,
				distanceFromPrevKm: isFirstAtSchool ? null : null,
				durationFromPrevMin: isFirstAtSchool ? null : null,
				needsBooster: student.needsBooster,
				studentNameSnapshot: student.name,
				schoolNameSnapshot: group?.schoolName ?? "",
				schoolAddressSnapshot: group?.schoolAddress ?? null,
				dismissalTimeSnapshot: student.dismissalTime ?? group?.standardDismissalTime ?? null,
			});
		}

		routes.push({
			id: "",
			date,
			vehicleId,
			vehicleName: entry.vehicle.name,
			status: "draft",
			totalDistanceKm: null,
			driverName: staff.driverName,
			helperName: staff.helperName,
			stops,
			kidsSeats: entry.vehicle.kidsSeats,
			boosterSeats: entry.vehicle.boosterSeats,
			assignedCount: entry.students.length,
			boosterRequiredCount: boosterRequired,
		});
	}

	return routes;
}

export function assignStaffToVehicles(
	vehicleIds: string[],
	availableStaff: RouteGenerationInput["availableStaff"],
): Map<
	string,
	{
		driverId: string | null;
		driverName: string | null;
		helperId: string | null;
		helperName: string | null;
	}
> {
	const assignments = new Map<
		string,
		{
			driverId: string | null;
			driverName: string | null;
			helperId: string | null;
			helperName: string | null;
		}
	>();
	const assignedStaffIds = new Set<string>();

	const drivers = availableStaff.filter((s) => s.capabilities.includes("driver"));
	const helpers = availableStaff.filter((s) => s.capabilities.includes("helper"));

	for (const vehicleId of vehicleIds) {
		let driverId: string | null = null;
		let driverName: string | null = null;
		let helperId: string | null = null;
		let helperName: string | null = null;

		for (const d of drivers) {
			if (!assignedStaffIds.has(d.id)) {
				driverId = d.id;
				driverName = d.name;
				assignedStaffIds.add(d.id);
				break;
			}
		}

		for (const h of helpers) {
			if (!assignedStaffIds.has(h.id)) {
				helperId = h.id;
				helperName = h.name;
				assignedStaffIds.add(h.id);
				break;
			}
		}

		assignments.set(vehicleId, { driverId, driverName, helperId, helperName });
	}

	return assignments;
}

export function generateRoutes(input: RouteGenerationInput): RouteGenerationResult {
	const routable = collectRoutableStudents(input);
	const schoolGroups = groupBySchool(routable, input.schools);
	const orderedGroups =
		input.orderedSchoolIds && input.orderedSchoolIds.length > 0
			? orderGroupsByExplicitSchoolOrder(schoolGroups, input.orderedSchoolIds)
			: sortSchoolsByDistance(schoolGroups, input.originLat, input.originLng);
	const { assigned, unrouted } = assignToVehicles(orderedGroups, input.vehicles);

	const vehicleIds = Array.from(assigned.keys()).filter(
		(id) => (assigned.get(id)?.students.length ?? 0) > 0,
	);
	const staffAssignments = assignStaffToVehicles(vehicleIds, input.availableStaff);

	const routes = buildRoutePayloads(input.date, assigned, staffAssignments);

	const warnings: string[] = [];
	for (const route of routes) {
		if (route.boosterRequiredCount > route.boosterSeats) {
			warnings.push(
				`${route.vehicleName}: ${route.boosterRequiredCount} boosters needed but only ${route.boosterSeats} available`,
			);
		}
	}

	if (unrouted.length > 0) {
		warnings.push(`${unrouted.length} student(s) could not be assigned to any vehicle`);
	}

	return {
		routes,
		unroutedStudentIds: unrouted.map((s) => s.id),
		warnings,
	};
}

function orderGroupsByExplicitSchoolOrder(
	groups: SchoolGroup[],
	orderedSchoolIds: string[],
): SchoolGroup[] {
	const order = new Map(orderedSchoolIds.map((schoolId, index) => [schoolId, index]));
	return [...groups].sort((a, b) => {
		const aIndex = order.get(a.schoolId) ?? Number.POSITIVE_INFINITY;
		const bIndex = order.get(b.schoolId) ?? Number.POSITIVE_INFINITY;
		if (aIndex !== bIndex) return aIndex - bIndex;
		return a.schoolName.localeCompare(b.schoolName);
	});
}
