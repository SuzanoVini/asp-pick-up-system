# Test Plan

## ASP Pick-Up Management System

**Version:** 1.0
**Date:** 2026-06-18

---

## Overview

This document describes the testing strategy for the ASP Pick-Up Management System. Tests are organized by subsystem, with the calendar rule engine receiving the highest priority due to its central role in attendance computation.

Testing tools:
- **Unit tests:** Jest + React Testing Library
- **E2E tests:** Playwright
- **Linting:** Biome

---

## 1. Rule Engine Tests (Highest Priority)

The rule engine is a set of pure TypeScript functions with no database dependency. All tests use static fixture data.

### 1.1 Base Schedule

- Student with contracted Mon/Wed/Fri shows P on Monday, N on Tuesday
- Student with no active enrollment is excluded from computation
- Pending enrollment is excluded from computation
- Cancelled enrollment is excluded from computation
- Student with drop_off_only = true starts as P (D is derived later)

### 1.2 District-Wide Rules

- District-Wide Break sets all students to A on affected days
- District Pro-D Day sets all students to A on affected days
- Neither rule modifies students already at N or E status

### 1.3 School-Specific Rules

- School-Specific Holiday sets students at that school to A
- School Pro-D Day sets students at that school to A
- Students at other schools are unaffected
- Neither rule modifies N or E statuses

### 1.4 Student-Specific Rules

- Student Temporary Absence sets the targeted student to A for the date range
- Attends Every Other Week correctly alternates based on start_week = Absent
- Attends Every Other Week correctly alternates based on start_week = Present
- Alternating week calculation uses weeks elapsed since start_date
- Neither rule modifies N or E statuses

### 1.5 Early Dismissal

- ED rule changes P to ED
- ED does not affect A, N, or E statuses
- ED time resolution follows the 5-level priority chain:
  1. Student-specific calendar rule early_dismissal_time
  2. Student standing early_dismissal_time (asp_students)
  3. School-level calendar rule early_dismissal_time
  4. School default early_dismissal_time (asp_schools)
  5. System default from asp_settings

### 1.6 Temporary Day Switch

- Original day changes from P to A
- New day changes from N to E
- Both changes are produced from the same rule when computing each date independently
- Computing Monday does not affect Wednesday's computation (independent per-date)
- Day switch original day combined with ED resolves to A (absence wins)
- Day switch original day combined with student absence resolves to A
- Day switch receiving day combined with school closure returns a conflict
- Day switch receiving day combined with student absence returns a conflict

### 1.7 Extra Pickup Day

- Extra Pickup changes N to E on specified days
- Extra Pickup does not affect P or A statuses
- Extra Pickup combined with school/district closure returns a conflict
- Extra Pickup combined with student absence returns a conflict

### 1.8 N/E Isolation

- District Break never modifies N or E
- School Holiday never modifies N or E
- Student Absence never modifies N or E
- Alternating Week never modifies N or E
- Only Extra Pickup Day and Temporary Day Switch create or modify E

### 1.9 Conflict Detection

- Two rules producing the same status are not a conflict
- Two rules producing different statuses trigger deterministic resolution where defined
- Where no deterministic resolution exists, neither rule is applied and a conflict record is returned
- Conflict records include both rule IDs and the conflicting target statuses

### 1.10 Drop-Off Derivation

- Student with drop_off_only = true and status P after all rules becomes D
- Student with drop_off_only = true and status A after rules stays A (not D)
- Student with drop_off_only = true and status ED after rules stays ED (not D)
- Student with drop_off_only = true and status N stays N
- D status students are excluded from route generation source lists

### 1.11 Manual Override Preservation

- Existing manual override is not overwritten by recomputation
- Recomputation skips students with is_manual_override = true
- Manual override status is returned as-is with isManualOverride = true

---

## 2. Route Logic Tests

### 2.1 Route Generation

- Auto-assignment respects vehicle kids_seats capacity
- Booster-required students are flagged (needs_booster = true)
- Booster count exceeding vehicle booster_seats produces a warning
- Only routable students (P, E, ED, excluding drop_off_only) are assigned to routes
- Drop-off-only students do not appear in route stops
- Status D students do not appear in route source lists or PDFs
- Route order index is sequential within each vehicle

### 2.2 Distance Handling

- Distance is recorded only on the first student at each school stop
- Subsequent same-school students have NULL distance
- total_distance_km sums only non-null distance values
- Distance recalculates correctly after student move/reorder/add/remove

### 2.3 Cross-Vehicle Duplicate Prevention

- A student cannot be assigned to two routes on the same date
- The database trigger rejects the insert with a clear error
- Client-side validation prevents the attempt before it reaches the server

### 2.4 Route Editing

- Moving a student between vehicles updates both routes
- Reordering stops updates order_index values
- Adding a student to a route creates snapshot fields
- Removing a student from a route returns them to the unrouted pool
- Completed routes cannot be edited unless explicitly reopened
- Reopening a completed route creates an audit event

### 2.5 Stale Route Behavior

- Manual override to absent after route generation removes that student's stops
- The affected route's status changes to stale
- Stale route blocks PDF export until reviewed
- Marking the route as reviewed clears the stale status

### 2.6 Route Readiness Validation

All eight checks produce correct results:

| Check | Severity | Test Case |
|-------|----------|-----------|
| Stale route | Blocker | Route with status = stale is flagged |
| Unrouted students | Warning | Routable students not on any vehicle are flagged |
| Missing driver | Blocker | Vehicle with stops but no driver assignment is flagged |
| Missing helper | Warning | Vehicle with stops but no helper assignment is flagged |
| Over capacity | Blocker | More students than kids_seats is flagged |
| Booster shortage | Warning | Booster-required count exceeding booster_seats is flagged |
| Missing address | Warning | Stop with no school address is flagged |
| Duplicate student | Blocker | Student on multiple vehicles is flagged (safety net) |

- Blockers prevent export unless owner overrides (with audit event)
- Warnings allow export with acknowledgment

### 2.7 Snapshot Integrity

- Route stop snapshots preserve student name, school name, school address, and dismissal time at generation
- Changing the student's name after route generation does not affect the snapshot
- Changing the school's address after route generation does not affect the snapshot
- Route-level snapshots (vehicle, driver, helper names) update on reassignment
- Route-level snapshots freeze when status becomes completed

---

## 3. Security Tests

### 3.1 RLS Policy Tests

- Unauthenticated requests are denied on all tables
- Staff cannot SELECT from owner-only tables: asp_guardians, asp_enrollments, asp_waitlist, asp_audit_events, asp_sync_events, asp_settings, asp_calendar_rules, asp_distance_cache
- Staff cannot SELECT directly from asp_students base table (must use view)
- Staff can SELECT from asp_students_staff_view (only active students, no sensitive columns)
- Staff cannot INSERT, UPDATE, or DELETE on any table
- Owner can perform full CRUD on all owner-accessible tables
- Audit events cannot be updated or deleted by any role

### 3.2 Input Validation Tests

- Malformed UUIDs in URL parameters are rejected by Zod schemas
- Oversized strings (exceeding max length) are rejected
- Invalid enum values (e.g. status = 'invalid') are rejected
- SQL injection payloads in text fields are safely handled (parameterized queries)
- XSS payloads in name/comment fields are rejected or safely escaped
- Invalid date ranges (end_date before start_date) are rejected
- Empty contract_days arrays are rejected
- contract_days with invalid day abbreviations are rejected

### 3.3 Authorization Tests

- Staff cannot create, update, or delete students
- Staff cannot create, update, or delete schools
- Staff cannot create, update, or delete calendar rules
- Staff cannot create, update, or delete enrollments
- Staff cannot create, update, or delete routes or route stops
- Staff can save attendance manual overrides through the trusted server action
- All route editing, generation, and export actions require owner/admin role
- Rate limiting returns HTTP 429 after exceeding thresholds

### 3.4 Rate Limiting Tests

- Write operations return 429 after 60 requests per minute
- Route generation returns 429 after 10 requests per minute
- PDF export returns 429 after 10 requests per minute
- Login attempts are limited (5 per minute per IP)

---

## 4. Component Tests

### 4.1 Attendance Display

- Each status code (P, A, N, E, ED, D) renders with the correct color
- Manual override status is visually distinct from computed status
- Conflict indicators appear when conflicts exist

### 4.2 Route Editor

- Drag-and-drop moves students between vehicles
- Capacity warnings appear when a vehicle exceeds kids_seats
- Booster warnings appear when booster count exceeds booster_seats
- Duplicate assignment is prevented in the UI
- Readiness validation results display correctly (blockers vs warnings)

### 4.3 Calendar Rule Forms

- Rule type selection updates available form fields
- target_type = all hides school and student selectors
- target_type = school shows school selector, hides student selector
- target_type = student shows student selector, hides school selector
- Day switch format (Mon>Wed) is validated
- Date range validation prevents end_date before start_date

### 4.4 Staff Schedule Grid

- Availability toggles correctly for each staff/date combination
- Assignment overlay displays vehicle and role information
- Bulk "set week" creates availability entries for Mon-Fri
- Staff without availability for a date are not assignable

---

## 5. E2E Tests (Playwright)

Smoke tests covering critical end-to-end paths:

### 5.1 Student Enrollment Flow

- Create a new student with required fields
- Create an active enrollment with contract days
- Verify the student appears in the attendance preview for a contracted day
- Verify the student does not appear for a non-contracted day

### 5.2 Route Generation Flow

- Generate routes for a date with present students
- Verify students are assigned to vehicles
- Verify route readiness validation runs
- Export PDF and verify the download completes

### 5.3 Calendar Rule Effect

- Create a District-Wide Break rule for a date range
- Preview attendance for a date within the range
- Verify all students show status A

### 5.4 Manual Override

- Preview attendance for a date
- Override a student's status from P to A
- Verify the override persists on page reload
- Generate routes and verify the absent student is not assigned

---

## 6. Migration and Seed Verification

### 6.1 Migration Tests

- All migration files apply cleanly on an empty database (npx supabase db reset)
- Migrations are idempotent where applicable
- Foreign key references are valid
- CHECK constraints reject invalid values
- UNIQUE constraints reject duplicates
- The enrollment overlap exclusion constraint correctly prevents overlapping active enrollments

### 6.2 Seed Data Tests

- Seed data loads without constraint violations
- All foreign key references in seed data are valid
- Seed data covers: active/pending/former students, active/inactive schools, multiple enrollment patterns, all calendar rule types, various waitlist statuses, staff with different capabilities, vehicles with different capacities

### 6.3 RLS Verification

- With a staff-role user, verify SELECT succeeds on permitted tables
- With a staff-role user, verify SELECT fails on restricted tables
- With an owner-role user, verify full CRUD succeeds
- With no authentication, verify all access is denied
