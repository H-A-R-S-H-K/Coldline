# Coldline — job follow-up for a refrigeration business

A mobile-first app for Denise, who runs a commercial refrigeration repair business with four technicians. It does one thing: **open it in the morning and see which jobs need you today**, so no request gets forgotten.

It is not a field-service platform. It has no invoicing, dispatch, GPS or push notifications. The morning dashboard is the reminder.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth) · installable PWA · deploys to Vercel as-is.

---

## Run it locally

Requires Node 20+ and Docker (for local Supabase).

```bash
npm install
npm run db:start      # local Supabase: applies migrations, seeds demo data + login
cp .env.example .env.local   # values printed by db:start; defaults already match local Supabase
npm run dev
```

Run the unit tests with `npm test`.

Open http://localhost:3000 and sign in with the demo account (the login form is pre-filled):

- **Email:** denise@example.com
- **Password:** followup123

Demo dates are **relative to today**, so the dashboard always shows overdue, due-today, stale and scheduled-today jobs. To start fresh, use **avatar → Reset demo data** or run `npm run db:reset`.

**Troubleshooting**
- *"Can't reach the database"* on login, or `Cannot connect to the Docker daemon`: start Docker Desktop, then `npm run db:start`.
- *"Another next dev server is already running"*: a dev server is already up for this folder. Open the URL it prints, or stop that process first.

## Deploy (Supabase + Vercel)

1. Create a Supabase project. Run `npx supabase link` and then `npx supabase db push` (or paste the two files in `supabase/migrations/` into the SQL editor).
2. Create Denise's user in **Authentication → Users**. To load demo jobs, run `select public.reset_demo_data('America/Chicago');`.
3. Import the repo into Vercel and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_BUSINESS_TZ`. In production, also set `NEXT_PUBLIC_SHOW_DEMO_LOGIN=false` so the login form isn't pre-filled.

---

## How it works

### Every active job answers four questions
**What is it? Where is it? What's next? When?** Each job has a `status`, a `next_action`, a `next_action_due_on` date and a `last_updated_at` timestamp. The dashboard is driven by the **next action**, not by the status alone.

### The dashboard (`src/lib/attention.ts`)
Every active job goes into exactly one section, in this order:

| Section | Rule |
|---|---|
| 🔴 **Overdue** | The next-action date has passed, or a booked visit date has passed and the job is still "Scheduled" ("Did the visit happen?") |
| 🟠 **Due today** | The next action is due today |
| 🟡 **Needs an update** | No activity for longer than the status's threshold, or no next step set |
| 🟢 **Scheduled today** | Today's visits, by time |
| ⚪ **Coming up** | Everything else that's active |

The headline card shows the count that needs attention and the dollar value at stake. Done and Lost jobs leave the dashboard but stay in history.

### Stale detection: never assume a quiet job is fine
Denise often handles things outside the app (for example, a customer calls to decline). So any job with no recorded activity past its threshold moves into the **Needs an update** section, even if its next step isn't due yet. (Overdue jobs stay in Overdue, which already demands action.) Thresholds are per status and live in one place:

```ts
// src/lib/config.ts
export const STALE_AFTER_DAYS = {
  new: 1,                 // the "forgotten Friday call" — never let a new request sit
  needs_scheduling: 2,
  waiting_on_quote: 2,
  waiting_on_customer: 3,
  in_progress: 3,
  scheduled: null,        // judged by the visit date instead
  ...
};
```

### "What happened?" instead of status-wrangling
The main button on every job asks **What happened?** and offers answers that fit the job's current status (`src/lib/workflow.ts`). Each answer sets the new status, a sensible next step and a due date. Denise can adjust them before saving, and everything is logged to the activity timeline.

| Current status | Answers offered |
|---|---|
| New | Talked — needs a visit · Visit booked · Needs a quote · No answer · Declined |
| Needs Scheduling | Visit booked · No answer · Needs more time · Declined |
| Scheduled | Job completed · Visited — needs more work · Needs rescheduling · Cancelled |
| Waiting on Quote | Quote sent (with amount) · Declined |
| Waiting on Customer | Approved (optionally book the visit straight away) · Declined · Needs more time · No answer |
| In Progress | Job completed · Waiting on parts · Return visit booked |
| *all of the above* | No change — check later (snooze) · Something else (note required) |

For corrections, the job page also has direct **Change status**, **Add note**, **Complete**, **Mark lost**, **Edit details** and **Reopen** actions.

### Adding a job
The required fields are customer, phone, problem and status. The next action and due date are filled in automatically from the status. A repeat customer is recognised by phone number or name, and their number fills in automatically. After saving, the app goes back to the dashboard and highlights the new job in its section.

**Paste a customer message:** paste a text, WhatsApp message or email. The message is saved to the job's history, so the customer's own words are there when Denise looks at the job later. The only thing read from it automatically is the **phone number**, which is filled in unless she has already typed one. Names and problem descriptions vary too much between messages for simple rules to read reliably, so she types those. `extractFromMessage` in `src/lib/extract.ts` is the single place where an AI step or a real WhatsApp, email or website integration could fill in more fields later.

---

## Project layout

```
supabase/
  migrations/…_init.sql        customers, jobs, activities, RLS, triggers
  migrations/…_demo_data.sql   reset_demo_data(tz): 15 realistic jobs, relative dates
  seed.sql                     demo login + demo data (local)
src/
  app/
    page.tsx                   dashboard ("Today")
    jobs/page.tsx              list with filters + search
    jobs/new/                  Add Job (+ paste-a-message)
    jobs/[id]/                 job detail, actions, activity timeline
    login/, setup/             auth; setup screen if env vars are missing
    actions.ts                 every mutation (server actions); each one logs an activity
    manifest.ts, pwa-icon/     PWA install
  lib/
    attention.ts               overdue / today / stale / scheduled bucketing
    workflow.ts                statuses, default next actions, "What happened?" outcomes
    config.ts                  owner name, timezone, stale thresholds
    dates.ts                   timezone-safe day math (business timezone, not server UTC)
    extract.ts                 phone number from a pasted message
    supabase/                  server client + session refresh
  components/                  cards, bottom sheet, pickers, toast, nav
  proxy.ts                     auth guard (Next 16's name for middleware)
```

## Design notes

- **Times are always in the business timezone.** Vercel runs in UTC, so "today", "overdue" and visit times are computed in `NEXT_PUBLIC_BUSINESS_TZ` (default `America/Chicago`). Due dates are stored as `date`, and visits as `timestamptz`.
- **Simple data model.** It has three tables. Activity entries are plain `type` + `note` rows. Customers are deduplicated by phone digits through a generated column.
- **Single-tenant auth.** Any signed-in user can see every job (RLS `to authenticated`). That fits one business, and roles can be added later.
- **Always current when opened.** Phones resume apps from memory instead of reloading them. `AutoRefresh` re-fetches the screen when the app comes back after more than 2 minutes, after the back button restores an old page, or when the day changes while it's open. Without it, Denise could see yesterday's "Due today" in the morning.
- **Tests** (`npm test`, Vitest) cover the rules that matter most: timezone and day math, which dashboard section each job lands in, the "What happened?" options, and phone detection.
- **Mobile details:** 44–56px touch targets, bottom sheets, 16px inputs (no iOS zoom), safe-area padding, and loading, empty and error states on every screen.
- **Why Next 16:** on Next 15.5, the updated page from a server action sometimes stayed uncommitted until an unrelated re-render, about 3 seconds in testing. Next 16 applies the update in about 200ms.

## Deliberately not built
Push notifications, native apps, dispatch/GPS, invoicing, inventory, calendar sync, real WhatsApp/email/webhook ingestion, AI chat, multi-tenant admin.
