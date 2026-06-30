"use server";

import {
	addRouteTable,
	assignSchoolGroup,
	assignStudent,
	finalizeRoutePlan,
	moveStudentStop,
	removeRouteTable,
	removeStudentStop,
	reorderRouteStops,
	setRouteStaff,
	setRouteVehicle,
} from "../actions/route-management";

const value = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const nullableValue = (formData: FormData, name: string) => value(formData, name) || null;

export async function addRouteTableFromForm(formData: FormData) {
	await addRouteTable({ planId: value(formData, "planId") });
}

export async function removeRouteTableFromForm(formData: FormData) {
	await removeRouteTable({
		routeId: value(formData, "routeId"),
		confirmNonEmpty: value(formData, "confirmNonEmpty") === "true",
	});
}

export async function setRouteVehicleFromForm(formData: FormData) {
	await setRouteVehicle({
		routeId: value(formData, "routeId"),
		vehicleId: nullableValue(formData, "vehicleId"),
	});
}

export async function setRouteStaffFromForm(formData: FormData) {
	await setRouteStaff({
		routeId: value(formData, "routeId"),
		role: value(formData, "role") as "driver" | "helper",
		staffId: nullableValue(formData, "staffId"),
	});
}

export async function assignStudentFromForm(formData: FormData) {
	await assignStudent({
		routeId: value(formData, "routeId"),
		studentId: value(formData, "studentId"),
		responsibleStaffId: nullableValue(formData, "responsibleStaffId"),
	});
}

export async function assignSchoolGroupFromForm(formData: FormData) {
	await assignSchoolGroup({
		routeId: value(formData, "routeId"),
		schoolId: value(formData, "schoolId"),
	});
}

export async function removeStudentStopFromForm(formData: FormData) {
	await removeStudentStop({ stopId: value(formData, "stopId") });
}

export async function moveStudentStopFromForm(formData: FormData) {
	await moveStudentStop({
		stopId: value(formData, "stopId"),
		targetRouteId: value(formData, "targetRouteId"),
	});
}

export async function reorderRouteStopsFromForm(formData: FormData) {
	await reorderRouteStops({
		routeId: value(formData, "routeId"),
		orderedStopIds: formData.getAll("orderedStopId").map(String),
	});
}

export async function finalizeRoutePlanFromForm(formData: FormData) {
	const checkNames = formData.getAll("overrideCheck").map(String);
	await finalizeRoutePlan({
		planId: value(formData, "planId"),
		acknowledgedWarnings: formData.getAll("acknowledgedWarning").map(String) as never,
		override:
			checkNames.length > 0
				? {
						checkNames: checkNames as never,
						reason: value(formData, "overrideReason"),
					}
				: null,
	});
}
