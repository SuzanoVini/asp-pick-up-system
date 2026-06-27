# Database Schema Reference

## ASP Pick-Up Management System

**Version:** 1.0
**Date:** 2026-06-18

---

## Overview

The database uses 17 active tables, all prefixed with `asp_` for namespace isolation. One additional table (`user_profiles`) supports authentication. A reporting table (`asp_route_distance_log`) is deferred until monthly mileage reporting is confirmed as a requirement.

All operational tables include `created_at`, `updated_at`, `created_by`, and `updated_by` columns unless noted otherwise. Immutable log tables and cache tables use their own timestamp and actor fields as documented per table.

Row-Level Security (RLS) is enabled on every table. Staff access to tables containing sensitive columns is provided through restricted views rather than direct base-table SELECT policies.

---

## Tables

### asp_schools

Registered schools where enrolled students attend.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL, UNIQUE |
| address | text | Physical school address |
| standard_dismissal_time | time | DEFAULT '15:00' |
| early_dismissal_time | time | DEFAULT '14:00' -- school-level ED default |
| status | text | NOT NULL, DEFAULT 'active'. CHECK: active, inactive |
| lat | decimal | Geocoded latitude (populated from address) |
| lng | decimal | Geocoded longitude (populated from address) |

Inactive schools remain in the database for historical reference but are hidden from new assignment UIs by default.

---

### asp_students

Students enrolled or formerly enrolled in the after-school program.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| name_normalized | text | GENERATED ALWAYS AS lower(trim(name)) STORED |
| school_id | uuid | FK -> asp_schools(id) |
| date_of_birth | date | Used to derive booster requirement (age < 9) at query time |
| home_address | text | Contact/enrollment record; not used for route generation |
| drop_off_only | boolean | NOT NULL, DEFAULT false. Tracked in Kids & Schools view but excluded from pickup routes |
| dismissal_time | time | Standing override for standard dismissal; falls back to school default |
| early_dismissal_time | time | Standing override for ED days; step 2 in the ED time priority chain |
| first_pickup_date | date | Date the student first started pickup |
| status | text | NOT NULL, DEFAULT 'active'. CHECK: active, pending, former |
| comments_pickup | text | Operational notes for pickup |
| comments_dropoff | text | Operational notes for drop-off |
| member_id | uuid | Nullable. Future FK for linking to an external member system |

Key design decisions:
- `name_normalized` has a non-unique index (not unique) because legitimate name collisions can occur.
- Booster requirement is derived from `date_of_birth` at query time, not stored as a generated column, because `age()` uses `current_date` which is not immutable in PostgreSQL.
- `pending` students are excluded from attendance computation and route generation.
- `former` students are retained for historical reference.

---

### asp_guardians

Parent or guardian contact information linked to students.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| student_id | uuid | NOT NULL, FK -> asp_students(id) ON DELETE CASCADE |
| name | text | NOT NULL |
| phone | text | |
| email | text | |
| is_primary | boolean | NOT NULL, DEFAULT true |

Owner-only table. Staff do not have read access.

---

### asp_enrollments

Enrollment contracts linking students to contracted pickup days.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| student_id | uuid | NOT NULL, FK -> asp_students(id) ON DELETE CASCADE |
| start_date | date | NOT NULL |
| end_date | date | NULL means ongoing |
| contract_days | text[] | NOT NULL. CHECK: values only Mon-Fri, at least one required |
| status | text | NOT NULL, DEFAULT 'pending'. CHECK: pending, active, cancelled |
| notes | text | |

Key constraints:
- **No overlapping active enrollments** per student. Enforced via a GiST exclusion constraint using `daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]')`.
- **Student-enrollment status invariants** are enforced transactionally in server actions:
  - Activating an enrollment activates the student.
  - Cancelling the last active enrollment transitions the student to `former`.
  - Re-enrolling a former student transitions them back to `active`.

Owner-only table. Staff do not have read access.

---

### asp_calendar_rules

Calendar rules that modify daily attendance computations.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| rule_type | text | NOT NULL. CHECK: one of nine types (see below) |
| target_type | text | NOT NULL. CHECK: all, school, student |
| target_student_id | uuid | FK -> asp_students(id). NULL unless target_type = student |
| target_school_id | uuid | FK -> asp_schools(id). NULL unless target_type = school |
| target_name | text | Denormalized display name for the target |
| start_date | date | NOT NULL |
| end_date | date | NOT NULL. CHECK: end_date >= start_date |
| days_of_week | text[] | e.g. {Mon,Wed} |
| switch_from_to | text | For day switch rules: e.g. Mon>Wed |
| description | text | |
| start_week | text | CHECK: Absent, Present, or NULL. For alternating week rules |
| early_dismissal_time | time | Override ED time for this specific rule |
| is_active | boolean | NOT NULL, DEFAULT true |

Supported rule types:
1. District-Wide Break
2. District Pro-D Day
3. School-Specific Holiday
4. School Pro-D Day
5. Early Dismissal
6. Student Temporary Absence
7. Attends Every Other Week
8. Temporary Day Switch
9. Extra Pickup Day

CHECK constraint enforces exactly one valid target configuration based on `target_type`.

---

### asp_daily_attendance

Materialized daily attendance snapshots with manual override tracking.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| student_id | uuid | NOT NULL, FK -> asp_students(id) ON DELETE CASCADE |
| date | date | NOT NULL |
| status | text | NOT NULL. CHECK: P, A, N, E, ED, D |
| original_status | text | Status before any manual override |
| effective_dismissal_time | time | Resolved from the ED time priority chain |
| is_manual_override | boolean | NOT NULL, DEFAULT false |
| applied_rule_ids | uuid[] | IDs of rules that contributed to this status |
| modified_by | text | NOT NULL, DEFAULT 'system'. Values: system, manual |
| materialized_at | timestamptz | NOT NULL, DEFAULT now(). When last materialized or recomputed |

Key constraints:
- UNIQUE(student_id, date) -- one record per student per day.

Materialization triggers:
- Operator activates a date for planning
- A manual override is saved
- Routes are generated for a date

Manual overrides (is_manual_override = true) are preserved across recomputation.

---

### asp_staff

Staff members who participate in pickup routes.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| capabilities | text[] | NOT NULL. CHECK: values only driver/helper, at least one required |
| is_active | boolean | NOT NULL, DEFAULT true |
| staff_member_id | uuid | Nullable. Future FK for linking to external payroll |

---

### asp_staff_availability

Date-specific staff availability. Opt-in model: if no row exists for a date, the staff member is NOT available.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| staff_id | uuid | NOT NULL, FK -> asp_staff(id) ON DELETE CASCADE |
| date | date | NOT NULL |
| is_available | boolean | NOT NULL, DEFAULT true |

Key constraints:
- UNIQUE(staff_id, date).

---

### asp_staff_assignments

Single source of truth for which staff member works which vehicle on which date. These rows are selected by the operator during manual route building. Automatic suggestions may prefill values, but the manual assignment is authoritative.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| staff_id | uuid | NOT NULL, FK -> asp_staff(id) |
| date | date | NOT NULL |
| vehicle_id | uuid | NOT NULL, FK -> asp_vehicles(id) |
| role | text | NOT NULL. CHECK: driver, helper |

Key constraints:
- UNIQUE(staff_id, date) -- one vehicle per staff per day.
- UNIQUE(date, vehicle_id, role) -- one driver and one helper per vehicle per day.

Assignment validation (enforced by trigger):
- Staff member must be active.
- Staff member must have an availability entry for the date with is_available = true.
- Staff member's capabilities must include the assigned role.

Note: `asp_routes` currently stores driver/helper name snapshots but not driver/helper IDs. The authoritative staff assignment is read from `asp_staff_assignments` by date + vehicle_id until the route is completed, at which point snapshots freeze for history/PDF output.

---

### asp_vehicles

Vehicle fleet used for pickup routes.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| total_seats | integer | NOT NULL. Total physical seats |
| kids_seats | integer | NOT NULL. Assignment capacity (max students per route) |
| booster_seats | integer | NOT NULL, DEFAULT 0. Warning threshold, not a hard constraint |
| license_plate | text | UNIQUE |
| is_active | boolean | NOT NULL, DEFAULT true |

---

### asp_routes

Per-date vehicle route records with status tracking and display snapshots. A route represents one vehicle lane for one date. Together with `asp_route_stops`, this table is the source of truth for visualizing historical routes.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| date | date | NOT NULL |
| vehicle_id | uuid | NOT NULL, FK -> asp_vehicles(id) |
| status | text | NOT NULL, DEFAULT 'draft'. CHECK: draft, active, completed, stale |
| total_distance_km | decimal | Sum of non-null first-student-per-school distances. Nullable |
| vehicle_name_snapshot | text | NOT NULL. Updated on reassignment; freezes on completion |
| driver_name_snapshot | text | Updated on reassignment; freezes on completion |
| helper_name_snapshot | text | Updated on reassignment; freezes on completion |
| exported_at | timestamptz | Set when PDF is exported |
| exported_by | uuid | FK -> auth.users(id) |

Key constraints:
- UNIQUE(date, vehicle_id) -- one route per vehicle per day.

Snapshot lifecycle: snapshots reflect current vehicle/staff/source data until the route's status becomes `completed`, at which point they freeze. Route history pages should use these snapshots to show what vehicle, driver, and helper were assigned on the actual route date.

---

### asp_route_stops

Student seat and stop-order assignments within routes, with display snapshots for historical accuracy. These rows are the persisted result of the manual route board and the detailed source for route history.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| route_id | uuid | NOT NULL, FK -> asp_routes(id) ON DELETE CASCADE |
| student_id | uuid | NOT NULL, FK -> asp_students(id) |
| school_id | uuid | NOT NULL, FK -> asp_schools(id) |
| seat_number | integer | NOT NULL. Vehicle seat assignment |
| order_index | integer | NOT NULL. Determines route sequence |
| distance_from_prev_km | decimal | Only on first student per school stop; NULL for subsequent same-school students |
| duration_from_prev_min | decimal | Same rule as distance |
| needs_booster | boolean | NOT NULL, DEFAULT false. Computed from student DOB at generation time |
| student_name_snapshot | text | NOT NULL |
| school_name_snapshot | text | NOT NULL |
| school_address_snapshot | text | |
| dismissal_time_snapshot | time | Effective dismissal time at generation |

Key constraints:
- UNIQUE(route_id, student_id) -- one stop per student per route.
- UNIQUE(route_id, seat_number) -- no duplicate seat assignments.
- Cross-vehicle duplicate prevention via database trigger: a student cannot appear on two routes for the same date.

Drop-off-only students are excluded from route generation and do not appear in this table.

Historical route reconstruction:
- Query `asp_routes` by route date.
- Join `asp_route_stops` by `route_id`.
- Group by vehicle route.
- Sort stops by `order_index`.
- Display student, school, address, dismissal, booster, seat, distance, duration, vehicle, driver, and helper snapshot values rather than current source-table names.

---

### asp_waitlist

Pre-enrollment waitlist for prospective students.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| child_name | text | NOT NULL |
| date_of_birth | date | |
| school_name | text | Free text (may not match an existing school) |
| parent_name | text | |
| parent_email | text | |
| parent_phone | text | |
| intended_days | text[] | |
| waitlisted_on | date | NOT NULL, DEFAULT CURRENT_DATE |
| status | text | NOT NULL, DEFAULT 'waiting'. CHECK: waiting, offered, enrolled, declined |

Owner-only table. Staff do not have read access.

---

### asp_sync_events

Cross-system review events for future integration with external administration platforms.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| event_type | text | NOT NULL. e.g. asp_cancellation, member_cancellation, contract_change |
| source_system | text | NOT NULL. 'asp' or 'gym' |
| student_id | uuid | FK -> asp_students(id) |
| member_id | uuid | Future FK for external member system |
| payload | jsonb | Change details |
| reviewed | boolean | NOT NULL, DEFAULT false |
| reviewed_by | uuid | FK -> auth.users(id) |
| reviewed_at | timestamptz | |

Owner read-only. Sync event creation and review updates are performed by trusted server actions using the service role. No direct client INSERT, UPDATE, or DELETE.

---

### asp_audit_events

Immutable, append-only audit trail for all user-facing mutations. This table records who did what and when; it is not the route-history detail store.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| entity_type | text | NOT NULL. e.g. student, enrollment, route |
| entity_id | uuid | NOT NULL |
| action | text | NOT NULL. CHECK: create, update, delete |
| changes | jsonb | Old/new values |
| performed_by | uuid | FK -> auth.users(id). Set server-side |
| performed_at | timestamptz | NOT NULL, DEFAULT now(). Set server-side |

No UPDATE or DELETE policies exist. Inserts happen only via trusted server actions using the service role. This table does not have `updated_at` or `updated_by` columns.

For route operations, audit events should link to the related route entity and summarize the lifecycle action. Full historical route visualization comes from `asp_routes` and `asp_route_stops`.

---

### asp_settings

System-level configuration stored as key-value pairs.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| key | text | PK |
| value | jsonb | NOT NULL |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_by | uuid | FK -> auth.users(id) |

Default settings include: app_name, default_dismissal_time, default_early_dismissal_time, timezone, route_origin_address, route_origin_lat, route_origin_lng.

Owner-only table.

---

### asp_distance_cache

Database-backed cache for geocoding and distance API results.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, default gen_random_uuid() |
| provider | text | NOT NULL. e.g. google_maps |
| origin_lat_lng | text | NOT NULL. Coordinates rounded to 5 decimal places |
| destination_lat_lng | text | NOT NULL. Coordinates rounded to 5 decimal places |
| travel_mode | text | NOT NULL, DEFAULT 'driving' |
| distance_km | decimal | NOT NULL |
| duration_min | decimal | NOT NULL |
| cached_at | timestamptz | NOT NULL, DEFAULT now() |

Key constraints:
- UNIQUE(provider, origin_lat_lng, destination_lat_lng, travel_mode).

Stale entries (older than configurable TTL, default 30 days) are refreshed on next request. Server-managed table (service role writes during route generation). Owner has read-only access.

---

### user_profiles

Application user profiles with role assignments. Not prefixed with `asp_` because it is shared authentication infrastructure.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | uuid | PK, FK -> auth.users(id) ON DELETE CASCADE |
| email | text | |
| full_name | text | |
| role | text | NOT NULL, DEFAULT 'staff'. CHECK: owner, staff |

---

## Staff Operational Views

Staff access to tables containing sensitive columns is provided through restricted database views rather than direct base-table SELECT policies.

### asp_students_staff_view

Exposes only non-sensitive student columns to staff. Omits: date_of_birth, home_address, comments_pickup, comments_dropoff, member_id. Derives a `needs_booster` boolean from date_of_birth instead of exposing the raw value.

Only returns students with status = 'active'. Includes an `auth_role()` check so only staff and owner roles can query it.

### asp_vehicles_staff_view

Exposes vehicle operational data to staff. Omits: license_plate.

Includes an `auth_role()` check for access control.

### asp_staff_staff_view

Exposes staff operational data. Omits: staff_member_id.

Includes an `auth_role()` check for access control.

---

## Deferred Tables

### asp_route_distance_log

Deferred until monthly mileage reporting is a confirmed requirement. Route distance totals can be derived from `asp_routes.total_distance_km` and `asp_route_stops.distance_from_prev_km`. If monthly aggregation reporting is needed, this table will store route_id, total_km, date, month, and year for fast querying.

---

## Key Database-Level Triggers

### set_updated_at

Applied to all operational tables. Automatically sets `updated_at = now()` before each UPDATE.

### prevent_cross_vehicle_duplicate

Applied to `asp_route_stops`. Prevents a student from being assigned to two routes on the same date, even across different vehicles.

### validate_staff_assignment

Applied to `asp_staff_assignments`. Enforces that the staff member is active, has availability for the date, and has the required capability for the assigned role.

---

## Helper Functions

### auth_role()

`SECURITY DEFINER` function that returns the current user's role from `user_profiles`. Used in RLS policies and view access checks. Schema-qualified with a safe `search_path` to prevent injection.
