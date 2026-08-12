# Tutor Manager Pro - Production Database Architecture

This document outlines the final production database architecture targeting PostgreSQL (Supabase). It embraces Clean Architecture principles, Domain-Driven Design, and prepares the system for high scalability (thousands of teachers, hundreds of thousands of students, and millions of attendance records).

## 1. Entity List

- **Teacher**: The core user/owner of the system.
- **Settings**: Configuration preferences per Teacher.
- **AcademicYear**: A bounded operational timeframe (e.g., 2024-2025).
- **AcademicYearStatistics**: Immutable financial and demographic aggregates for archived years.
- **Classroom**: Physical or virtual space managed by a Teacher.
- **Subject**: Educational topic or course material.
- **Group**: A cohort of students linked to a Subject, Classroom, and Academic Year.
- **Student**: An individual enrolled in a Group.
- **Session**: A single class occurrence for a given Group.
- **Attendance**: The presence/absence record for a Student at a specific Session.
- **Payment**: A financial transaction representing money collected from a Student.
- **Expense**: Outgoing costs incurred by the Teacher (can be linked to a Classroom/Group or global).
- **Notification**: Alerts and messages targeting a Teacher.

---

## 2. Relationships & Cardinalities

- **Teacher (1) to (1) Settings**: Each teacher has one global settings profile.
- **Teacher (1) to (N) AcademicYear**: A teacher operates across multiple years.
- **Teacher (1) to (N) Classroom**: A teacher manages multiple physical/virtual locations.
- **Teacher (1) to (N) Subject**: A teacher defines multiple subjects.
- **Teacher (1) to (N) Notification**: A teacher has an inbox of notifications.
- **AcademicYear (1) to (1) AcademicYearStatistics**: Once archived, a year is summarized into a single statistics record.
- **AcademicYear (1) to (N) Group**: Groups exist within the boundary of an academic year.
- **Subject (1) to (N) Group**: A group is formed to teach a specific subject.
- **Classroom (1) to (N) Group**: A group occupies a classroom.
- **Group (1) to (N) Student**: Students are enrolled in a specific group. *(A student moving to another group or year constitutes a new enrollment record or a many-to-many junction if global student profiles are needed, but per requirements, "Each Student belongs to one Group during one Academic Year", implying a 1:N relationship from Group to Student).*
- **Group (1) to (N) Session**: A group has many sessions over time.
- **Session (1) to (N) Attendance**: Each session has many attendance records (one per student).
- **Student (1) to (N) Attendance**: A student has many attendance records over time.
- **Student (1) to (N) Payment**: A student makes multiple payments over time.

---

## 3. Recommended Indexes

To optimize for large reporting queries and high-volume inserts (millions of attendance records):

- **Foreign Key Indexes**: Every foreign key (e.g., `teacher_id`, `group_id`, `student_id`, `session_id`) MUST have a standard B-Tree index to prevent full table scans during joins.
- **Composite Indexes for Lookups**:
  - `Attendance(student_id, session_id)`: Speeds up checking if a student was marked present for a specific session.
  - `Session(group_id, date)`: Optimizes timeline queries for group sessions.
  - `Payment(student_id, paid_at)`: Optimizes debt calculation aggregates.
  - `Student(group_id, is_deleted)`: Optimizes listing active students in a group.
- **Partial Indexes**:
  - `AcademicYear (teacher_id) WHERE is_active = true`: Ensures quick lookup of the current active year and enforces constraints.

---

## 4. Constraints

- **Primary Keys**: UUID `id` for all tables (prevents ID enumeration and simplifies offline syncing/migration).
- **Foreign Key Integrity**:
  - `ON DELETE CASCADE` for tightly coupled data (e.g., deleting a `Session` cascades to `Attendance`).
  - `ON DELETE RESTRICT` for foundational data (e.g., cannot delete a `Classroom` if `Group`s are currently assigned to it).
- **Unique Constraints**:
  - `(session_id, student_id)` on `Attendance` table (a student can only have one attendance record per session).
  - Only one active academic year per teacher (enforced via partial unique index).
- **Check Constraints**:
  - `Classroom.capacity > 0`
  - `Payment.amount >= 0`
  - `Expense.amount >= 0`
  - `Session.date <= CURRENT_TIMESTAMP` (if future sessions aren't allowed to be confirmed).

---

## 5. Debt & Financial Architecture

- **No Stored Debt Column**: Debt is strictly calculated at runtime or via database Views. 
  - *Formula*: `(Total Sessions Attended * Price Per Session) - Total Payments Made`.
- **Payment Cycles**: The `Settings` and `Group` tables will include a `payment_cycle_type` (ENUM: 'monthly', 'per_session', 'per_4_sessions') and `payment_cycle_value`. Payments record what they cover, but the source of truth for consumption remains `Attendance`.

---

## 6. Future Scalability Considerations

- **Table Partitioning**: As `Attendance` and `Payment` tables reach millions of rows, they should be partitioned by `academic_year_id` or `created_at` (range partitioning). This allows Postgres to skip scanning archived years during active operations.
- **Materialized Views**: For dashboard aggregates (revenue, debt overviews, attendance rates), Materialized Views can be refreshed asynchronously (e.g., hourly) to prevent expensive real-time SUM() queries across millions of rows on the main dashboard.
- **Connection Pooling**: Use PgBouncer (native in Supabase) to handle thousands of concurrent teacher connections efficiently.

---

## 7. Data Lifecycle & Archiving Strategy

1. **Active State**: The current `AcademicYear` has `is_active = true`. All writes occur here.
2. **Archival Event**: When the teacher starts a new year, the current year is marked `is_active = false, is_archived = true`.
3. **Summarization**: A database trigger or background job calculates totals (total income, expenses, student count) and writes a single row to `AcademicYearStatistics`.
4. **Pruning (Optional/Manual)**: After 1-3 years, detailed operational data (`Attendance`, `Session`, `Student`, `Payment`) for that archived year can be hard-deleted to save storage, because the `AcademicYearStatistics` retains the required business metrics.

---

## 8. Security Considerations (Supabase RLS)

- **Row Level Security (RLS)** is mandatory on every table.
- Every table MUST have a `teacher_id` column (either directly or via a deeply linked foreign key, though denormalizing `teacher_id` onto all tables simplifies RLS policies significantly and improves performance).
- **Policy Example**: 
  - `CREATE POLICY "Teachers can only access their own data" ON students FOR ALL USING (auth.uid() = teacher_id);`
- **Application Logic Bypass**: The UI/API never trusts client-provided `teacher_id`. It relies strictly on the Supabase JWT `auth.uid()`.

---

## 9. Migration Recommendations

- **UUID Mapping**: When migrating from Firestore, Firestore string IDs should be stored in a temporary `legacy_firestore_id` column to map relational references during the ETL process.
- **Batched ETL**: Extract data from Firestore, transform into relational CSV/JSON arrays, and load into Supabase using bulk `COPY` commands or Supabase RPC functions to avoid hitting rate limits.
- **Validation Phase**: Run dual-reads (read from Postgres, fallback to Firestore) during a beta period before fully deprecating the NoSQL database.
