# Software Requirements Specification

## ASP Pick-Up Management System

**Version:** 1.0
**Date:** 2026-06-18

---

## 1. Purpose

This document specifies the software requirements for a white-label After School Program (ASP) Pick-Up Management System. The system replaces a spreadsheet-based pickup workflow with a purpose-built web application that manages student enrollment, computes daily attendance from calendar rules, generates distance-optimized pickup routes, and exports per-vehicle route PDFs for drivers.

## 2. Scope

The system is an operational admin tool for managing after-school program logistics. It covers:

1. Enrollment data management (students, schools, guardians, vehicles, staff)
2. Daily attendance computation from enrollment contracts and calendar rules
3. Suggested pickup routes optimized by school distance
4. Manual route editing
5. Per-vehicle route PDF export
6. Waitlist, former student, and staff schedule management

### 2.1 Out of Scope

- Live pickup/drop-off tracking during routes (handled by a separate application)
- Payment processing or billing
- Parent-facing portal or notifications
- Marketing or public-facing website
- Mobile native application (the web app is desktop-first, tablet-usable)
- Guaranteed optimal vehicle routing (the system provides heuristic distance-based suggestions)

## 3. Product Overview

The system serves organizations that operate after-school pickup programs, transporting children from multiple schools to a program location using a small fleet of vehicles. Staff drive planned routes each school day, picking up enrolled children at dismissal time.

The daily operational workflow is:

1. Calendar rules and enrollment contracts determine which students need pickup on any given day
2. The system computes daily attendance in real time
3. An operator generates optimized pickup routes, assigning students to vehicles
4. Routes are reviewed, adjusted as needed, and exported as PDF documents for drivers

### 3.1 White-Label Design

The application is designed as a white-label product with:

- Configurable theme tokens (colors, fonts, spacing) via CSS variables
- Replaceable logo asset slot
- Configurable application name
- No hardcoded organization-specific branding

## 4. User Roles

### 4.1 Owner / Admin

Full access to all system data and configuration. Responsible for:

- Managing students, guardians, enrollments, schools, vehicles, and staff
- Configuring calendar rules
- Generating and editing routes
- Exporting route PDFs
- Managing the waitlist
- Reviewing audit and sync events
- Configuring system settings (dismissal times, route origin, app name)
- Creating and managing user accounts

### 4.2 Staff

Limited access to operational data. Can:

- View assigned routes and daily attendance
- Save attendance manual overrides (e.g., marking a student absent when a parent calls)
- View staff schedule and availability

Cannot:

- Edit routes, route stops, or staff assignments
- Access guardian contact details, waitlist, audit logs, sync events, enrollments, or system settings
- Create or modify students, schools, vehicles, calendar rules, or enrollments

## 5. Functional Requirements

### 5.1 Student Management

| ID | Requirement |
|----|-------------|
| FR-S01 | The system shall maintain student records with name, school, date of birth, home address, dismissal time override, early dismissal time override, pickup comments, drop-off comments, and status. |
| FR-S02 | Student status shall be one of: active, pending, or former. |
| FR-S03 | Pending students are excluded from attendance computation and route generation. |
| FR-S04 | Former students are retained for historical reference and excluded from active automation. |
| FR-S05 | Students with `drop_off_only = true` are tracked in the daily operational view but excluded from pickup routes and PDFs. |
| FR-S06 | Booster seat requirement shall be derived from date of birth (age < 9) at query time. |
| FR-S07 | Each student may have an optional future integration link (`member_id`) for connecting to external member systems. |
| FR-S08 | The student list shall support sorting by student name or school and filtering by status and school. |

### 5.2 Guardian Management

| ID | Requirement |
|----|-------------|
| FR-G01 | Each student may have one or more guardians with name, phone, email, and primary/secondary designation. |
| FR-G02 | Guardian records are cascade-deleted when the associated student is deleted. |

### 5.3 School Management

| ID | Requirement |
|----|-------------|
| FR-SC01 | Schools have a name, address, standard dismissal time (default 15:00), early dismissal time (default 14:00), and status (active/inactive). |
| FR-SC02 | Inactive schools remain in the system for historical reference but are hidden from new assignment UIs by default. |
| FR-SC03 | Schools shall store geocoded latitude/longitude, populated from the address when the geocoding service is available. |

### 5.4 Enrollment Management

| ID | Requirement |
|----|-------------|
| FR-E01 | Enrollments link a student to a contract specifying start date, optional end date, contracted days of the week, status, and notes. |
| FR-E02 | Enrollment status shall be one of: pending, active, or cancelled. |
| FR-E03 | Pending enrollments are excluded from attendance computation. |
| FR-E04 | A student shall not have two active enrollments with overlapping date ranges. |
| FR-E05 | Contracted days shall only contain valid weekday abbreviations (Mon, Tue, Wed, Thu, Fri) and at least one day. |
| FR-E06 | Student and enrollment status shall be kept in sync via transactional invariants: activating an enrollment activates the student; cancelling the last active enrollment transitions the student to former; re-enrolling a former student transitions them back to active. |

### 5.5 Vehicle Management

| ID | Requirement |
|----|-------------|
| FR-V01 | Vehicles have a name, total seats, kids seats (assignment capacity), booster seats, license plate, and active/inactive status. |
| FR-V02 | `kids_seats` is the maximum number of students assignable to a route for that vehicle. |
| FR-V03 | Booster seat count is a warning threshold, not a hard assignment constraint. |

### 5.6 Staff Management

| ID | Requirement |
|----|-------------|
| FR-ST01 | Staff have a name, capabilities (driver, helper, or both), active/inactive status, and optional external payroll link. |
| FR-ST02 | The capabilities field shall only contain values from the set {driver, helper} and must contain at least one. |

### 5.7 Waitlist Management

| ID | Requirement |
|----|-------------|
| FR-W01 | Waitlist entries track a child's name, date of birth, school name, parent contact info, intended days, date waitlisted, and status. |
| FR-W02 | Waitlist status shall be one of: waiting, offered, enrolled, or declined. |
| FR-W03 | When a waitlist entry transitions to enrolled, the system shall guide creation of corresponding student and enrollment records. |

## 6. Calendar Rules & Attendance

### 6.1 Calendar Rule Types

The system shall support nine calendar rule types:

| # | Rule Type | Effect | Touches N/E? |
|---|-----------|--------|-------------|
| 1 | District-Wide Break | P -> A for all students | No |
| 2 | District Pro-D Day | P -> A for all students | No |
| 3 | School-Specific Holiday | P -> A for students at target school | No |
| 4 | School Pro-D Day | P -> A for students at target school | No |
| 5 | Early Dismissal | P -> ED with dismissal time override | No |
| 6 | Student Temporary Absence | P -> A for specific student | No |
| 7 | Attends Every Other Week | P -> A on alternating weeks | No |
| 8 | Temporary Day Switch | P -> A on original day + N -> E on new day (atomic) | Yes |
| 9 | Extra Pickup Day | N -> E on specified days | Yes |

### 6.2 Rule Targeting

| ID | Requirement |
|----|-------------|
| FR-CR01 | Each rule specifies a target type: all (district-wide), school, or student. |
| FR-CR02 | School-targeted rules reference a specific school. Student-targeted rules reference a specific student. District-wide rules apply to all students. |
| FR-CR03 | Rules have a date range (start_date to end_date), optional days-of-week filter, active/inactive toggle, and optional description. |
| FR-CR04 | Day switch rules use a `switch_from_to` field in the format `Mon>Wed`. |
| FR-CR05 | Alternating week rules specify a `start_week` value of Absent or Present to define the pattern. |
| FR-CR06 | The Calendar Rules UI shall show visual rule states: expired, active, applied for the selected working date, needs review/application, and conflict. |
| FR-CR07 | Rule conflicts shall be visible inline on the affected rule and in the attendance result for the affected student/date. |

### 6.3 Attendance Computation

| ID | Requirement |
|----|-------------|
| FR-AT01 | Attendance shall be computed in real time for any date based on active enrollments and active calendar rules. Preview mode does not persist data. |
| FR-AT02 | Attendance statuses are: P (Present), A (Absent), N (Not Scheduled), E (Extra/Exception), ED (Early Dismissal), D (Drop-off Only). |
| FR-AT03 | The computation shall follow a defined processing order: base schedule from enrollment -> district rules -> school rules -> student rules -> early dismissal -> day switch -> extra pickup -> conflict detection -> ED time resolution -> drop-off derivation. |
| FR-AT04 | Drop-off-only students start as P in computation. The D status is applied as a final derivation step only to students with `drop_off_only = true` whose status is still P after all rules are applied. |
| FR-AT05 | Regular absence/closure rules shall never modify N or E statuses. Only Extra Pickup and Temporary Day Switch may create or modify exception attendance (N/E isolation). |
| FR-AT06 | Day switch rules affect two calendar dates independently. Computing one date does not mutate or materialize the other. |

### 6.4 Conflict Detection

| ID | Requirement |
|----|-------------|
| FR-CF01 | If multiple rules produce different target statuses for the same student on the same day, the system shall apply deterministic resolution where defined (e.g., absence overrides ED). |
| FR-CF02 | If no deterministic resolution exists, neither rule is applied and a conflict record is returned for manual review. |
| FR-CF03 | Extra Pickup or Day Switch receiving-day combined with a school/district closure or student absence shall return a conflict. |
| FR-CF04 | Manual overrides take precedence over all computed rules. |

### 6.5 Early Dismissal Time Resolution

| ID | Requirement |
|----|-------------|
| FR-ED01 | ED dismissal time shall be resolved via a 5-level priority chain (first non-null wins): (1) student-specific calendar rule time -> (2) student standing early_dismissal_time -> (3) school-level calendar rule time -> (4) school default early_dismissal_time -> (5) system default from settings. |

### 6.6 Alternating Week Calculation

| ID | Requirement |
|----|-------------|
| FR-AW01 | Weeks elapsed since the rule start date determine the pattern. Even weeks (0, 2, 4...) use the start_week value. If start_week is Absent, even weeks are absent. If Present, odd weeks are absent. |

### 6.7 Attendance Materialization

| ID | Requirement |
|----|-------------|
| FR-AM01 | Attendance is materialized (persisted) when: (a) the operator activates a date, (b) a manual override is saved, or (c) routes are generated  --  whichever happens first. |
| FR-AM02 | Manual overrides are preserved across recomputation. When recomputing, students with `is_manual_override = true` retain their operator-set value. |
| FR-AM03 | Materialized dates that become stale (due to subsequent rule/enrollment changes) shall be flagged for recomputation. Recomputation preserves manual overrides and marks affected routes as stale. |

### 6.8 Post-Route Attendance Changes

| ID | Requirement |
|----|-------------|
| FR-PR01 | When a manual override marks a student absent after routes are generated, the student's route stops are removed and the affected route is marked stale. |
| FR-PR02 | Stale routes require operator review before PDF export. |

## 7. Kids & Schools Operational View

| ID | Requirement |
|----|-------------|
| FR-KS01 | The system shall provide a daily operational view grouping students by school for a selected date. |
| FR-KS02 | Students are grouped into sections based on attendance status and student flags: **Present** (P, E, ED without drop_off_only), **Drop-off Only** (drop_off_only = true with any routable status), **Absent** (A), **Not Scheduled** (N). |
| FR-KS03 | Each student entry shows dismissal time, booster indicator, and whether the student is already assigned to a route. |
| FR-KS04 | Non-standard dismissal times shall be visually highlighted. |
| FR-KS05 | Unrouted students shall be clearly visible. |
| FR-KS06 | The view supports sorting by school name or student name. |
| FR-KS07 | The routable Present section serves as the source list for route generation. Drop-off Only, Absent, and Not Scheduled students are shown for awareness but do not feed route generation. |

## 8. Route Planning

### 8.1 Route Generation

| ID | Requirement |
|----|-------------|
| FR-RG01 | Route generation collects routable students (status P, E, or ED, excluding drop_off_only students). |
| FR-RG02 | Students are auto-assigned to vehicles optimizing by school proximity, respecting vehicle seat capacity (`kids_seats`). |
| FR-RG03 | Route order is suggested starting from a configured route origin (program location), sorting by nearest school. If no origin is configured, school-to-school distances are used without an origin leg. |
| FR-RG04 | Booster-required students are flagged. A warning is shown when booster count exceeds vehicle booster capacity. |
| FR-RG05 | Available staff (explicit date-specific availability entries) are auto-assigned to vehicles by role. |
| FR-RG06 | Distance and duration between consecutive school stops are calculated when the geocoding service is available. Distance is recorded only on the first student at each school stop to avoid inflating totals. |
| FR-RG07 | Route generation materializes attendance if not already materialized. |
| FR-RG08 | Each vehicle block in the route planner shall show booster capacity and the number of booster-required students currently assigned to that vehicle. |

### 8.2 Route Editing

| ID | Requirement |
|----|-------------|
| FR-RE01 | Route editing is owner/admin only. |
| FR-RE02 | The operator can drag students between vehicles, reorder stops, reassign staff, remove students from routes, and add unrouted students. |
| FR-RE03 | All edits are validated: no cross-vehicle duplicates, capacity checks, booster warnings. |
| FR-RE04 | Editing recalculates distances, durations, and totals for affected routes. |
| FR-RE05 | Completed routes (post-export) are immutable unless explicitly reopened, which creates an audit event. |
| FR-RE06 | A student cannot be assigned to two vehicles on the same day. Enforced both client-side and server-side. |

### 8.3 Route Readiness Validation

Before PDF export, the system validates each route:

| Check | Severity | Description |
|-------|----------|-------------|
| Stale route | Blocker | Route invalidated by post-generation attendance change |
| Unrouted students | Warning | Routable students not assigned to any vehicle |
| Missing driver | Blocker | Vehicle has stops but no driver assigned |
| Missing helper | Warning | Vehicle has stops but no helper assigned |
| Over capacity | Blocker | More students than vehicle seat capacity |
| Booster shortage | Warning | Booster-required students exceed vehicle booster seats |
| Missing address | Warning | Route stop has no school address |
| Duplicate student | Blocker | Student on multiple vehicles (safety net) |

Blockers prevent export unless an owner explicitly overrides (with audit trail). Warnings allow export with acknowledgment.

### 8.4 Route History

| ID | Requirement |
|----|-------------|
| FR-RH01 | Each generated route is saved per date with full stop, staff, and vehicle details. |
| FR-RH02 | Route stops store snapshot fields (student name, school name, school address, dismissal time) so historical records remain accurate even if source data changes. |
| FR-RH03 | Route-level snapshots (vehicle name, driver name, helper name) reflect current state until the route is completed, then freeze. |

## 9. Staff Schedule

| ID | Requirement |
|----|-------------|
| FR-SS01 | The system shall provide a weekly Mon-Fri staff scheduling view. |
| FR-SS02 | Staff availability is date-specific. If no availability entry exists for a date, the staff member is NOT available. |
| FR-SS03 | The UI supports bulk creation of availability entries for a full week. |
| FR-SS04 | Staff assignments (which staff works which vehicle) are populated during route generation and editable by owner/admin afterward. |
| FR-SS05 | The schedule view visually distinguishes availability (base grid) from assignments (overlay showing vehicle/role). |
| FR-SS06 | A staff member works one vehicle per day. One driver and one helper per vehicle per day. |
| FR-SS07 | Assignment validation ensures the staff member's capabilities include the assigned role. |

## 10. PDF Export

| ID | Requirement |
|----|-------------|
| FR-PDF01 | Routes are exported as one PDF per vehicle. |
| FR-PDF02 | PDF naming convention: `Route ({Driver}) - {Vehicle} - {Date} - {Day}`. |
| FR-PDF03 | PDF content includes: route order, student name, school, school address, dismissal time, booster indicator, and distance from previous stop. |
| FR-PDF04 | Export records `exported_at` and `exported_by` on the route. |
| FR-PDF05 | PDFs are generated server-side and delivered as downloads. |
| FR-PDF06 | Generated route PDFs contain operational student data and shall not be stored in public buckets, committed to the repository, or exposed through unauthenticated URLs. |

## 11. Dashboard

| ID | Requirement |
|----|-------------|
| FR-D01 | The dashboard shows summary statistics for a selected date: schools served, present count, absent count, drop-off count, total expected, and unrouted students. |
| FR-D02 | A date picker allows previewing any date (defaults to today). |
| FR-D03 | Quick actions provide access to generate routes and export PDFs. |

## 12. Non-Functional Requirements

### 12.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-P01 | Attendance computation for a single date shall complete in under 500ms for up to 50 students and 100 active rules. |
| NFR-P02 | Route generation shall complete in under 5 seconds for up to 50 students and 5 vehicles. |

### 12.2 Usability

| ID | Requirement |
|----|-------------|
| NFR-U01 | Desktop-first layout, usable on tablets. |
| NFR-U02 | Sidebar navigation compatible with future dashboard integration. |
| NFR-U03 | Operational views (attendance, Kids & Schools, routes) prioritize information density and quick scanning. |

### 12.3 Reliability

| ID | Requirement |
|----|-------------|
| NFR-R01 | All state-changing operations shall be transactional  --  partial writes shall not leave inconsistent data. |
| NFR-R02 | Manual overrides shall never be silently overwritten by automated recomputation. |

### 12.4 Maintainability

| ID | Requirement |
|----|-------------|
| NFR-M01 | The rule engine shall be implemented as pure functions with no database dependency, fully testable with static fixtures. |
| NFR-M02 | The geocoding/distance service shall be behind a provider-agnostic interface. |

## 13. Data Requirements

| ID | Requirement |
|----|-------------|
| DR-01 | The system shall store operational records for students, guardians, schools, enrollments, calendar rules, daily attendance, staff, staff availability, staff assignments, vehicles, routes, route stops, waitlist entries, sync events, audit events, settings, and distance cache entries. |
| DR-02 | Route history shall retain snapshot values needed to reproduce historical route displays and exported PDFs after source records change. |
| DR-03 | Former students, inactive schools, inactive staff, cancelled enrollments, and historical routes shall be retained for history unless an administrator performs an explicit delete action. |
| DR-04 | Seed data shall be entirely fictional and shall not contain real student names, dates of birth, addresses, guardian contact details, staff names, school names, vehicle plates, or organization branding. |
| DR-05 | Public documentation and repository files shall not contain production credentials, production project references, private URLs, live spreadsheet links, or real operational data. |

## 14. Security Requirements

| ID | Requirement |
|----|-------------|
| SR-01 | All pages except login require authentication via Supabase Auth. |
| SR-02 | No public signup. Users are created by administrators. |
| SR-03 | Row-Level Security (RLS) enabled on all data tables. Default deny  --  access requires an explicit policy match. |
| SR-04 | Staff read access is restricted to operational data. No access to guardian contacts, waitlist, audit logs, sync events, enrollments, or system settings. Column-level restrictions on student records (no home address or private comments for staff). |
| SR-05 | All mutations go through server actions with Zod validation. Client-side validation is a UX convenience, not a security boundary. |
| SR-06 | Audit events are append-only. No role can update or delete audit records. Audit inserts happen only via trusted server actions. |
| SR-07 | Rate limiting on mutation endpoints: 60/min for writes, 10/min for route generation and PDF export, 5/min for login attempts. |
| SR-08 | Runtime request handlers and server actions shall not build raw SQL strings from user input. Application database access uses the Supabase client, typed RPCs, or parameterized database functions. Schema migrations may use reviewed SQL files. |
| SR-09 | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS headers configured. |
| SR-10 | PII is not stored in client-side stores, localStorage, or sessionStorage. Server logs shall not include PII. |
| SR-11 | Service role key is never exposed to the client. |
| SR-12 | String inputs are trimmed, max-length enforced, null bytes stripped. No raw HTML accepted. |
| SR-13 | Files generated from operational data, including route PDFs, shall be delivered through authenticated server responses or private storage with access checks. |

## 15. Audit Requirements

| ID | Requirement |
|----|-------------|
| AR-01 | All user-facing writes create immutable audit events recording entity type, entity ID, action, old/new values, user, and timestamp. |
| AR-02 | Route export blocker overrides create audit events with the overridden checks and optional reason. |
| AR-03 | Cross-system status changes (future integration) generate review events, never automatic status updates. |

## 16. Integration Assumptions

- The schema uses `asp_*` table prefixes so migrations can later be applied to a shared database project.
- Student records include a nullable `member_id` for future linking to an external member system.
- Staff records include a nullable `staff_member_id` for future payroll integration.
- Sync events support bidirectional review workflows between systems.
- The sidebar navigation structure is compatible with future embedding in a larger dashboard application.
- Theme tokens and logo slots enable rebranding without code changes.

## 17. Acceptance Criteria

The system is acceptable when:

1. The application runs locally with `npm install && npm run dev`.
2. The database schema is documented and migrated.
3. Fictional seed data loads without errors.
4. The white-label UI exists with theme tokens and replaceable logo.
5. All nine calendar rule types are implemented with passing tests.
6. Attendance computation correctly handles all rule types, conflicts, N/E isolation, and manual overrides.
7. The Kids & Schools view correctly groups students into Present, Drop-off Only, Absent, and Not Scheduled sections.
8. Route generation produces distance-optimized suggestions respecting vehicle capacity.
9. Route editing supports drag-and-drop with duplicate prevention and capacity validation.
10. Route readiness validation enforces all blockers and warnings before PDF export.
11. Per-vehicle PDF export follows the specified naming convention and content format.
12. Staff scheduling supports date-specific availability and vehicle assignment.
13. RLS policies enforce role-based access as specified.
14. The repository contains no private or sensitive data.
15. Public documentation (README, SRS, SDD) is complete and accurate.
16. Seed data is fictional and contains no real names, addresses, contacts, school names, vehicle plates, or branding.
17. Route PDFs are generated and delivered without public storage exposure.
