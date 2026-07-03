# Route Management RPCs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use superpowers-ponytail:ponytail at full intensity plus superpowers-ponytail:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every attendance and route-management RPC called by the application available from a clean migrated Supabase database.

**Architecture:** Add one ordered PL/pgSQL migration containing the exact 16 RPC contracts already exposed by TypeScript query helpers. Use trusted `SECURITY DEFINER` transactions with explicit role checks and fixed search paths, add SQL state guards for direct callers, and validate source-to-migration parity with a Jest filesystem contract test.

**Tech Stack:** PostgreSQL/PL/pgSQL, Supabase migrations/RLS, Jest, TypeScript.

---

### Task 1: RPC migration contract test

**Files:**
- Create: `app/lib/supabase/__tests__/rpc-migration-contract.test.ts`

- [ ] Write a test that extracts literal `supabase.rpc("name", { ... })` calls from `app/actions/` and `app/lib/`, extracts `CREATE OR REPLACE FUNCTION public.name(...)` declarations from `supabase/migrations/`, and asserts every called RPC and `p_*` argument is declared.
- [ ] Run `npm.cmd test -- --runInBand app/lib/supabase/__tests__/rpc-migration-contract.test.ts` and confirm it fails by listing the 16 missing RPCs.
- [ ] Keep the parser local to the test; do not add a production abstraction or dependency.

### Task 2: Attendance and plan RPCs

**Files:**
- Create: `supabase/migrations/00023_route_management_rpcs.sql`

- [ ] Add `persist_materialized_attendance_and_sync_plan` and `save_attendance_override_and_sync_plan` with atomic attendance upserts, manual-override preservation, and existing-draft-plan synchronization.
- [ ] Add `replace_route_plan_snapshot`, `finalize_route_plan`, and `reopen_route_plan` with summary count calculation, state validation, route/staff snapshot freezing, and audit records for finalization overrides/reopen reasons.
- [ ] Use `SECURITY DEFINER`, fixed `search_path = public`, explicit owner/staff checks, authenticated-only grants, and `auth.uid()` for actor fields.
- [ ] Run the contract test and confirm only lane/stop/staff RPCs remain missing.

### Task 3: Lane, stop, and staff RPCs

**Files:**
- Modify: `supabase/migrations/00023_route_management_rpcs.sql`

- [ ] Add lane creation, vehicle selection, and confirmed deletion with draft/completed guards and route snapshot refresh.
- [ ] Add individual/school assignment, removal, cross-lane movement, full reorder, and responsible-staff update. Copy persisted snapshots and resequence `order_index`/`seat_number` atomically.
- [ ] Add qualified/available staff upsert and role removal; refresh matching route driver/helper snapshots.
- [ ] Revoke public/anonymous execution and grant all 16 functions to `authenticated`.
- [ ] Run the contract test and confirm it passes.

### Task 4: Verification and handoff

**Files:**
- Modify: `HANDOFF.md` in the main project root (gitignored)

- [ ] Run full Jest, `npx.cmd tsc --noEmit`, touched-file Biome, and `npm.cmd run build`.
- [ ] Attempt a clean local Supabase reset. If Docker remains inaccessible to the agent, record the named-pipe limitation accurately; do not claim live SQL verification.
- [ ] Audit migration functions against TypeScript RPC names/arguments and inspect `git diff --check` and history for prohibited attribution.
- [ ] Commit implementation with an imperative, attribution-free message.
