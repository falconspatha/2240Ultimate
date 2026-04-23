# Food Donation Ops Dashboard (Next.js + Supabase)

Production-ready operations dashboard for food donation, warehouse, and delivery workflows.

## Stack

- Next.js 14+ App Router + TypeScript
- Tailwind CSS
- Supabase (Postgres + RLS, RPC)

## Features

- Querystring-driven pages (filters/sorting/pagination via URL)
- CRUD flows for donations, orders, beneficiaries, zones
- FIFO allocation for picking
- Admin reset flow for user-generated pages
- RLS policies + Service Role for admin-only actions
- Loading skeletons, empty states, and errors

## Setup

1) Install dependencies

```bash
pnpm install
```

2) Configure environment

Create `.env.local` using `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE=...
```

3) Apply SQL in Supabase

Run the SQL files in order:

- `supabase/sql/schema.sql`
- `supabase/sql/rpc.sql`
- `supabase/sql/rls.sql`
- `supabase/sql/seed.sql` (optional)

4) Start dev server

```bash
pnpm dev
```

Open http://localhost:3000

## Authentication & Roles

The app uses Supabase Auth. Set the user role in `app_metadata.role`:

- `admin` (full access, can reset)
- `inventory`
- `beneficiary`
- `donor`

RLS policies in `supabase/sql/rls.sql` allow:

- Authenticated users to read operational tables
- Staff roles to write
- Only admin can delete or reset

## Admin Reset

`/admin/reset` triggers `fn_reset_generated_pages()` (service role only).

This deletes all rows in `tblUserPage` and recreates default pages. It logs:

- console log
- `tblAdminAuditLog`

## Querystring-Driven Pages

All list pages accept query params, e.g.

```
/inventory?q=milk&zone=1&category=Dairy&expiryBefore=2026-03-01&page=2&pageSize=20&sort=expiry
```

You can bookmark and share filtered views.

## Tests

Unit tests:

```bash
pnpm test:unit
```

E2E tests (requires running dev server):

```bash
pnpm dev
pnpm test:e2e
```

## Notes

- Service Role key is **server-only** (never expose in browser).
- If you need per-user row-level restrictions, add `Created_By` columns and update RLS.
