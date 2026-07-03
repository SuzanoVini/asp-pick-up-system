# Route Management RPC Migration Design

## Goal

Make a clean Supabase database support every RPC currently called by attendance and route-management code. Preserve the existing TypeScript interfaces and keep multi-row changes atomic.

## Scope

Add one migration defining these 16 functions:

- Attendance: `persist_materialized_attendance_and_sync_plan`, `save_attendance_override_and_sync_plan`
- Plans: `replace_route_plan_snapshot`, `finalize_route_plan`, `reopen_route_plan`
- Lanes: `create_route_lane`, `set_route_vehicle`, `delete_route_lane`
- Stops: `assign_route_student`, `assign_route_school_group`, `remove_route_stop`, `move_route_stop`, `reorder_route_stops`, `set_route_stop_responsible_staff`
- Staff: `upsert_staff_assignment_for_vehicle_date`, `remove_staff_assignment_for_vehicle_date_role`

No application API changes, new dependencies, drag-and-drop behavior, or unrelated schema changes.

## Security and Transactions

- Functions use `SECURITY INVOKER`; existing owner RLS remains the authorization boundary.
- Mutating functions verify draft/finalized/completed state in SQL so direct RPC callers cannot bypass application guards.
- Multi-row synchronization, replacement, group assignment, reorder, and finalization run atomically in their function transaction.
- Grants are limited to `authenticated`; no anonymous execution.
- Finalization snapshots vehicle, plate, driver, helper, and responsible staff names before marking the plan finalized.

## Data Behavior

- Attendance synchronization upserts supplied daily rows, preserves explicit overrides during recomputation, and synchronizes an existing draft plan snapshot.
- Plan replacement recalculates summary counts from the supplied JSON student snapshot.
- Lane numbering uses the next `run_number` under a locked plan.
- Assignment copies student, school, address, dismissal, booster, and responsible-staff snapshots into route stops.
- Stop movement and reorder resequence both `order_index` and `seat_number` without overriding manual order.
- Vehicle and staff changes refresh route-level display snapshots.
- Reopen returns finalized routes to editable draft state and records the supplied reason in audit metadata.

## Verification

1. A Jest contract test extracts application RPC names and asserts every name and parameter contract exists in migrations; it must fail before the migration is added.
2. Existing unit, TypeScript, Biome, and production-build checks remain green.
3. When Docker’s engine is accessible, reset a clean local Supabase database and run SQL integration checks for owner success, staff denial, atomic failures, snapshot population, and completed-route immutability.
