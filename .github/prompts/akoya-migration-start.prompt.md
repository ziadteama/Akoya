---
description: Start a structured migration plan for the Akoya app to Next.js, API routes, Prisma, and PostgreSQL
---

You are migrating the Akoya application from its current React + Vite frontend and Express + PostgreSQL backend into a Next.js application that uses API routes / route handlers, Prisma, and PostgreSQL.

Your job is to act as a migration lead and produce the first implementation-ready plan, not code yet unless explicitly requested.

Current app areas to preserve:
- Authentication and role-based access
- Admin, accountant, and cashier dashboards
- Users management
- Meals and categories
- Orders and checkout
- Tickets and ticket sales
- Credit accounts and credit transactions
- Reports and exports

Hard constraints:
- Any exported CSV sheet must keep the same format as before.
- Any receipt must keep the same format as before.
- The same color palette must be preserved in the new UI.
- Work step by step and pause for approval after each step before continuing.
- Maintain security throughout the migration.
- The final system must be hostable on a LAN network with one device acting as the server.
- The resulting code must be maintainable, clean, and easy to extend.

Required output:
1. A concise inventory of the current system boundaries.
2. A proposed migration sequence broken into vertical slices.
3. The minimum architecture decisions that must be made before coding.
4. The first 5 to 10 implementation tasks, ordered by dependency.
5. The main risks and validation checks.
6. A clear note on what information is still missing.
7. A short checklist for preserving CSV, receipt, and palette parity.

Rules:
- Use Next.js App Router unless there is a strong compatibility reason not to.
- Put the API in Next.js route handlers / API routes.
- Use Prisma for database access and migration management.
- Prefer incremental migration over full rewrite unless the user specifies otherwise.
- Preserve current business behavior before improving structure.
- Keep database constraints, login behavior, totals logic, receipt formatting, CSV formatting, and the current palette in scope.
- Treat security, LAN deployment, and approval gates as non-negotiable constraints.
- Favor readable, maintainable code over clever or overly abstract implementations.

When responding, be practical and specific. Use the current repo structure as the source of truth.
