-- =============================================================================
-- ASP Pick-Up Management System -- Fictional Seed Data
-- All names, addresses, plates, and schools are fictional.
-- Do NOT use real data in this file.
-- =============================================================================

-- =============================================================================
-- SCHOOLS (5 total: 4 active, 1 inactive)
-- =============================================================================

INSERT INTO asp_schools (id, name, address, standard_dismissal_time, early_dismissal_time, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Riverside Elementary', '100 Maple Street', '15:00', '14:00', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'Maple Park Academy', '250 Oak Avenue', '15:00', '14:00', 'active'),
  ('a0000000-0000-0000-0000-000000000003', 'Cedar Ridge School', '480 Birch Boulevard', '15:30', '14:30', 'active'),
  ('a0000000-0000-0000-0000-000000000004', 'Pinecrest Preparatory', '720 Elm Drive', '15:00', '14:00', 'active'),
  ('a0000000-0000-0000-0000-000000000005', 'Lakewood Elementary', '55 Willow Lane', '15:00', '14:00', 'inactive');

-- =============================================================================
-- STUDENTS (12 total: 8 active, 2 pending, 2 former)
-- DOB notes: students born after 2017-06-18 are under 9 (booster required)
-- =============================================================================

INSERT INTO asp_students (id, name, school_id, date_of_birth, home_address, drop_off_only, dismissal_time, early_dismissal_time, first_pickup_date, status, comments_pickup, comments_dropoff) VALUES
  -- Active students
  ('b0000000-0000-0000-0000-000000000001', 'Maya Rivers', 'a0000000-0000-0000-0000-000000000001', '2016-03-12', '15 Spruce Court', false, NULL, NULL, '2025-09-02', 'active', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000002', 'Leo Carter', 'a0000000-0000-0000-0000-000000000001', '2018-07-25', '33 Alder Way', false, NULL, NULL, '2025-09-02', 'active', 'Wait at side entrance', NULL),
  ('b0000000-0000-0000-0000-000000000003', 'Nora Chen', 'a0000000-0000-0000-0000-000000000002', '2017-11-08', '88 Poplar Road', false, NULL, NULL, '2025-09-08', 'active', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000004', 'Sam Patel', 'a0000000-0000-0000-0000-000000000002', '2019-01-15', '12 Juniper Lane', false, NULL, NULL, '2025-09-08', 'active', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000005', 'Aria Torres', 'a0000000-0000-0000-0000-000000000003', '2016-09-30', '402 Fern Street', true, NULL, NULL, '2025-09-02', 'active', NULL, 'Drop off at front door'),
  ('b0000000-0000-0000-0000-000000000006', 'Ethan Brooks', 'a0000000-0000-0000-0000-000000000003', '2018-04-22', '67 Hemlock Crescent', false, '15:30', '14:30', '2025-10-01', 'active', 'Teacher releases late', NULL),
  ('b0000000-0000-0000-0000-000000000007', 'Lily Nguyen', 'a0000000-0000-0000-0000-000000000004', '2015-12-01', '210 Aspen Circle', false, NULL, NULL, '2025-09-02', 'active', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000008', 'Owen Mitchell', 'a0000000-0000-0000-0000-000000000001', '2019-08-14', '44 Cedar Lane', true, NULL, NULL, '2025-09-15', 'active', NULL, 'Ring bell on arrival'),

  -- Pending students (not yet confirmed)
  ('b0000000-0000-0000-0000-000000000009', 'Zara Kowalski', 'a0000000-0000-0000-0000-000000000002', '2017-05-20', '99 Magnolia Drive', false, NULL, NULL, NULL, 'pending', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000010', 'Finn Holloway', 'a0000000-0000-0000-0000-000000000004', '2018-10-03', '160 Chestnut Avenue', false, NULL, NULL, NULL, 'pending', NULL, NULL),

  -- Former students
  ('b0000000-0000-0000-0000-000000000011', 'Jade Moreno', 'a0000000-0000-0000-0000-000000000001', '2014-06-15', '78 Sycamore Blvd', false, NULL, NULL, '2024-09-03', 'former', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000012', 'Kai Andersen', 'a0000000-0000-0000-0000-000000000003', '2015-02-28', '305 Dogwood Place', false, NULL, NULL, '2024-09-03', 'former', NULL, NULL);

-- =============================================================================
-- GUARDIANS (8 total, linked to active/pending students)
-- =============================================================================

INSERT INTO asp_guardians (id, student_id, name, phone, email, is_primary) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Diana Rivers', '555-0101', 'diana.rivers@example.com', true),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'James Carter', '555-0102', 'james.carter@example.com', true),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Rebecca Carter', '555-0103', 'rebecca.carter@example.com', false),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'Linda Chen', '555-0104', 'linda.chen@example.com', true),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 'Raj Patel', '555-0105', 'raj.patel@example.com', true),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005', 'Maria Torres', '555-0106', 'maria.torres@example.com', true),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000006', 'Kevin Brooks', '555-0107', 'kevin.brooks@example.com', true),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000007', 'Thanh Nguyen', '555-0108', 'thanh.nguyen@example.com', true);

-- =============================================================================
-- ENROLLMENTS
-- Active students get active enrollments; pending get pending; former get cancelled.
-- =============================================================================

INSERT INTO asp_enrollments (id, student_id, start_date, end_date, contract_days, status, notes) VALUES
  -- Active 5-day enrollments
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2025-09-02', NULL, '{Mon,Tue,Wed,Thu,Fri}', 'active', 'Full week enrollment'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '2025-09-02', NULL, '{Mon,Tue,Wed,Thu,Fri}', 'active', NULL),
  ('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007', '2025-09-02', NULL, '{Mon,Tue,Wed,Thu,Fri}', 'active', NULL),

  -- Active 3-day enrollments
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', '2025-09-08', NULL, '{Mon,Wed,Fri}', 'active', '3-day schedule'),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', '2025-09-08', NULL, '{Tue,Thu}', 'active', '2-day schedule'),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', '2025-09-02', NULL, '{Mon,Tue,Wed,Thu,Fri}', 'active', 'Drop-off only student'),
  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', '2025-10-01', NULL, '{Mon,Wed,Fri}', 'active', NULL),
  ('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008', '2025-09-15', NULL, '{Mon,Tue,Wed}', 'active', 'Drop-off only student'),

  -- Pending enrollments
  ('d0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000009', '2026-09-01', NULL, '{Mon,Wed,Fri}', 'pending', 'Awaiting confirmation'),
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', '2026-09-01', NULL, '{Tue,Thu}', 'pending', 'Awaiting confirmation'),

  -- Cancelled enrollments (former students)
  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000011', '2024-09-03', '2025-06-30', '{Mon,Tue,Wed,Thu,Fri}', 'cancelled', 'Family relocated'),
  ('d0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000012', '2024-09-03', '2025-03-15', '{Mon,Wed,Fri}', 'cancelled', 'Schedule conflict');

-- =============================================================================
-- STAFF (6 total: mix of capabilities)
-- =============================================================================

INSERT INTO asp_staff (id, name, capabilities, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Alex Kim', '{driver,helper}', true),
  ('e0000000-0000-0000-0000-000000000002', 'Jordan Blake', '{driver}', true),
  ('e0000000-0000-0000-0000-000000000003', 'Casey Morgan', '{helper}', true),
  ('e0000000-0000-0000-0000-000000000004', 'Taylor Reid', '{driver,helper}', true),
  ('e0000000-0000-0000-0000-000000000005', 'Riley Santos', '{helper}', true),
  ('e0000000-0000-0000-0000-000000000006', 'Morgan Lee', '{driver}', false);

-- =============================================================================
-- VEHICLES (3 total, varying capacity)
-- =============================================================================

INSERT INTO asp_vehicles (id, name, total_seats, kids_seats, booster_seats, license_plate, is_active) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Van 1', 12, 10, 3, 'ABC-1234', true),
  ('f0000000-0000-0000-0000-000000000002', 'Van 2', 8, 6, 2, 'DEF-5678', true),
  ('f0000000-0000-0000-0000-000000000003', 'Van 3', 15, 12, 4, 'GHI-9012', true);

-- =============================================================================
-- CALENDAR RULES (one of each type, using 2026-2027 date ranges)
-- =============================================================================

INSERT INTO asp_calendar_rules (id, rule_type, target_type, target_student_id, target_school_id, target_name, start_date, end_date, days_of_week, switch_from_to, description, start_week, early_dismissal_time, is_active) VALUES
  -- 1. District-Wide Break
  ('10000000-0000-0000-0000-000000000001', 'District-Wide Break', 'all', NULL, NULL, 'ALL', '2026-12-21', '2027-01-02', '{Mon,Tue,Wed,Thu,Fri}', NULL, 'Winter Break 2026-2027', NULL, NULL, true),

  -- 2. District Pro-D Day
  ('10000000-0000-0000-0000-000000000002', 'District Pro-D Day', 'all', NULL, NULL, 'ALL', '2026-10-23', '2026-10-23', '{Fri}', NULL, 'District professional development day', NULL, NULL, true),

  -- 3. School-Specific Holiday
  ('10000000-0000-0000-0000-000000000003', 'School-Specific Holiday', 'school', NULL, 'a0000000-0000-0000-0000-000000000003', 'Cedar Ridge School', '2026-11-11', '2026-11-11', '{Wed}', NULL, 'School-specific holiday', NULL, NULL, true),

  -- 4. School Pro-D Day
  ('10000000-0000-0000-0000-000000000004', 'School Pro-D Day', 'school', NULL, 'a0000000-0000-0000-0000-000000000001', 'Riverside Elementary', '2026-11-20', '2026-11-20', '{Fri}', NULL, 'School professional development', NULL, NULL, true),

  -- 5. Early Dismissal (school-level)
  ('10000000-0000-0000-0000-000000000005', 'Early Dismissal', 'school', NULL, 'a0000000-0000-0000-0000-000000000002', 'Maple Park Academy', '2026-10-15', '2026-10-15', '{Thu}', NULL, 'Parent-teacher conferences', NULL, '13:30', true),

  -- 6. Student Temporary Absence
  ('10000000-0000-0000-0000-000000000006', 'Student Temporary Absence', 'student', 'b0000000-0000-0000-0000-000000000003', NULL, 'Nora Chen', '2026-11-02', '2026-11-06', '{Mon,Tue,Wed,Thu,Fri}', NULL, 'Family vacation', NULL, NULL, true),

  -- 7. Attends Every Other Week
  ('10000000-0000-0000-0000-000000000007', 'Attends Every Other Week', 'student', 'b0000000-0000-0000-0000-000000000004', NULL, 'Sam Patel', '2026-09-01', '2027-06-30', '{Tue,Thu}', NULL, 'Alternating week schedule', 'Absent', NULL, true),

  -- 8. Temporary Day Switch
  ('10000000-0000-0000-0000-000000000008', 'Temporary Day Switch', 'student', 'b0000000-0000-0000-0000-000000000001', NULL, 'Maya Rivers', '2026-10-05', '2026-10-09', NULL, 'Mon>Wed', 'Switching Monday to Wednesday for one week', NULL, NULL, true),

  -- 9. Extra Pickup Day
  ('10000000-0000-0000-0000-000000000009', 'Extra Pickup Day', 'student', 'b0000000-0000-0000-0000-000000000003', NULL, 'Nora Chen', '2026-10-14', '2026-10-14', '{Tue}', NULL, 'Extra pickup on Tuesday this week', NULL, NULL, true);

-- =============================================================================
-- WAITLIST (4 entries in various statuses)
-- =============================================================================

INSERT INTO asp_waitlist (id, child_name, date_of_birth, school_name, parent_name, parent_email, parent_phone, intended_days, waitlisted_on, status) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Harper Quinn', '2017-09-10', 'Riverside Elementary', 'Sarah Quinn', 'sarah.quinn@example.com', '555-0201', '{Mon,Wed,Fri}', '2026-05-15', 'waiting'),
  ('20000000-0000-0000-0000-000000000002', 'Rowan Diaz', '2018-03-22', 'Maple Park Academy', 'Carlos Diaz', 'carlos.diaz@example.com', '555-0202', '{Mon,Tue,Wed,Thu,Fri}', '2026-04-20', 'offered'),
  ('20000000-0000-0000-0000-000000000003', 'Sage Thornton', '2016-12-05', 'Cedar Ridge School', 'Beth Thornton', 'beth.thornton@example.com', '555-0203', '{Tue,Thu}', '2026-03-10', 'enrolled'),
  ('20000000-0000-0000-0000-000000000004', 'Avery Park', '2017-06-18', 'Pinecrest Preparatory', 'Daniel Park', 'daniel.park@example.com', '555-0204', '{Mon,Wed,Fri}', '2026-02-01', 'declined');

-- =============================================================================
-- STAFF AVAILABILITY (sample week: 2026-10-05 to 2026-10-09)
-- Default is unavailable; only explicit entries make staff available.
-- =============================================================================

INSERT INTO asp_staff_availability (staff_id, date, is_available) VALUES
  -- Alex Kim: available Mon-Fri
  ('e0000000-0000-0000-0000-000000000001', '2026-10-05', true),
  ('e0000000-0000-0000-0000-000000000001', '2026-10-06', true),
  ('e0000000-0000-0000-0000-000000000001', '2026-10-07', true),
  ('e0000000-0000-0000-0000-000000000001', '2026-10-08', true),
  ('e0000000-0000-0000-0000-000000000001', '2026-10-09', true),

  -- Jordan Blake: available Mon, Wed, Fri
  ('e0000000-0000-0000-0000-000000000002', '2026-10-05', true),
  ('e0000000-0000-0000-0000-000000000002', '2026-10-07', true),
  ('e0000000-0000-0000-0000-000000000002', '2026-10-09', true),

  -- Casey Morgan: available Mon-Fri
  ('e0000000-0000-0000-0000-000000000003', '2026-10-05', true),
  ('e0000000-0000-0000-0000-000000000003', '2026-10-06', true),
  ('e0000000-0000-0000-0000-000000000003', '2026-10-07', true),
  ('e0000000-0000-0000-0000-000000000003', '2026-10-08', true),
  ('e0000000-0000-0000-0000-000000000003', '2026-10-09', true),

  -- Taylor Reid: available Tue, Thu
  ('e0000000-0000-0000-0000-000000000004', '2026-10-06', true),
  ('e0000000-0000-0000-0000-000000000004', '2026-10-08', true),

  -- Riley Santos: available Mon-Fri
  ('e0000000-0000-0000-0000-000000000005', '2026-10-05', true),
  ('e0000000-0000-0000-0000-000000000005', '2026-10-06', true),
  ('e0000000-0000-0000-0000-000000000005', '2026-10-07', true),
  ('e0000000-0000-0000-0000-000000000005', '2026-10-08', true),
  ('e0000000-0000-0000-0000-000000000005', '2026-10-09', true);

  -- Morgan Lee: inactive staff, no availability entries
