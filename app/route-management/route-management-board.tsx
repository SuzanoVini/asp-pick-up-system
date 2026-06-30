import {
	addRouteTableFromForm,
	assignSchoolGroupFromForm,
	assignStudentFromForm,
	moveStudentStopFromForm,
	removeRouteTableFromForm,
	removeStudentStopFromForm,
	reorderRouteStopsFromForm,
	setRouteStaffFromForm,
	setRouteVehicleFromForm,
} from "./form-actions";
import { RouteExportButton } from "./route-export-button";

interface RouteOption {
	id: string;
	date: string;
	vehicle_id: string | null;
	status: string;
	run_number: number;
}

interface StopOption {
	id: string;
	route_id: string;
	student_id: string;
	student_name_snapshot: string;
	school_name_snapshot: string;
	order_index: number;
	seat_number: number;
	needs_booster: boolean;
}

interface StudentOption {
	id: string;
	name: string;
	schoolName: string;
	schoolId: string;
}

interface BoardProps {
	planId: string;
	editable: boolean;
	finalized?: boolean;
	routes: RouteOption[];
	stops: StopOption[];
	unroutedStudents: StudentOption[];
	vehicles: Array<{ id: string; name: string }>;
	staff: Array<{ id: string; name: string; capabilities: string[] }>;
	assignments: Array<{ staff_id: string; vehicle_id: string; role: "driver" | "helper" }>;
}

const fieldClass = "rounded border border-gray-300 px-2 py-1 text-xs";
const buttonClass = "rounded border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50";

function moved(ids: string[], index: number, offset: -1 | 1) {
	const target = index + offset;
	if (target < 0 || target >= ids.length) return ids;
	const result = [...ids];
	[result[index], result[target]] = [result[target], result[index]];
	return result;
}

function ReorderForm({
	routeId,
	orderedStopIds,
	label,
	disabled,
}: {
	routeId: string;
	orderedStopIds: string[];
	label: string;
	disabled: boolean;
}) {
	return (
		<form action={reorderRouteStopsFromForm}>
			<input type="hidden" name="routeId" value={routeId} />
			{orderedStopIds.map((id) => (
				<input key={id} type="hidden" name="orderedStopId" value={id} />
			))}
			<button type="submit" disabled={disabled} className={buttonClass}>
				{label}
			</button>
		</form>
	);
}

export function RouteManagementBoard(props: BoardProps) {
	const schools = Array.from(
		new Map(
			props.unroutedStudents.map((student) => [student.schoolId, student.schoolName]),
		).entries(),
	);

	return (
		<section className="space-y-4">
			{props.editable && (
				<form action={addRouteTableFromForm}>
					<input type="hidden" name="planId" value={props.planId} />
					<button type="submit" className={buttonClass}>
						Add route lane
					</button>
				</form>
			)}
			{props.routes.length === 0 ? (
				<div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
					No route lanes yet.
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{props.routes.map((route) => {
						const routeStops = props.stops
							.filter((stop) => stop.route_id === route.id)
							.sort((a, b) => a.order_index - b.order_index);
						const stopIds = routeStops.map((stop) => stop.id);
						const assignment = (role: "driver" | "helper") =>
							props.assignments.find(
								(item) => item.vehicle_id === route.vehicle_id && item.role === role,
							)?.staff_id ?? "";
						return (
							<article key={route.id} className="rounded-lg border border-gray-200 bg-white p-4">
								<div className="mb-3 flex items-center justify-between gap-2">
									<h2 className="font-semibold text-gray-900">Route {route.run_number}</h2>
									{props.editable && route.status !== "completed" && (
										<form action={removeRouteTableFromForm}>
											<input type="hidden" name="routeId" value={route.id} />
											<input
												type="hidden"
												name="confirmNonEmpty"
												value={String(routeStops.length > 0)}
											/>
											<button type="submit" className={buttonClass}>
												Remove lane
											</button>
										</form>
									)}
									{props.finalized && <RouteExportButton routeId={route.id} />}
								</div>
								{props.editable && route.status !== "completed" && (
									<div className="mb-4 grid gap-2 sm:grid-cols-3">
										<form action={setRouteVehicleFromForm} className="space-y-1">
											<input type="hidden" name="routeId" value={route.id} />
											<select
												name="vehicleId"
												defaultValue={route.vehicle_id ?? ""}
												className={fieldClass}
												aria-label="Vehicle"
											>
												<option value="">Select vehicle</option>
												{props.vehicles.map((vehicle) => (
													<option key={vehicle.id} value={vehicle.id}>
														{vehicle.name}
													</option>
												))}
											</select>
											<button type="submit" className={buttonClass}>
												Save vehicle
											</button>
										</form>
										{(["driver", "helper"] as const).map((role) => (
											<form key={role} action={setRouteStaffFromForm} className="space-y-1">
												<input type="hidden" name="routeId" value={route.id} />
												<input type="hidden" name="role" value={role} />
												<select
													name="staffId"
													defaultValue={assignment(role)}
													disabled={!route.vehicle_id}
													className={fieldClass}
													aria-label={role}
												>
													<option value="">Select {role}</option>
													{props.staff
														.filter((member) => member.capabilities.includes(role))
														.map((member) => (
															<option key={member.id} value={member.id}>
																{member.name}
															</option>
														))}
												</select>
												<button type="submit" disabled={!route.vehicle_id} className={buttonClass}>
													Save {role}
												</button>
											</form>
										))}
									</div>
								)}

								<div className="space-y-2">
									{routeStops.length === 0 && (
										<p className="text-xs text-gray-500">No students assigned</p>
									)}
									{routeStops.map((stop, index) => (
										<div key={stop.id} className="rounded border border-gray-100 p-2 text-xs">
											<div className="font-medium text-gray-900">{stop.student_name_snapshot}</div>
											<div className="text-gray-500">
												{stop.school_name_snapshot} · Seat {stop.seat_number}
												{stop.needs_booster ? " · Booster" : ""}
											</div>
											{props.editable && route.status !== "completed" && (
												<div className="mt-2 flex flex-wrap gap-1">
													<ReorderForm
														routeId={route.id}
														orderedStopIds={moved(stopIds, index, -1)}
														label="Move up"
														disabled={index === 0}
													/>
													<ReorderForm
														routeId={route.id}
														orderedStopIds={moved(stopIds, index, 1)}
														label="Move down"
														disabled={index === routeStops.length - 1}
													/>
													<form action={removeStudentStopFromForm}>
														<input type="hidden" name="stopId" value={stop.id} />
														<button type="submit" className={buttonClass}>
															Remove student
														</button>
													</form>
													{props.routes.length > 1 && (
														<form action={moveStudentStopFromForm}>
															<input type="hidden" name="stopId" value={stop.id} />
															<select
																name="targetRouteId"
																className={fieldClass}
																aria-label="Move to route"
															>
																{props.routes
																	.filter((target) => target.id !== route.id)
																	.map((target) => (
																		<option key={target.id} value={target.id}>
																			Route {target.run_number}
																		</option>
																	))}
															</select>
															<button type="submit" className={buttonClass}>
																Move route
															</button>
														</form>
													)}
												</div>
											)}
										</div>
									))}
								</div>

								{props.editable &&
									route.status !== "completed" &&
									props.unroutedStudents.length > 0 && (
										<div className="mt-4 grid gap-2 sm:grid-cols-2">
											<form action={assignStudentFromForm}>
												<input type="hidden" name="routeId" value={route.id} />
												<select
													name="studentId"
													className={fieldClass}
													aria-label="Unrouted student"
												>
													{props.unroutedStudents.map((student) => (
														<option key={student.id} value={student.id}>
															{student.name} — {student.schoolName}
														</option>
													))}
												</select>
												<button type="submit" className={buttonClass}>
													Assign student
												</button>
											</form>
											<form action={assignSchoolGroupFromForm}>
												<input type="hidden" name="routeId" value={route.id} />
												<select name="schoolId" className={fieldClass} aria-label="Unrouted school">
													{schools.map(([id, name]) => (
														<option key={id} value={id}>
															{name}
														</option>
													))}
												</select>
												<button type="submit" className={buttonClass}>
													Assign school
												</button>
											</form>
										</div>
									)}
							</article>
						);
					})}
				</div>
			)}
		</section>
	);
}
