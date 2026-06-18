# Software Design Document

## ASP Pick-Up Management System

**Version:** 1.0
**Date:** 2026-06-18

---

## 1. Architecture Overview

The ASP Pick-Up Management System is a server-rendered web application with a PostgreSQL backend, organized around four core subsystems:

1. **Data Layer**  --  Supabase PostgreSQL with `asp_*` namespaced tables, Row-Level Security, and audit columns on all operational tables.
2. **Rule Engine**  --  Pure TypeScript functions that compute daily attendance from enrollment contracts and calendar rules. No database dependency for logic; fully testable with static fixtures.
3. **Route Planner**  --  Per-date route generation with distance-based auto-assignment, full manual editing, readiness validation, and PDF export.
4. **White-Label UI**  --  CSS variable theme tokens, replaceable logo slot, dark sidebar navigation compatible with future dashboard integration.

### 1.1 Daily Operational Flow

```
Enrollment Contracts + Calendar Rules
  -> Compute attendance (real-time, any date)
  -> Kids & Schools operational view (grouped by school, sectioned by status)
  -> Generate routes (auto-optimized by school distance, fully editable)
  -> Validate readiness -> Export PDF (per vehicle)
```

### 1.2 Key Architectural Decisions

- **Attendance is computed, not mutated.** Rules are always applied. There is no manual "apply rules" button. The system evaluates rules against enrollments in real time.
- **Routes are per-date.** No day-of-week templates. Each day's routes are generated fresh from the attendance list, fully editable, and persisted with snapshot fields for historical accuracy.
- **Standalone-compatible schema.** All tables use `asp_*` prefixes. The schema can run in its own database project or later merge into a shared project.
- **Server actions as the trust boundary.** All mutations go through Next.js server actions with Zod validation. The client never performs raw database writes.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Supabase Auth (owner/staff roles) |
| Styling | Tailwind CSS v4 |
| Client State | Zustand |
| Validation | Zod |
| Date Handling | date-fns |
| Icons | lucide-react |
| CSV Import/Export | papaparse |
| Lint/Format | Biome |
| Unit Tests | Jest + React Testing Library |
| E2E Tests | Playwright |
| Deployment | Vercel-compatible |

---

## 3. Application Structure

```
app/
  layout.tsx                     # Root layout: theme provider, sidebar, auth gate
  page.tsx                       # Dashboard / Today view
  login/page.tsx                 # Login page (only public route)
  globals.css                    # Theme tokens as CSS variables
  middleware.ts                  # Auth middleware (Supabase JWT)
  students/                      # Student CRUD pages
  schools/                       # School CRUD pages
  guardians/                     # Guardian pages (owner only)
  enrollments/                   # Enrollment lifecycle pages
  calendar-rules/                # Rule management pages
  attendance/                    # Attendance preview + override pages
  kids-and-schools/              # Daily operational view
  routes/                        # Route planner + editor
  vehicles/                      # Vehicle CRUD pages
  staff/                         # Staff CRUD pages
  staff-schedule/                # Weekly availability + assignment
  waitlist/                      # Waitlist management (owner only)
  former-students/               # Former student archive
  audit/                         # Audit log viewer (owner only)
  components/
    layout/                      # Sidebar, Header, Logo
    ui/                          # Button, Input, Table, Modal, Badge, Card
    providers/                   # AuthProvider, ThemeProvider
  lib/
    supabase/                    # Client, server, middleware, generated types
    engine/                      # Rule engine (pure functions)
    schemas/                     # Shared Zod validation schemas
    services/                    # Geocoding, route optimization, PDF generation
    utils/                       # Date helpers, timezone handling
  actions/                       # Next.js server actions (mutations)
```

---

## 4. Database Design

### 4.1 Schema Overview

The database uses 17 active tables with `asp_` prefix, plus one deferred reporting table. All operational tables include `created_at`, `updated_at`, `created_by`, `updated_by` columns. Immutable log tables use their own timestamp/actor fields.

| Table | Purpose |
|-------|---------|
| asp_students | Student records with enrollment status and dismissal overrides |
| asp_guardians | Parent/guardian contact info linked to students |
| asp_schools | Schools with addresses, dismissal times, geocoded coordinates |
| asp_enrollments | Enrollment contracts with date ranges and contracted days |
| asp_calendar_rules | Nine rule types for attendance modification |
| asp_daily_attendance | Materialized attendance snapshots with manual override tracking |
| asp_staff | Staff members with role capabilities |
| asp_staff_availability | Date-specific staff availability (opt-in model) |
| asp_staff_assignments | Per-date staff-to-vehicle assignments |
| asp_vehicles | Vehicle fleet with seat and booster capacity |
| asp_routes | Per-date route records with status and snapshots |
| asp_route_stops | Student seat assignments within routes with display snapshots |
| asp_waitlist | Pre-enrollment waitlist tracking |
| asp_sync_events | Cross-system review events for future integration |
| asp_audit_events | Immutable append-only audit trail |
| asp_settings | System-level configuration (dismissal defaults, route origin, app name) |
| asp_distance_cache | Database-backed geocoding/distance API cache |

### 4.2 Key Constraints

- **Student uniqueness:** `name_normalized` (generated column, `lower(trim(name))`) with unique index for dedup.
- **Enrollment overlap prevention:** No two active enrollments for the same student may have overlapping date ranges.
- **Contract days validation:** `CHECK (contract_days <@ ARRAY['Mon','Tue','Wed','Thu','Fri']::text[] AND cardinality(contract_days) >= 1)`.
- **Calendar rule targeting:** CHECK constraint ensures exactly one of target_type = 'all', target_type = 'school' with school FK, or target_type = 'student' with student FK.
- **Staff capabilities:** `CHECK (capabilities <@ ARRAY['driver','helper']::text[] AND cardinality(capabilities) >= 1)`.
- **Route uniqueness:** UNIQUE(date, vehicle_id)  --  one route per vehicle per day.
- **Seat uniqueness:** UNIQUE(route_id, seat_number) and UNIQUE(route_id, student_id).
- **Cross-vehicle duplicate prevention:** Database trigger prevents the same student from appearing on two routes for the same date.
- **Staff assignment constraints:** UNIQUE(staff_id, date) and UNIQUE(date, vehicle_id, role). Role must match staff capabilities.

### 4.3 Snapshot Fields

Route stops store snapshot fields (`student_name_snapshot`, `school_name_snapshot`, `school_address_snapshot`, `dismissal_time_snapshot`) populated at generation time. Routes store `vehicle_name_snapshot`, `driver_name_snapshot`, `helper_name_snapshot` that update when assignments change and freeze when the route is marked completed.

### 4.4 Student <-> Enrollment Invariants

These invariants are enforced transactionally in server actions:

- Pending student -> only pending enrollments
- Active student -> at least one active enrollment
- Cancelling last active enrollment -> student becomes former
- Creating active enrollment for former student -> student becomes active

---

## 5. Role & RLS Design

### 5.1 Role Model

Roles are determined by `auth.uid()` joined to a `user_profiles` table.

| Role | Description |
|------|-------------|
| owner/admin | Full CRUD on operational tables, route editing, PDF export, staff scheduling, user management, and read access to immutable logs |
| staff | Read operational data, save attendance overrides via server action |

### 5.2 RLS Implementation

- RLS enabled on ALL `asp_*` tables with default deny.
- Owner/admin gets full SELECT/INSERT/UPDATE/DELETE on operational tables, except immutable or server-managed tables such as `asp_audit_events`, where write access is restricted to trusted server actions.
- Staff reads operational data through staff-facing views, RPCs, or explicit column grants that expose only the fields required for daily attendance and route work. Staff do not receive direct base-table SELECT on sensitive tables or restricted student columns.
- Staff-facing read models may expose limited operational fields from students, schools, attendance, routes, route stops, staff, availability, assignments, and vehicles. They must not expose guardian contacts, waitlist data, audit events, sync events, settings, enrollments, student home addresses, or private comments.
- Column-level restrictions are implemented with database views, RPCs, or table grants, since RLS is row-level only.
- `asp_audit_events` has no client INSERT/UPDATE/DELETE policies. Inserts happen only via trusted server actions using the service role.

### 5.3 Server Action Trust Boundary

All mutations flow through Next.js server actions that:
1. Authenticate via Supabase Auth JWT
2. Check role authorization
3. Validate input with Zod schemas
4. Execute the database operation with appropriate client (anon for read, service role for audit inserts)
5. Write audit events in the same transaction
6. Apply side effects (e.g., attendance override -> remove route stops -> mark route stale)

---

## 6. Rule Engine Design

### 6.1 Architecture

The rule engine is a set of pure TypeScript functions:

```typescript
interface AttendanceInput {
  date: Date
  students: Student[]
  enrollments: Enrollment[]
  rules: CalendarRule[]
  schools: School[]
  settings: SystemSettings
  existingOverrides: ManualOverride[]
}

interface AttendanceResult {
  studentId: string
  status: 'P' | 'A' | 'N' | 'E' | 'ED' | 'D'
  effectiveDismissalTime: string | null
  needsBooster: boolean
  appliedRules: string[]
  conflicts: ConflictInfo[]
  isManualOverride: boolean
}

function computeAttendance(input: AttendanceInput): AttendanceResult[]
```

### 6.2 Processing Order

1. **Base schedule**  --  Determine P or N from enrollment `contract_days` for the date's weekday. Drop-off students start as P.
2. **District-wide rules**  --  District Break and Pro-D Day: P -> A. Never touches N/E.
3. **School-specific rules**  --  School Holiday and Pro-D Day: P -> A for target school.
4. **Student-specific rules**  --  Student Absence and Alternating Week: P -> A.
5. **Early Dismissal**  --  P -> ED with time resolution.
6. **Day Switch**  --  Original day P -> A; new day N -> E. Each date computed independently.
7. **Extra Pickup**  --  N -> E only.
8. **Conflict detection**  --  Deterministic resolution where defined; otherwise conflict returned.
9. **ED time resolution**  --  5-level priority chain.
10. **Drop-off derivation**  --  P -> D for students with `drop_off_only = true`.

### 6.3 Critical Invariants

- **N/E isolation:** Regular absence rules never modify N or E statuses.
- **Manual override precedence:** If a manual override exists for a student/date, rule computation is skipped for that student.
- **Timezone awareness:** All date logic uses a configured operational timezone.

### 6.4 Conflict Resolution

| Scenario | Result |
|----------|--------|
| Multiple rules producing same status | Not a conflict  --  status applied |
| Absence + ED on same student/date | Absence wins (A), ED time not used |
| Day switch original day + ED | Absence wins (A) |
| Day switch new day + closure/absence | Conflict  --  manual review required |
| Extra pickup + closure/absence | Conflict  --  manual review required |

### 6.5 Rule UI States

The Calendar Rules UI derives visual states from rule dates, active flags, computed attendance, and conflicts:

| State | Meaning |
|-------|---------|
| Expired | Rule end date is before the selected working date |
| Active | Rule is enabled and within its configured date range |
| Applied | Rule affects at least one attendance result for the selected working date |
| Needs review | Rule is active but its expected effect is not reflected in materialized attendance, or the affected date is stale |
| Conflict | Rule overlaps another rule and produces an unresolved result for at least one student/date |

Rule rows show the state inline. Affected attendance rows also show conflict details so the operator can resolve the issue without inspecting the raw rule list.

---

## 7. Attendance Materialization

### 7.1 When Materialization Occurs

Attendance rows are persisted in `asp_daily_attendance` when any of the following happens first:
- Operator activates a date for planning
- A manual override is saved for a student on that date
- Routes are generated for that date

### 7.2 Manual Override Handling

Manual overrides set `is_manual_override = true` and `modified_by = 'manual'`. During recomputation, these rows are preserved  --  the rule engine skips students with existing manual overrides.

### 7.3 Stale Date Detection

If rules or enrollments change after materialization but before the date arrives, the system compares `materialized_at` against the latest `updated_at` on relevant rules/enrollments. Stale dates are flagged in the UI for recomputation. Recomputation preserves manual overrides and marks affected routes as stale.

### 7.4 Post-Route Attendance Changes

When a student is marked absent after routes exist:
1. The student's route stops are removed
2. The affected route's status becomes `stale`
3. An audit event is recorded
4. All steps occur in a single transaction via a trusted server action

---

## 8. Kids & Schools View Design

The Kids & Schools view is a daily operational screen generated from computed or materialized attendance.

### 8.1 Section Logic

| Section | Criteria |
|---------|----------|
| Present | Status P, E, or ED and `drop_off_only = false` |
| Drop-off Only | `drop_off_only = true` with any routable status (P, E, ED, D) |
| Absent | Status A |
| Not Scheduled | Status N |

### 8.2 Visual Indicators

- Blue highlight when student is assigned to a route
- Yellow highlight for non-standard dismissal time
- Red/warning for unrouted routable students
- Booster indicator per student
- Sort controls for school name and student name

### 8.3 Relationship to Route Planner

Only the Present section feeds route generation. Drop-off Only students appear for operational awareness but are excluded from pickup routes and PDFs.

---

## 9. Route Planner Design

### 9.1 Generation Algorithm

1. Collect routable students (P, E, ED; excluding `drop_off_only`)
2. Group by school (geocoded location)
3. Assign to vehicles by school proximity, respecting `kids_seats` capacity
4. Suggest route order: origin -> nearest school -> next nearest (heuristic, not guaranteed optimal)
5. Flag booster-required students (age < 9)
6. Assign available staff by role
7. Calculate school-to-school distances (first student per school only)
8. Populate display snapshots

### 9.2 Distance Handling

- Distance is calculated per school-to-school leg, not per student
- Only the first student row at each school stores the distance value; subsequent same-school rows have NULL distance
- `total_distance_km` on the route sums non-null distance values only
- Route origin (program location) is configurable via settings. If not configured, school-to-school ordering is used without an origin leg.

### 9.3 Editing Model

- Owner/admin only
- Routes with status `draft`, `active`, or `stale` are editable
- Completed routes are immutable (reopening creates an audit event)
- Edits recalculate distances, durations, and totals
- New stops receive snapshots at addition time
- Staff reassignment updates route-level snapshots until completion
- Each vehicle block shows seat usage and booster capacity versus booster-required assigned students

### 9.4 Readiness Validation

Eight checks run before PDF export. Blockers prevent export unless an owner explicitly overrides (with audit trail including overridden checks and reason). Warnings allow export with acknowledgment.

| Check | Severity |
|-------|----------|
| Stale route | Blocker |
| Unrouted routable students | Warning |
| Missing driver | Blocker |
| Missing helper | Warning |
| Over vehicle capacity | Blocker |
| Booster shortage | Warning |
| Missing school address | Warning |
| Duplicate student across routes | Blocker |

---

## 10. Geocoding & Distance Service

### 10.1 Provider Abstraction

```typescript
interface GeocodingService {
  geocode(address: string): Promise<{ lat: number; lng: number }>
  distance(from: LatLng, to: LatLng): Promise<{ km: number; minutes: number }>
  distanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<DistanceMatrix>
}
```

The interface supports provider swapping (e.g., Google Maps, Mapbox). If no provider is configured, distance fields are nullable and route generation works without distance optimization.

### 10.2 Caching Strategy

| Cache | Storage | TTL |
|-------|---------|-----|
| School geocodes | `asp_schools.lat`/`asp_schools.lng` | Permanent until address changes |
| Distance legs | `asp_distance_cache` table (keyed by provider + coordinates + mode) | 30 days |

Route generation checks the cache before calling the API. Cache hits avoid API costs entirely. Stale entries are refreshed on next request.

### 10.3 API Cost Control

- Schools are geocoded on create/update only; not re-geocoded unless address changes
- Distance matrix requests are queued, not fired in parallel
- 429 responses are handled with exponential backoff
- API usage is logged for cost monitoring

---

## 11. Staff Schedule Design

### 11.1 Two-Layer Model

**Availability** (`asp_staff_availability`):
- Date-specific entries. No entry = not available (opt-in model).
- Bulk creation via "set week" fills Mon-Fri for all active staff.

**Assignments** (`asp_staff_assignments`):
- Per-date staff-to-vehicle-to-role records.
- Single source of truth (not duplicated on route records).
- Populated during route generation; editable by owner/admin afterward.
- UNIQUE(staff_id, date) and UNIQUE(date, vehicle_id, role) prevent conflicts.
- Role validated against staff capabilities.

### 11.2 UI Layout

A weekly Mon-Fri grid with two visual layers:
- Base grid: staff availability (toggle per staff per date)
- Overlay: vehicle/role assignments (visible once routes exist)

Staff role sees read-only. Owner/admin edits both layers.

---

## 12. PDF Export Design

### 12.1 Naming Convention

```
Route ({Driver}) - {Vehicle} - {Date} - {Day}
```

Example: `Route (Driver Name) - Vehicle Name - 2026-06-18 - Wednesday`

### 12.2 Content

Each PDF includes per stop:
- Route order number
- Student name
- School name
- School address
- Dismissal time
- Booster indicator
- Distance from previous stop

### 12.3 Implementation

- Generated server-side (owner/admin only)
- Delivered as browser download
- Not stored in public buckets, committed to the repository, or exposed through unauthenticated URLs
- Route status updates to `completed` after export
- `exported_at` and `exported_by` recorded on the route
- Snapshots freeze on completion

---

## 13. Audit & Sync Design

### 13.1 Audit Events

All user-facing writes create `asp_audit_events` records:
- `entity_type`, `entity_id`, `action` (create/update/delete)
- `changes` (jsonb with old/new values)
- `performed_by` (auth user ID, set server-side)
- `performed_at` (timestamp, set server-side)

Audit events are immutable. No UPDATE or DELETE policies exist. Inserts happen only via trusted server actions.

### 13.2 Sync Events

`asp_sync_events` supports future bidirectional integration:
- ASP enrollment cancelled -> sync event for external review
- External member cancelled -> sync event for ASP review
- Contract changes -> sync event with payload details

Cross-system status changes always require explicit owner review. No automatic propagation.

---

## 14. White-Label & Theme Design

### 14.1 Theme Tokens

A single CSS variables layer defines:
- Primary, secondary, and accent colors
- Font family, sizes, and weights
- Spacing scale and border radius
- Sidebar background and text colors

Tailwind CSS configuration extends these tokens so utility classes respect the theme.

### 14.2 Logo Slot

- Image asset at top of sidebar, referenced via configuration
- Default: generic "ASP Manager" text placeholder
- Replaceable without code changes

### 14.3 App Name

Configurable via `asp_settings` (`app_name` key). Used in sidebar, page titles, and PDF headers.

### 14.4 Integration-Ready Layout

- Sidebar navigation structure compatible with embedding as a section in a larger dashboard
- Routes and components organized for potential mounting under a sub-path (e.g., `/asp`)
- Auth can share a common provider when integrated

---

## 15. Testing Strategy

### 15.1 Rule Engine Tests (Highest Priority)

- All nine rule types produce correct status changes
- N/E isolation: regular rules never modify N or E
- Conflict detection and deterministic resolution
- Conflict edge cases: Day Switch + ED, Day Switch + absence, Extra Pickup + closure, Extra Pickup + absence
- Alternating week calculation with both start patterns
- Day switch independent per-date computation
- Manual override preservation across recomputation
- Drop-off derivation
- 5-level ED time resolution chain
- Pending enrollment exclusion

### 15.2 Route Logic Tests

- Vehicle capacity enforcement
- Cross-vehicle duplicate prevention
- Drop-off-only student exclusion from routes
- Distance calculation (first-student-per-school only)
- Stale route behavior on post-generation attendance changes
- All eight readiness validation checks
- Snapshot integrity when source data changes
- Completed route immutability

### 15.3 Security Tests

- RLS policies: staff cannot write admin-only tables
- Unauthenticated requests denied
- Audit events cannot be modified by any client role
- Input validation: malformed UUIDs, oversized strings, invalid enums, injection payloads
- Authorization: staff cannot edit routes, create students, or access restricted tables
- Rate limiting returns 429 after threshold

### 15.4 Component Tests

- Attendance status rendering and color coding
- Route editor interactions
- Calendar rule form validation
- Staff schedule grid behavior

### 15.5 E2E Tests (Playwright)

- Create student -> create enrollment -> view in attendance
- Generate routes -> verify student assignments
- Export PDF -> verify download
- Calendar rule creation -> attendance effect

### 15.6 Migration & Seed Verification

- Migrations run cleanly on empty database
- Seed data loads without constraint violations
- Seed data is entirely fictional, including names, dates of birth, addresses, contact details, school names, staff names, vehicle plates, and branding
- RLS policies enforce expected allow/deny patterns

---

## 16. Future Integration Points

The system is designed for future integration with an external administration platform:

| Integration Point | Mechanism |
|-------------------|-----------|
| Student <-> Member linking | `asp_students.member_id` (nullable UUID) |
| Staff <-> Payroll linking | `asp_staff.staff_member_id` (nullable UUID) |
| Cross-system status sync | `asp_sync_events` with review workflow |
| Schema portability | `asp_*` table prefix; migrations can be applied to shared database |
| Shared authentication | Supabase Auth instance can be reused |
| UI embedding | Sidebar nav and route structure compatible with parent dashboard |
| Rebranding | Theme tokens and logo slot swap without code changes |

---

## 17. Known Deferred Items

| Item | Status | Rationale |
|------|--------|-----------|
| Monthly mileage reporting (`asp_route_distance_log`) | Deferred | Route totals are derivable from existing fields. Add reporting table only when monthly aggregation is a confirmed requirement. |
| Full vehicle routing optimization | Deferred | Current heuristic (nearest-school greedy) is sufficient for small fleet (2-3 vehicles, 5-7 schools). TSP-class optimization deferred unless fleet/school count grows significantly. |
| School-stop normalization | Deferred | Current per-student route stop model is simpler. A future model could separate school-level stops from student-level seat assignments to eliminate redundant location data. |
| Student Recurring Schedule rule type | Excluded | Enrollment `contract_days` is the source of truth for recurring weekly schedules, so a separate recurring-schedule rule type is intentionally excluded. |
| Mobile-optimized layout | Deferred | Desktop-first with tablet usability. A dedicated mobile layout can be added based on usage patterns. |
| Real-time multi-user collaboration | Deferred | Supabase Realtime subscriptions can be added for live updates when multiple admins work simultaneously. |
