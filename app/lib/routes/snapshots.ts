export function buildStopSnapshot(student: {
	name: string;
	schoolName: string;
	schoolAddress: string | null;
	dismissalTime: string | null;
}) {
	return {
		student_name_snapshot: student.name,
		school_name_snapshot: student.schoolName,
		school_address_snapshot: student.schoolAddress,
		dismissal_time_snapshot: student.dismissalTime,
	};
}

export function buildRouteSnapshot(vehicle: {
	name: string;
	driverName: string | null;
	helperName: string | null;
}) {
	return {
		vehicle_name_snapshot: vehicle.name,
		driver_name_snapshot: vehicle.driverName,
		helper_name_snapshot: vehicle.helperName,
	};
}
