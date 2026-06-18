# ASP Pick-Up Management System

A white-label web application for managing after-school program pickup logistics. The system handles student enrollment, daily attendance computation from calendar rules, distance-optimized route generation, and per-vehicle PDF export for drivers.

Built as a standalone operational tool that can later integrate into a larger administration dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL) with Row-Level Security |
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

## Prerequisites

- Node.js 18 or later
- npm
- A Supabase project (free tier works for development)
- Google Maps API key (optional -- distance features are disabled if not set)

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
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps API key for distance calculations |
| `NEXT_PUBLIC_APP_NAME` | No | Application display name (default: ASP Manager) |
| `NEXT_PUBLIC_TIMEZONE` | No | Operational timezone (default: America/Vancouver) |

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npx @biomejs/biome check .` | Run Biome linter and formatter checks |
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
  kids-and-schools/       Daily operational grouping view
  routes/                 Route planner and editor
  vehicles/               Vehicle fleet management
  staff/                  Staff management
  staff-schedule/         Weekly availability and assignment
  waitlist/               Pre-enrollment waitlist (owner only)
  former-students/        Archived student records
  audit/                  Audit log viewer (owner only)
  components/
    layout/               Sidebar, Header, Logo
    ui/                   Shared UI components
    providers/            Auth and theme providers
  lib/
    supabase/             Database client and types
    engine/               Rule engine (pure functions)
    schemas/              Shared Zod validation schemas
    services/             Geocoding, route optimization, PDF
    utils/                Date and timezone helpers
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

- **Kids and Schools View** -- Daily operational view grouping students by school, with sections for present, drop-off only, absent, and not-scheduled students.

- **Route Planner** -- Per-date route generation with distance-based auto-optimization, drag-and-drop editing, capacity validation, and readiness checks before export.

- **PDF Export** -- Per-vehicle route PDFs with driver, student, school, address, dismissal time, and booster indicators.

- **Staff Scheduling** -- Two-layer weekly view for managing date-specific staff availability and vehicle/role assignments.

- **White-Label Architecture** -- CSS variable theme tokens, replaceable logo slot, and configurable app name. No hardcoded branding.

- **Role-Based Access** -- Owner/admin and staff roles with Row-Level Security. Staff see operational data only through restricted views that exclude sensitive fields.

## Documentation

- [Software Requirements Specification](docs/SRS.md)
- [Software Design Document](docs/SDD.md)
- [Database Schema Reference](docs/database.md)
- [Test Plan](docs/test-plan.md)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
