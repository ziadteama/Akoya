# Akoya Migration Plan

## Goal
Migrate the current Akoya application into a Next.js application using API routes and Prisma with PostgreSQL, without losing business behavior, database rules, user-facing workflows, or the current visual/export identity.

## Current System Snapshot
- Frontend: React + Vite in `Client/`
- Backend: Express + PostgreSQL in `Server/`
- Primary domains:
  - Authentication and role-based access
  - Users management
  - Meals and categories
  - Tickets and ticket sales
  - Orders and checkout
  - Credit accounts, transactions, and category linking
  - Reports and dashboards for admin, cashier, and accountant roles

## Target Stack
- Frontend and backend: Next.js
- API layer: Next.js route handlers / API routes
- Database access: Prisma
- Database: PostgreSQL

## Non-Negotiable Constraints
1. Any exported CSV sheet must keep the same format as the current application.
2. Any generated receipt must keep the same format as the current application.
3. The same color palette must be preserved across the migrated UI.

## Migration Principles
1. Preserve behavior before improving implementation.
2. Migrate one vertical slice at a time.
3. Keep database changes explicit and reversible.
4. Avoid rewriting everything in one pass unless the new stack absolutely requires it.
5. Validate each migrated slice with a working end-to-end flow.
6. Pause after each step for approval before moving to the next step.
7. Maintain security as a first-class requirement throughout the migration.
8. Keep the migrated code maintainable, clean, and easy to extend.

## Recommended Migration Phases

### Phase 0: Discovery and Freeze
- Inventory current routes, screens, controllers, DB tables, and business rules.
- Identify what is stable and what is buggy or legacy.
- Document all environment variables and runtime assumptions.
- Freeze scope for the first migration release.

### Phase 1: Architecture Decision
- Use Next.js App Router unless a legacy routing constraint requires otherwise.
- Put the API in route handlers / API routes inside the Next.js app.
- Use Prisma for all database access.
- Decide whether the existing PostgreSQL schema stays or is mapped into a new Prisma schema with minimal changes.
- Decide whether the migration is a full rewrite or an incremental strangler migration. Default should be incremental.

### Phase 2: Domain Mapping
Map current modules into new bounded areas:
- Auth and session/token handling
- User management
- Meals and categories
- Orders and checkout
- Tickets and ticket lifecycle
- Credit system
- Reporting and exports
- Shared UI components and layout

### Phase 3: Data and API Contract
- Define the new API contract before coding UI features.
- Confirm which current endpoints must remain compatible.
- Document database tables that must be preserved.
- Identify all derived fields, triggers, and stored rules.
- Map each existing controller method to a Next.js route handler or server action equivalent.

### Phase 4: Build Core Foundations
- New Next.js app shell and routing
- Centralized auth state
- Prisma client and database layer
- API client layer where needed for client-side calls
- Error handling and notifications
- Shared component layer and visual tokens that preserve the current color palette
- Role-based route protection

### Phase 5: Migrate Business Flows
Recommended order:
1. Sign in and auth
2. Dashboard shell by role
3. Users management
4. Meals and categories
5. Orders and checkout
6. Tickets and ticket sales
7. Credit system
8. Reports and exports

For reports, receipts, and exports, preserve output structure before any redesign.

### Phase 6: Reconcile Database Logic
- Decide whether triggers remain in PostgreSQL or move into application code.
- Review seed data, constraints, and sample records.
- Translate the current schema into Prisma models with minimal behavior drift.
- Add migration/versioning tooling.
- Verify that Prisma migrations can reproduce the existing database state safely.

### Phase 7: Verification
- Create smoke tests for each main role.
- Validate login, CRUD, checkout, ticket sales, and reporting.
- Compare outputs against the current system.
- Confirm receipt layout, CSV export layout, and palette fidelity match the old app.
- Confirm production readiness and rollback strategy.

## Current Risk Areas
- Password hashing and login compatibility
- Role-based routing and permissions
- Ticket and order total calculations
- Credit transaction balance updates
- Database triggers and their coupling to business logic
- Hard-coded API URLs or environment dependencies
- Receipt and CSV formatting regressions
- Color palette drift in the new UI

## Starter Inventory To Collect
- All frontend routes and pages
- All backend endpoints
- All database tables, triggers, and functions
- All user roles and permissions
- All env vars and deployment settings
- All report types and export formats

## First Deliverables
- Next.js app architecture decision
- Architecture sketch
- Route/API inventory
- Prisma schema and migration strategy
- A prioritized implementation backlog

## Success Criteria
- Core login works in the new stack
- Users can complete the same main workflows as today
- Reports and totals match the current system
- No critical data loss during migration
- Old system can be retired or kept in parallel intentionally
- The final system can run on a LAN with one device acting as the server
- Every migration step can be reviewed and approved before the next step begins
- Security requirements remain intact in the migrated system
- The codebase remains maintainable and clean after migration

## Notes
This document now assumes the migration target is Next.js with route handlers / API routes, Prisma, and PostgreSQL. Once implementation starts, this should be split into:
- architecture decision record
- migration backlog
- implementation checklist
- Prisma schema and migration plan
