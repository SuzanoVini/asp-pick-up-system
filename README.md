# ASP Pick-Up Management System

A white-label web application for managing after-school program pickup logistics. The system handles student enrollment, daily attendance computation from calendar rules, daily pickup-list review, manual route building, and per-vehicle PDF export for drivers.

Built as a standalone operational tool that can later integrate into a larger administration dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Auth | Supabase Auth (owner/staff roles) |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| Date Handling | date-fns |
| Icons | lucide-react |
| PDF Export | pdfkit |
| Lint/Format | Biome |
| Tests | Jest (unit + embedded-PostgreSQL migration tests via PGlite) |

## Prerequisites

- Node.js 18 or later
- npm
- A Supabase project (free tier works for development)
- Google Maps API key (optional -- enables automatic school geocoding and driving-distance route ordering)

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd asp-pickup-system
```

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase credentials and optional API keys.

5. If using Supabase CLI, apply migrations and seed data:

```bash
npx supabase db reset
```

6. Start the development server:

```bash
npm run dev
```

7. Open http://localhost:3000 in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public API key |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps API key for school address geocoding, driving-distance route ordering, route leg duration, and route total distance |
| `NEXT_PUBLIC_APP_NAME` | No | Application display name (default: ASP Manager) |

The app never uses the Supabase service role key: every query runs in the signed-in user's context and is enforced by Row-Level Security and `SECURITY DEFINER` RPCs with in-database authorization checks. The operational timezone is configured on the Settings page (stored in the database), not via environment variable.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm test` | Run the Jest suite (unit + embedded-PostgreSQL migration tests) |
| `npm run lint` | Run Biome linter and formatter checks |
| `npx @biomejs/biome check --write .` | Auto-fix lint and format issues |

## Project Structure

```
app/
  layout.tsx              Root layout with sidebar and auth gate
  page.tsx                Dashboard / Today view
  login/                  Authentication
  students/               Student management
  schools/                School management
  guardians/              Guardian contacts (owner only)
  enrollments/            Enrollment lifecycle
  calendar-rules/         Attendance rule management
  attendance/             Daily attendance preview and overrides
  kids-and-schools/       Daily pickup list grouped by school
  route-management/       Daily route board: lanes, vehicles, staff, stops, finalization
  route-history/          Persisted route plan snapshots and PDF re-export
  vehicles/               Vehicle fleet management
  staff/                  Staff management
  staff-schedule/         Weekly availability and assignment
  waitlist/               Pre-enrollment waitlist (owner only)
  former-students/        Archived student records
  audit/                  Audit log viewer (owner only)
  components/
    layout/               Sidebar, Header, Logo
    ui/                   Shared UI components
  lib/
    supabase/             Database query helpers and RPC wrappers
    engine/               Rule engine (pure functions)
    routes/               Route board view building and readiness checks
    schemas/              Shared Zod validation schemas
    security/             Authorization helpers
    services/             Geocoding, distance, PDF
    utils/                Date helpers
  actions/                Server actions (mutations)
docs/
  SRS.md                  Software Requirements Specification
  SDD.md                  Software Design Document
  database.md             Database schema reference
  test-plan.md            Testing strategy
supabase/
  migrations/             SQL migration files
  seed.sql                Fictional seed data
```

## Key Features

- **Calendar Rule Engine** -- Nine rule types that automatically compute daily attendance from enrollment contracts. Supports district breaks, school holidays, early dismissals, student absences, alternating week schedules, temporary day switches, and extra pickup days.

- **Daily Attendance View** -- Per-date list of every enrolled student with computed status (present, early dismissal, absent, drop-off only), applied rules, conflicts, and manual overrides.

- **Kids and Schools View** -- Daily pickup list grouped by school, with sections for present, drop-off only, absent, and not-scheduled students.

- **Route Management Board** -- Spreadsheet-style daily route workflow: materialize the pickup list into a persisted plan, add route lanes, assign vehicles and qualified drivers/helpers, assign students individually or by school group, arrange stop order, and finalize behind readiness checks (capacity, booster seats, staffing, unassigned students).

- **Route History** -- Persisted per-date route plan snapshots showing what was actually finalized: vehicle, staff, ordered students, schools, addresses, dismissal times, booster needs, and export timestamps, with per-route PDF re-export.

- **PDF Export** -- Per-vehicle route PDFs with driver, student, school, address, dismissal time, and booster indicators.

- **Staff Scheduling** -- Date-specific staff availability plus manual driver/helper assignment to each vehicle route.

- **Audit Log** -- Owner-only viewer over audit events written by route operations and trusted database RPCs, filterable by entity, action, and date.

- **White-Label Architecture** -- CSS variable theme tokens, replaceable logo slot, and configurable app name. No hardcoded branding.

- **Role-Based Access** -- Owner/admin and staff roles with Row-Level Security. Staff see operational data only through restricted views that exclude sensitive fields.

## Documentation

- [Software Requirements Specification](docs/SRS.md)
- [Software Design Document](docs/SDD.md)
- [Database Schema Reference](docs/database.md)
- [Test Plan](docs/test-plan.md)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
