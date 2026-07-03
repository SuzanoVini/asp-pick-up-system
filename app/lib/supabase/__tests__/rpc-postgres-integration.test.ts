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
});
