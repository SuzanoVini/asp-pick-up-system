import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

jest.setTimeout(30_000);

const ids = {
	owner: "10000000-0000-4000-8000-000000000001",
	staffUser: "10000000-0000-4000-8000-000000000002",
	school: "20000000-0000-4000-8000-000000000001",
	student: "30000000-0000-4000-8000-000000000001",
	vehicle: "40000000-0000-4000-8000-000000000001",
	driver: "50000000-0000-4000-8000-000000000001",
};
const date = "2026-07-06";

async function expectSqlFailure(db: PGlite, sql: string, message: string) {
	await expect(db.exec(sql)).rejects.toThrow(message);
}

const studentTwo = "30000000-0000-4000-8000-000000000002";
const studentThree = "30000000-0000-4000-8000-000000000003";

// Bootstraps a fresh PGlite database, runs all migrations, seeds an owner/school/vehicle,
// and routes 3 base students (seats 1, 2, 3 in that order). Any extraStudents are added to
// the plan snapshot but left unrouted. replace_route_plan_snapshot refuses to run again once
// a route lane exists, so every student a test needs — routed or not — must be listed here.
async function seedThreeStudentRoute(extraStudents: Array<{ id: string; name: string }> = []) {
	const db = new PGlite({ extensions: { btree_gist } });
	await db.exec(`
		CREATE ROLE anon;
		CREATE ROLE authenticated;
		CREATE ROLE service_role;
		CREATE SCHEMA auth;
		CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
		CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
			SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
		$$;
	`);
	const migrations = join(process.cwd(), "supabase", "migrations");
	for (const name of readdirSync(migrations)
		.filter((name) => name.endsWith(".sql"))
		.sort()) {
		await db.exec(readFileSync(join(migrations, name), "utf8"));
	}

	await db.exec(`
		INSERT INTO auth.users(id, email) VALUES ('${ids.owner}', 'owner@example.test');
		INSERT INTO user_profiles(id, email, role) VALUES ('${ids.owner}', 'owner@example.test', 'owner');
		INSERT INTO asp_schools(id, name, address) VALUES ('${ids.school}', 'School One', '1 School Street');
		INSERT INTO asp_students(id, name, school_id, date_of_birth) VALUES
			('${ids.student}', 'Student One', '${ids.school}', '2020-01-01'),
			('${studentTwo}', 'Student Two', '${ids.school}', '2020-01-01'),
			('${studentThree}', 'Student Three', '${ids.school}', '2020-01-01')
			${extraStudents.map((student) => `, ('${student.id}', '${student.name}', '${ids.school}', '2020-01-01')`).join("")};
		INSERT INTO asp_vehicles(id, name, total_seats, kids_seats, booster_seats, license_plate)
		VALUES ('${ids.vehicle}', 'Van One', 8, 6, 2, 'TEST-124');
		GRANT USAGE ON SCHEMA public TO authenticated;
		GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
		SELECT set_config('request.jwt.claim.sub', '${ids.owner}', false);
		SET ROLE authenticated;
	`);

	const snapshotStudents = [
		{ id: ids.student, name: "Student One" },
		{ id: studentTwo, name: "Student Two" },
		{ id: studentThree, name: "Student Three" },
		...extraStudents,
	]
		.map(
			(student) =>
				`jsonb_build_object('student_id', '${student.id}', 'school_id', '${ids.school}', 'attendance_status', 'P', 'drop_off_only', false, 'needs_booster', false, 'student_name_snapshot', '${student.name}', 'school_name_snapshot', 'School One')`,
		)
		.join(",\n\t\t\t");
	await db.exec(`
		SELECT public.replace_route_plan_snapshot('${date}', jsonb_build_array(
			${snapshotStudents}
		));
		SELECT public.create_route_lane((SELECT id FROM asp_route_plans WHERE plan_date = '${date}'));
		SELECT public.set_route_vehicle((SELECT id FROM asp_routes WHERE date = '${date}'), '${ids.vehicle}');
		SELECT public.assign_route_student((SELECT id FROM asp_routes WHERE date = '${date}'), '${ids.student}', NULL);
		SELECT public.assign_route_student((SELECT id FROM asp_routes WHERE date = '${date}'), '${studentTwo}', NULL);
		SELECT public.assign_route_student((SELECT id FROM asp_routes WHERE date = '${date}'), '${studentThree}', NULL);
	`);

	const routeId = (
		await db.query<{ id: string }>(`SELECT id FROM asp_routes WHERE date = '${date}'`)
	).rows[0].id;
	const planId = (
		await db.query<{ id: string }>(`SELECT id FROM asp_route_plans WHERE plan_date = '${date}'`)
	).rows[0].id;
	const stopIds = (
		await db.query<{ id: string }>(`
			SELECT id FROM asp_route_stops WHERE route_id = '${routeId}' ORDER BY seat_number
		`)
	).rows.map((row) => row.id);

	return { db, planId, routeId, stopIds };
}

describe("route management migrations in PostgreSQL", () => {
	it("supports the guarded owner and staff workflow from a clean database", async () => {
		const db = new PGlite({ extensions: { btree_gist } });
		await db.exec(`
			CREATE ROLE anon;
			CREATE ROLE authenticated;
			CREATE ROLE service_role;
			CREATE SCHEMA auth;
			CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
			CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
				SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
			$$;
		`);

		const migrations = join(process.cwd(), "supabase", "migrations");
		for (const name of readdirSync(migrations)
			.filter((name) => name.endsWith(".sql"))
			.sort()) {
			await db.exec(readFileSync(join(migrations, name), "utf8"));
		}

		await db.exec(`
			INSERT INTO auth.users(id, email) VALUES
				('${ids.owner}', 'owner@example.test'),
				('${ids.staffUser}', 'staff@example.test');
			INSERT INTO user_profiles(id, email, role) VALUES
				('${ids.owner}', 'owner@example.test', 'owner'),
				('${ids.staffUser}', 'staff@example.test', 'staff');
			INSERT INTO asp_schools(id, name, address) VALUES
				('${ids.school}', 'School One', '1 School Street');
			INSERT INTO asp_students(id, name, school_id, date_of_birth) VALUES
				('${ids.student}', 'Student One', '${ids.school}', '2020-01-01');
			INSERT INTO asp_vehicles(id, name, total_seats, kids_seats, booster_seats, license_plate)
			VALUES ('${ids.vehicle}', 'Van One', 8, 6, 2, 'TEST-123');
			INSERT INTO asp_staff(id, name, capabilities) VALUES
				('${ids.driver}', 'Driver One', ARRAY['driver']);
			INSERT INTO asp_staff_availability(staff_id, date, is_available) VALUES
				('${ids.driver}', '${date}', true);
			GRANT USAGE ON SCHEMA public TO authenticated;
			GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
			SELECT set_config('request.jwt.claim.sub', '${ids.owner}', false);
			SET ROLE authenticated;
		`);

		await db.exec(`
			SELECT public.replace_route_plan_snapshot(
				'${date}',
				jsonb_build_array(jsonb_build_object(
					'student_id', '${ids.student}', 'school_id', '${ids.school}',
					'attendance_status', 'P', 'drop_off_only', false, 'needs_booster', true,
					'student_name_snapshot', 'Student One', 'school_name_snapshot', 'School One'
				))
			);
			SELECT public.create_route_lane((SELECT id FROM asp_route_plans WHERE plan_date = '${date}'));
			SELECT public.set_route_vehicle((SELECT id FROM asp_routes WHERE date = '${date}'), '${ids.vehicle}');
			SELECT public.upsert_staff_assignment_for_vehicle_date('${ids.driver}', '${date}', '${ids.vehicle}', 'driver');
			SELECT public.assign_route_student((SELECT id FROM asp_routes WHERE date = '${date}'), '${ids.student}', NULL);
			SELECT public.finalize_route_plan(
				(SELECT id FROM asp_route_plans WHERE plan_date = '${date}'),
				ARRAY[]::text[], ARRAY[]::text[], NULL
			);
		`);

		const finalized = await db.query<{
			plan_status: string;
			driver_name_snapshot: string;
			plate_number_snapshot: string;
		}>(`
			SELECT plan.status AS plan_status, route.driver_name_snapshot, route.plate_number_snapshot
			FROM asp_route_plans plan JOIN asp_routes route ON route.plan_id = plan.id
			WHERE plan.plan_date = '${date}'
		`);
		expect(finalized.rows).toEqual([
			expect.objectContaining({
				plan_status: "finalized",
				driver_name_snapshot: "Driver One",
				plate_number_snapshot: "TEST-123",
			}),
		]);
		await expectSqlFailure(
			db,
			`SELECT public.assign_route_student((SELECT id FROM asp_routes WHERE date = '${date}'), '${ids.student}', NULL);`,
			"not editable",
		);

		await db.exec(`
			SELECT public.reopen_route_plan(
				(SELECT id FROM asp_route_plans WHERE plan_date = '${date}'), 'Owner correction'
			);
			UPDATE asp_routes SET status = 'completed' WHERE date = '${date}';
		`);
		await expectSqlFailure(
			db,
			"SELECT public.remove_route_stop((SELECT id FROM asp_route_stops LIMIT 1));",
			"not editable",
		);

		await db.exec(`
			RESET ROLE;
			SELECT set_config('request.jwt.claim.sub', '${ids.staffUser}', false);
			SET ROLE authenticated;
			SELECT public.save_attendance_override_and_sync_plan(
				'${ids.student}', '2026-07-07', 'A', NULL
			);
		`);
		await expectSqlFailure(
			db,
			`SELECT public.create_route_lane((SELECT id FROM asp_route_plans WHERE plan_date = '${date}'));`,
			"Not authorized",
		);
		const attendance = await db.query<{ status: string; is_manual_override: boolean }>(`
			SELECT status, is_manual_override FROM asp_daily_attendance
			WHERE student_id = '${ids.student}' AND date = '2026-07-07'
		`);
		expect(attendance.rows).toEqual([{ status: "A", is_manual_override: true }]);

		await db.exec("RESET ROLE");
		const audit = await db.query<{ count: number }>(
			"SELECT COUNT(*)::integer AS count FROM asp_audit_events",
		);
		expect(audit.rows[0].count).toBeGreaterThanOrEqual(7);
		await db.close();
	});

	it("keeps seat_number stable for remaining stops when a stop is removed", async () => {
		const { db } = await seedThreeStudentRoute();

		const beforeRemoval = await db.query<{ student_id: string; seat_number: number }>(`
			SELECT student_id, seat_number FROM asp_route_stops WHERE student_id = '${studentThree}'
		`);
		// Assert the concrete seat, not just "same as before": if setup silently
		// produced no stops, both sides would be undefined and the test would
		// pass vacuously.
		expect(beforeRemoval.rows[0]?.seat_number).toBe(3);

		await db.exec(`
			SELECT public.remove_route_stop((SELECT id FROM asp_route_stops WHERE student_id = '${ids.student}'));
		`);

		const afterRemoval = await db.query<{
			student_id: string;
			seat_number: number;
			order_index: number;
		}>(`
			SELECT student_id, seat_number, order_index FROM asp_route_stops
			WHERE route_id = (SELECT id FROM asp_routes WHERE date = '${date}')
			ORDER BY seat_number
		`);
		// Seats are fixed slots: removing seat 1 leaves seats 2 and 3 in place.
		expect(afterRemoval.rows.map((row) => row.seat_number)).toEqual([2, 3]);
		// Pickup order is the half that still compacts.
		expect(afterRemoval.rows.map((row) => row.order_index)).toEqual([1, 2]);
		await db.close();
	});

	it("reorders pickup order without moving seat numbers", async () => {
		const { db, routeId, stopIds } = await seedThreeStudentRoute();
		const before = await db.query<{ id: string; seat_number: number }>(`
			SELECT id, seat_number FROM asp_route_stops WHERE route_id = '${routeId}' ORDER BY seat_number
		`);
		// Track seat per STOP, not the set of seat numbers. Reordering all N stops
		// permutes which stop holds which seat while the set stays {1..N}, so
		// comparing sorted seat arrays cannot detect the bug this test guards.
		const seatByStopIdBefore = new Map(before.rows.map((row) => [row.id, row.seat_number]));

		const reversedIds = [...stopIds].reverse();
		await db.exec(`
			SELECT public.reorder_route_stops('${routeId}', ARRAY[${reversedIds.map((id) => `'${id}'`).join(",")}]::uuid[]);
		`);

		const after = await db.query<{ id: string; seat_number: number; order_index: number }>(`
			SELECT id, seat_number, order_index FROM asp_route_stops WHERE route_id = '${routeId}' ORDER BY seat_number
		`);
		for (const row of after.rows) {
			expect(row.seat_number).toBe(seatByStopIdBefore.get(row.id));
		}
		// ...while pickup order really did reverse: last stop is now first.
		const orderByStopIdAfter = new Map(after.rows.map((row) => [row.id, row.order_index]));
		expect(reversedIds.map((id) => orderByStopIdAfter.get(id))).toEqual([1, 2, 3]);
		await db.close();
	});

	it("assigns a student to a specific seat and bumps the prior occupant to unrouted when dragging from the unrouted panel", async () => {
		const studentFour = "30000000-0000-4000-8000-000000000004";
		// Student Four must be in the ONE snapshot call inside the helper —
		// replace_route_plan_snapshot cannot be re-called once the lane exists.
		const { db, routeId } = await seedThreeStudentRoute([
			{ id: studentFour, name: "Student Four" },
		]);

		const occupied = await db.query<{ seat_number: number }>(`
			SELECT seat_number FROM asp_route_stops WHERE route_id = '${routeId}' AND student_id = '${ids.student}'
		`);
		const targetSeat = occupied.rows[0].seat_number;

		await db.exec(
			`SELECT public.assign_route_student('${routeId}', '${studentFour}', NULL, ${targetSeat});`,
		);

		const stops = await db.query<{ student_id: string; seat_number: number }>(`
			SELECT student_id, seat_number FROM asp_route_stops WHERE route_id = '${routeId}'
		`);
		expect(stops.rows).toContainEqual({ student_id: studentFour, seat_number: targetSeat });
		expect(stops.rows.find((row) => row.student_id === ids.student)).toBeUndefined();

		// The bumped stop took its order_index with it; pickup order must stay
		// dense (1..N) rather than keeping a hole where the bumped stop was.
		const orders = await db.query<{ order_index: number }>(`
			SELECT order_index FROM asp_route_stops WHERE route_id = '${routeId}' ORDER BY order_index
		`);
		expect(orders.rows.map((row) => row.order_index)).toEqual([1, 2, 3]);
		await db.close();
	});

	it("assigns a student to a specific free seat without disturbing occupied seats", async () => {
		const studentFour = "30000000-0000-4000-8000-000000000004";
		const { db, routeId } = await seedThreeStudentRoute([
			{ id: studentFour, name: "Student Four" },
		]);

		// Seats 1-3 are taken; drop into seat 5, leaving seat 4 deliberately empty.
		await db.exec(`SELECT public.assign_route_student('${routeId}', '${studentFour}', NULL, 5);`);

		const stops = await db.query<{ student_id: string; seat_number: number }>(`
			SELECT student_id, seat_number FROM asp_route_stops WHERE route_id = '${routeId}' ORDER BY seat_number
		`);
		expect(stops.rows.map((row) => row.seat_number)).toEqual([1, 2, 3, 5]);
		expect(stops.rows.find((row) => row.student_id === studentFour)?.seat_number).toBe(5);
		await db.close();
	});

	it("rejects a non-positive seat number at the RPC boundary", async () => {
		const studentFour = "30000000-0000-4000-8000-000000000004";
		const { db, routeId } = await seedThreeStudentRoute([
			{ id: studentFour, name: "Student Four" },
		]);

		await expectSqlFailure(
			db,
			`SELECT public.assign_route_student('${routeId}', '${studentFour}', NULL, -1);`,
			"Seat number must be a positive integer",
		);
		await db.close();
	});

	it("swaps two stops across lanes when moving onto an occupied target seat", async () => {
		const studentFive = "30000000-0000-4000-8000-000000000005";
		// Student Five goes into the helper's single snapshot call — the snapshot
		// cannot be re-replaced once the first lane exists.
		const {
			db,
			planId,
			routeId: sourceRouteId,
			stopIds,
		} = await seedThreeStudentRoute([{ id: studentFive, name: "Student Five" }]);

		// create_route_lane RETURNS the asp_routes composite row — select its .id
		// field explicitly, or rows[0].id would be the whole serialized tuple.
		const created = await db.query<{ id: string }>(
			`SELECT (public.create_route_lane('${planId}')).id AS id`,
		);
		const targetRoute = created.rows[0].id;
		const vehicleTwo = "40000000-0000-4000-8000-000000000002";
		await db.exec(`
			INSERT INTO asp_vehicles(id, name, total_seats, kids_seats, booster_seats, license_plate)
			VALUES ('${vehicleTwo}', 'Van Two', 8, 6, 2, 'TEST-125');
			SELECT public.set_route_vehicle('${targetRoute}', '${vehicleTwo}');
			SELECT public.assign_route_student('${targetRoute}', '${studentFive}', NULL);
		`);

		const movingStopId = stopIds[0];
		const movingStopBefore = await db.query<{ seat_number: number }>(
			`SELECT seat_number FROM asp_route_stops WHERE id = '${movingStopId}'`,
		);
		const sourceSeat = movingStopBefore.rows[0].seat_number;
		const targetOccupant = await db.query<{ id: string; seat_number: number }>(
			`SELECT id, seat_number FROM asp_route_stops WHERE route_id = '${targetRoute}' AND student_id = '${studentFive}'`,
		);
		const targetSeat = targetOccupant.rows[0].seat_number;

		await db.exec(
			`SELECT public.move_route_stop('${movingStopId}', '${targetRoute}', ${targetSeat});`,
		);

		const moved = await db.query<{ route_id: string; seat_number: number }>(
			`SELECT route_id, seat_number FROM asp_route_stops WHERE id = '${movingStopId}'`,
		);
		expect(moved.rows[0]).toEqual({ route_id: targetRoute, seat_number: targetSeat });
		const swapped = await db.query<{ route_id: string; seat_number: number }>(
			`SELECT route_id, seat_number FROM asp_route_stops WHERE id = '${targetOccupant.rows[0].id}'`,
		);
		expect(swapped.rows[0]).toEqual({ route_id: sourceRouteId, seat_number: sourceSeat });
		await db.close();
	});

	it("moves a stop onto a specific free seat in another lane", async () => {
		const { db, planId, routeId: sourceRouteId, stopIds } = await seedThreeStudentRoute();

		const created = await db.query<{ id: string }>(
			`SELECT (public.create_route_lane('${planId}')).id AS id`,
		);
		const targetRoute = created.rows[0].id;
		const vehicleTwo = "40000000-0000-4000-8000-000000000002";
		await db.exec(`
			INSERT INTO asp_vehicles(id, name, total_seats, kids_seats, booster_seats, license_plate)
			VALUES ('${vehicleTwo}', 'Van Two', 8, 6, 2, 'TEST-125');
			SELECT public.set_route_vehicle('${targetRoute}', '${vehicleTwo}');
		`);

		// Target lane is empty; drop into seat 4 specifically (not next-available 1).
		await db.exec(`SELECT public.move_route_stop('${stopIds[0]}', '${targetRoute}', 4);`);

		const moved = await db.query<{ route_id: string; seat_number: number }>(
			`SELECT route_id, seat_number FROM asp_route_stops WHERE id = '${stopIds[0]}'`,
		);
		expect(moved.rows[0]).toEqual({ route_id: targetRoute, seat_number: 4 });

		// Source lane keeps its remaining seats fixed, with pickup order compacted.
		const source = await db.query<{ seat_number: number; order_index: number }>(`
			SELECT seat_number, order_index FROM asp_route_stops WHERE route_id = '${sourceRouteId}' ORDER BY seat_number
		`);
		expect(source.rows.map((row) => row.seat_number)).toEqual([2, 3]);
		expect(source.rows.map((row) => row.order_index)).toEqual([1, 2]);
		await db.close();
	});

	it("swaps two stops within the same lane via reposition_route_stop_seat", async () => {
		const { db, routeId, stopIds } = await seedThreeStudentRoute();
		const before = await db.query<{ id: string; seat_number: number; order_index: number }>(`
			SELECT id, seat_number, order_index FROM asp_route_stops WHERE route_id = '${routeId}' ORDER BY seat_number
		`);
		const orderBefore = new Map(before.rows.map((row) => [row.id, row.order_index]));

		// Move the seat-1 student into seat 2, which is occupied.
		await db.exec(`SELECT public.reposition_route_stop_seat('${stopIds[0]}', 2);`);

		const after = await db.query<{ id: string; seat_number: number; order_index: number }>(`
			SELECT id, seat_number, order_index FROM asp_route_stops WHERE route_id = '${routeId}' ORDER BY seat_number
		`);
		const seatAfter = new Map(after.rows.map((row) => [row.id, row.seat_number]));
		expect(seatAfter.get(stopIds[0])).toBe(2);
		expect(seatAfter.get(stopIds[1])).toBe(1);
		expect(seatAfter.get(stopIds[2])).toBe(3);
		// Seat and pickup order are independent: swapping seats must not reorder pickups.
		for (const row of after.rows) {
			expect(row.order_index).toBe(orderBefore.get(row.id));
		}
		await db.close();
	});

	it("repositions a stop onto a free seat in the same lane", async () => {
		const { db, routeId, stopIds } = await seedThreeStudentRoute();

		await db.exec(`SELECT public.reposition_route_stop_seat('${stopIds[0]}', 6);`);

		const after = await db.query<{ id: string; seat_number: number }>(`
			SELECT id, seat_number FROM asp_route_stops WHERE route_id = '${routeId}' ORDER BY seat_number
		`);
		expect(after.rows.map((row) => row.seat_number)).toEqual([2, 3, 6]);
		expect(after.rows.find((row) => row.id === stopIds[0])?.seat_number).toBe(6);
		await db.close();
	});
});
