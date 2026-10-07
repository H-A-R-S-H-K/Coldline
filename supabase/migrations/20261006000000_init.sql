-- Core schema: customers, jobs, activities.
-- Single-business app: any signed-in user (Denise) can read and write everything.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  phone       text not null default '',
  -- digits-only copy of phone, used to recognise repeat customers
  phone_digits text generated always as (regexp_replace(phone, '\D', '', 'g')) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index customers_phone_digits_idx on public.customers (phone_digits);
create index customers_name_idx on public.customers (lower(name));

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
create table public.jobs (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers (id) on delete cascade,
  issue               text not null check (length(trim(issue)) > 0),
  status              text not null default 'new' check (status in (
                        'new', 'needs_scheduling', 'scheduled', 'waiting_on_quote',
                        'waiting_on_customer', 'in_progress', 'done', 'lost')),
  priority            text not null default 'normal' check (priority in ('normal', 'urgent')),
  source              text check (source in ('phone', 'website', 'repeat', 'referral', 'text', 'other')),
  estimated_value     numeric(10, 2) check (estimated_value is null or estimated_value >= 0),
  next_action         text,
  -- a calendar day in the business timezone; "due today" is a day, not an instant
  next_action_due_on  date,
  -- when a technician visit is booked (status = scheduled)
  scheduled_at        timestamptz,
  closed_at           timestamptz,
  -- bumped whenever Denise records something; drives stale detection
  last_updated_at     timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index jobs_status_idx on public.jobs (status);
create index jobs_customer_idx on public.jobs (customer_id);
create index jobs_due_idx on public.jobs (next_action_due_on) where status not in ('done', 'lost');

-- ---------------------------------------------------------------------------
-- activities (job timeline)
-- ---------------------------------------------------------------------------
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  type        text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index activities_job_idx on public.activities (job_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security: signed-in users only
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.activities enable row level security;

create policy "signed-in users manage customers" on public.customers
  for all to authenticated using (true) with check (true);

create policy "signed-in users manage jobs" on public.jobs
  for all to authenticated using (true) with check (true);

create policy "signed-in users manage activities" on public.activities
  for all to authenticated using (true) with check (true);
