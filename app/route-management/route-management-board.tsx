"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	addRouteTable,
	assignSchoolGroup,
	assignStudent,
	moveStudentStop,
	removeRouteTable,
	removeStudentStop,
	reorderRouteStops,
	repositionRouteStopSeatAction,
	setRouteStaff,
	setRouteVehicle,
} from "../actions/route-management";
import {
	type AssignmentSource,
	type AssignmentTarget,
	resolveStudentAssignment,
} from "./assignment-resolver";
import { RouteExportButton } from "./route-export-button";
import { filterByName } from "./search-filter";
import { SeatRow } from "./seat-row";
import { buildSeatTemplate, type SeatTemplateVehicle } from "./seat-template";

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
	responsible_staff_id?: string | null;
	responsible_staff_name_snapshot?: string | null;
	dismissal_time_snapshot?: string | null;
	school_address_snapshot?: string | null;
}

interface StudentOption {
	id: string;
	name: string;
	schoolName: string;
	schoolId: string;
}

interface VehicleOption {
	id: string;
	name: string;
	kids_seats: number;
	booster_seats: number;
	license_plate?: string | null;
}

interface BoardProps {
	planId: string;
	editable: boolean;
	finalized?: boolean;
	routes: RouteOption[];
	stops: StopOption[];
	unroutedStudents: StudentOption[];
	vehicles: VehicleOption[];
	staff: Array<{ id: string; name: string; capabilities: string[] }>;
	assignments: Array<{ staff_id: string; vehicle_id: string; role: "driver" | "helper" }>;
}

const fieldClass = "rounded border border-gray-300 px-2 py-1 text-xs";
const buttonClass = "rounded border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50";
const chipClass = "rounded border border-gray-300 bg-white px-2 py-1 text-xs";

function moved(ids: string[], index: number, offset: -1 | 1) {
	const target = index + offset;
	if (target < 0 || target >= ids.length) return ids;
	const result = [...ids];
	[result[index], result[target]] = [result[target], result[index]];
	return result;
}

/**
 * The pickup board. Every lane renders its vehicle's fixed seat template, and
 * each seat accepts a student by drag, by click (after arming a card in the
 * palette), or by typing a name — all three resolve through the same handler.
 */
export function RouteManagementBoard(props: BoardProps) {
	const router = useRouter();
	const [armedSource, setArmedSource] = useState<AssignmentSource | null>(null);
	const [searches, setSearches] = useState<Record<string, string>>({});
	const [error, setError] = useState("");

	const schools = Array.from(
		new Map(
			props.unroutedStudents.map((student) => [student.schoolId, student.schoolName]),
		).entries(),
	);

	async function run(work: Promise<unknown>) {
		try {
			await work;
			setError("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Action failed");
		}
		router.refresh();
	}

	function handleAssign(target: AssignmentTarget, draggedSource?: AssignmentSource) {
		const source = draggedSource ?? armedSource ?? undefined;
		if (!source) return;
		const resolution = resolveStudentAssignment({ source, target });
		setArmedSource(null);
		setSearches({});
		if (resolution.action === "assign") {
			void run(
				assignStudent({
					routeId: resolution.routeId,
					studentId: resolution.studentId,
					responsibleStaffId: null,
					seatNumber: resolution.seatNumber,
				}),
			);
		} else if (resolution.action === "reposition") {
			void run(
				repositionRouteStopSeatAction({
					stopId: resolution.stopId,
					seatNumber: resolution.seatNumber,
				}),
			);
		} else if (resolution.action === "move") {
			void run(
				moveStudentStop({
					stopId: resolution.stopId,
					targetRouteId: resolution.targetRouteId,
					seatNumber: resolution.seatNumber,
				}),
			);
		}
	}

	return (
		<section className="space-y-4">
			{error && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>}
			{props.editable && (
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						className={buttonClass}
						onClick={() => void run(addRouteTable({ planId: props.planId }))}
					>
						Add route lane
					</button>
					{armedSource && <span className="text-xs text-gray-500">Pick a seat…</span>}
				</div>
			)}

			{props.editable && (props.unroutedStudents.length > 0 || props.staff.length > 0) && (
				<div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
					<div className="flex flex-wrap gap-1">
						{props.unroutedStudents.map((student) => {
							const source: AssignmentSource = { kind: "unrouted", studentId: student.id };
							const armed =
								armedSource?.kind === "unrouted" && armedSource.studentId === student.id;
							return (
								<button
									key={student.id}
									type="button"
									draggable
									aria-pressed={armed}
									className={`${chipClass} ${armed ? "ring-2 ring-[var(--color-primary)]" : ""}`}
									onDragStart={(event) =>
										event.dataTransfer.setData("application/json", JSON.stringify(source))
									}
									onClick={() => setArmedSource(armed ? null : source)}
								>
									{student.name} — {student.schoolName}
								</button>
							);
						})}
					</div>
					<div className="flex flex-wrap gap-1">
						{props.staff.map((member) => (
							// biome-ignore lint/a11y/noStaticElementInteractions: dragging a staff chip onto a driver/helper row is a pointer-only shortcut; each lane's driver/helper selects remain the keyboard path.
							<span
								key={member.id}
								draggable
								className={chipClass}
								onDragStart={(event) => event.dataTransfer.setData("text/staff-id", member.id)}
							>
								{member.name}
							</span>
						))}
					</div>
				</div>
			)}

			{props.routes.length === 0 ? (
				<div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
					No route lanes yet.
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{props.routes.map((route) => {
						const laneEditable = props.editable && route.status !== "completed";
						const routeStops = props.stops
							.filter((stop) => stop.route_id === route.id)
							.sort((a, b) => a.order_index - b.order_index);
						const stopIds = routeStops.map((stop) => stop.id);
						const assignment = (role: "driver" | "helper") =>
							props.assignments.find(
								(item) => item.vehicle_id === route.vehicle_id && item.role === role,
							)?.staff_id ?? "";
						// Seat rows display the occupant, so resolve ids to names here.
						const staffName = (staffId: string) =>
							props.staff.find((member) => member.id === staffId)?.name ?? staffId;
						const vehicle = props.vehicles.find((item) => item.id === route.vehicle_id);
						const seatVehicle: SeatTemplateVehicle = {
							id: vehicle?.id ?? "",
							name: vehicle?.name ?? "",
							// ponytail: a lane with no vehicle has no seat count of its own, so it
							// shows only the seats already occupied until a vehicle is picked.
							kids_seats:
								vehicle?.kids_seats ??
								routeStops.reduce((max, stop) => Math.max(max, stop.seat_number), 0),
							booster_seats: vehicle?.booster_seats ?? 0,
							license_plate: vehicle?.license_plate ?? null,
						};
						const template = buildSeatTemplate({
							vehicle: seatVehicle,
							stops: routeStops.map((stop) => ({
								id: stop.id,
								seat_number: stop.seat_number,
								student_name_snapshot: stop.student_name_snapshot,
								school_name_snapshot: stop.school_name_snapshot,
								needs_booster: stop.needs_booster,
								order_index: stop.order_index,
								responsible_staff_id: stop.responsible_staff_id ?? null,
								responsible_staff_name_snapshot: stop.responsible_staff_name_snapshot ?? null,
								dismissal_time_snapshot: stop.dismissal_time_snapshot ?? null,
								school_address_snapshot: stop.school_address_snapshot ?? null,
							})),
							driverStaffName: assignment("driver") ? staffName(assignment("driver")) : null,
							helperStaffName: assignment("helper") ? staffName(assignment("helper")) : null,
						});

						return (
							<article key={route.id} className="rounded-lg border border-gray-200 bg-white p-4">
								<div className="mb-3 flex items-center justify-between gap-2">
									<h2 className="font-semibold text-gray-900">
										Route {route.run_number}
										{vehicle ? ` · ${vehicle.name}` : ""}
									</h2>
									{laneEditable && (
										<button
											type="button"
											className={buttonClass}
											onClick={() =>
												void run(
													removeRouteTable({
														routeId: route.id,
														confirmNonEmpty: routeStops.length > 0,
													}),
												)
											}
										>
											Remove lane
										</button>
									)}
									{props.finalized && <RouteExportButton routeId={route.id} />}
								</div>

								{laneEditable && (
									<div className="mb-4 grid gap-2 sm:grid-cols-3">
										<select
											defaultValue={route.vehicle_id ?? ""}
											className={fieldClass}
											aria-label="Vehicle"
											onChange={(event) =>
												void run(
													setRouteVehicle({
														routeId: route.id,
														vehicleId: event.target.value || null,
													}),
												)
											}
										>
											<option value="">Select vehicle</option>
											{props.vehicles.map((item) => (
												<option key={item.id} value={item.id}>
													{item.name}
												</option>
											))}
										</select>
										{(["driver", "helper"] as const).map((role) => (
											<select
												key={role}
												defaultValue={assignment(role)}
												disabled={!route.vehicle_id}
												className={fieldClass}
												aria-label={role}
												onChange={(event) =>
													void run(
														setRouteStaff({
															routeId: route.id,
															role,
															staffId: event.target.value || null,
														}),
													)
												}
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
										))}
									</div>
								)}

								<div className="divide-y divide-gray-100">
									{template.map((row) => {
										const seatNumber = row.kind === "student" ? row.seatNumber : null;
										const stopId = row.kind === "student" ? row.stopId : null;
										const staffRole = row.kind === "student" ? null : row.kind;
										const orderPosition = stopId ? stopIds.indexOf(stopId) : -1;
										const searchKey = `${route.id}:${seatNumber ?? staffRole}`;
										const query = searches[searchKey] ?? "";
										return (
											<div key={searchKey} className="flex items-center gap-1">
												<div className="flex-1">
													<SeatRow
														row={row}
														routeId={route.id}
														editable={laneEditable}
														armed={armedSource !== null}
														onAssign={(seat, source) =>
															handleAssign(
																{
																	routeId: route.id,
																	seatNumber: seat,
																	occupiedByStopId: stopId,
																},
																source,
															)
														}
														onAssignStaff={
															staffRole
																? (staffId) => {
																		if (!route.vehicle_id) return;
																		void run(
																			setRouteStaff({
																				routeId: route.id,
																				role: staffRole,
																				staffId,
																			}),
																		);
																	}
																: undefined
														}
														searchResults={
															query.trim()
																? filterByName(props.unroutedStudents, query).map((student) => ({
																		id: student.id,
																		name: student.name,
																		subtitle: student.schoolName,
																	}))
																: []
														}
														onSearch={(value) =>
															setSearches((current) => ({ ...current, [searchKey]: value }))
														}
														onSelectSearchResult={
															seatNumber === null
																? undefined
																: (studentId) =>
																		handleAssign(
																			{
																				routeId: route.id,
																				seatNumber,
																				occupiedByStopId: stopId,
																			},
																			{ kind: "unrouted", studentId },
																		)
														}
														onMoveUp={
															orderPosition < 0
																? undefined
																: () =>
																		void run(
																			reorderRouteStops({
																				routeId: route.id,
																				orderedStopIds: moved(stopIds, orderPosition, -1),
																			}),
																		)
														}
														onMoveDown={
															orderPosition < 0
																? undefined
																: () =>
																		void run(
																			reorderRouteStops({
																				routeId: route.id,
																				orderedStopIds: moved(stopIds, orderPosition, 1),
																			}),
																		)
														}
														canMoveUp={orderPosition > 0}
														canMoveDown={orderPosition < stopIds.length - 1}
													/>
												</div>
												{laneEditable && stopId && (
													<button
														type="button"
														className={buttonClass}
														onClick={() => void run(removeStudentStop({ stopId }))}
													>
														Remove
													</button>
												)}
											</div>
										);
									})}
								</div>

								{laneEditable && schools.length > 0 && (
									<div className="mt-4 flex flex-wrap items-center gap-1">
										{schools.map(([schoolId, name]) => (
											<button
												key={schoolId}
												type="button"
												className={buttonClass}
												onClick={() => void run(assignSchoolGroup({ routeId: route.id, schoolId }))}
											>
												Assign all {name}
											</button>
										))}
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
