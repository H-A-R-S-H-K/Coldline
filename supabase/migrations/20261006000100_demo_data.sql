-- Demo data for the prototype.
-- All dates are relative to "today" in the business timezone, so the demo always
-- shows overdue, due-today, stale and scheduled-today jobs no matter when it runs.
--
--   select public.reset_demo_data();                      -- default timezone
--   select public.reset_demo_data('America/New_York');    -- explicit timezone

create or replace function public.reset_demo_data(tz text default 'America/Chicago')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d   date := (now() at time zone tz)::date;  -- today, for Denise
  c   uuid;
  j   uuid;
begin
  -- "where true": Supabase's safeupdate guard rejects unqualified deletes via the API
  delete from public.activities where true;
  delete from public.jobs where true;
  delete from public.customers where true;

  -- 1. The $2,000 freezer: quoted, then nobody followed up. Overdue AND stale.
  insert into customers (name, phone) values ('ABC Restaurant', '(555) 201-4410') returning id into c;
  insert into jobs (customer_id, issue, status, priority, source, estimated_value, next_action, next_action_due_on, last_updated_at, created_at)
  values (c, 'Walk-in freezer down — product at risk', 'waiting_on_customer', 'urgent', 'phone', 2000,
          'Call to get quote approved', d - 3, now() - interval '4 days', now() - interval '6 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', 'Called in Friday afternoon. Freezer at 28°F and climbing.', now() - interval '6 days'),
    (j, 'visit_done', 'Marcus on site — compressor relay failed, fan motor weak.', now() - interval '5 days'),
    (j, 'quote_sent', 'Quoted $2,000 for compressor relay + fan motor.', now() - interval '4 days');

  -- 2. Referral via WhatsApp, came in last night, nobody has called back yet.
  insert into customers (name, phone) values ('Rosa''s Taqueria', '(555) 318-2207') returning id into c;
  insert into jobs (customer_id, issue, status, priority, source, next_action, next_action_due_on, last_updated_at, created_at)
  values (c, 'Prep table cooler running warm', 'new', 'urgent', 'referral',
          'Call back', d - 1, now() - interval '30 hours', now() - interval '30 hours')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '30 hours'),
    (j, 'message', '"Hi Denise, Joe from Joe''s Cafe gave me your number. Our prep table is warm, can someone come look? — Rosa"', now() - interval '30 hours');

  -- 3. Visit was booked for two days ago; job never marked done. Did it happen?
  insert into customers (name, phone) values ('Bella Pizza', '(555) 640-1182') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, scheduled_at, last_updated_at, created_at)
  values (c, 'Pizza prep fridge not cooling', 'scheduled', 'repeat', 450,
          'Do the job', d - 2, ((d - 2) + time '09:00') at time zone tz, now() - interval '5 days', now() - interval '7 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '7 days'),
    (j, 'job_scheduled', 'Booked with Andre.', now() - interval '5 days');

  -- 4. Due today: approved, needs a slot.
  insert into customers (name, phone) values ('Joe''s Cafe', '(555) 774-0193') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, last_updated_at, created_at)
  values (c, 'Reach-in cooler not holding temperature', 'needs_scheduling', 'repeat', 650,
          'Schedule the job', d, now() - interval '3 hours', now() - interval '2 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '2 days'),
    (j, 'customer_approved', 'Approved over the phone. Prefers mornings before 11.', now() - interval '3 hours');

  -- 5. Due today: quote needs to go out.
  insert into customers (name, phone) values ('Smith Foods', '(555) 902-3348') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, last_updated_at, created_at)
  values (c, 'Ice machine leaking — likely needs new water valve', 'waiting_on_quote', 'website', 1450,
          'Send quote', d, now() - interval '1 day', now() - interval '3 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', 'Website form.', now() - interval '3 days'),
    (j, 'visit_done', 'Diagnosed by Priya. Parts ~$600.', now() - interval '1 day');

  -- 6. Stale: quote out, follow-up not due yet, but silent for 6 days.
  insert into customers (name, phone) values ('Harbor Fish Market', '(555) 415-7720') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, last_updated_at, created_at)
  values (c, 'Display case compressor very noisy', 'waiting_on_customer', 'phone', 3200,
          'Follow up on quote', d + 2, now() - interval '6 days', now() - interval '9 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '9 days'),
    (j, 'quote_sent', 'Quoted $3,200 for compressor replacement.', now() - interval '6 days');

  -- 7. Stale: needs scheduling, no activity in 5 days.
  insert into customers (name, phone) values ('Valley High Cafeteria', '(555) 233-9051') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, last_updated_at, created_at)
  values (c, 'Milk cooler door gasket torn', 'needs_scheduling', 'phone', 300,
          'Schedule the job', d + 1, now() - interval '5 days', now() - interval '5 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', 'Facilities manager: can only do after 2pm.', now() - interval '5 days');

  -- 8 & 9. Scheduled today.
  insert into customers (name, phone) values ('Green Leaf Grocery', '(555) 380-6614') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, scheduled_at, last_updated_at, created_at)
  values (c, 'Quarterly maintenance on 3 walk-ins', 'scheduled', 'repeat', 900,
          'Do the job', d, (d + time '10:00') at time zone tz, now() - interval '2 days', now() - interval '8 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '8 days'),
    (j, 'job_scheduled', 'Marcus.', now() - interval '2 days');

  insert into customers (name, phone) values ('XYZ Market', '(555) 512-8830') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, scheduled_at, last_updated_at, created_at)
  values (c, 'Ice machine not making ice', 'scheduled', 'website', 700,
          'Do the job', d, (d + time '14:00') at time zone tz, now() - interval '1 day', now() - interval '2 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '2 days'),
    (j, 'job_scheduled', 'Priya.', now() - interval '1 day');

  -- 10. In progress, waiting on a part. Coming up tomorrow.
  insert into customers (name, phone) values ('Sunrise Bakery', '(555) 287-4456') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, last_updated_at, created_at)
  values (c, 'Replace evaporator fan motor in walk-in', 'in_progress', 'repeat', 800,
          'Check if part arrived', d + 1, now() - interval '1 day', now() - interval '6 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '6 days'),
    (j, 'job_scheduled', null, now() - interval '5 days'),
    (j, 'work_started', 'Fan motor ordered, ETA 2 days. Temporary fix in place.', now() - interval '1 day');

  -- 11. Scheduled later this week.
  insert into customers (name, phone) values ('Corner Deli', '(555) 691-0027') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, scheduled_at, last_updated_at, created_at)
  values (c, 'Walk-in cooler door not sealing', 'scheduled', 'phone', 250,
          'Do the job', d + 2, ((d + 2) + time '08:30') at time zone tz, now() - interval '1 day', now() - interval '2 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '2 days'),
    (j, 'job_scheduled', 'Andre.', now() - interval '1 day');

  -- 12. Waiting on customer, recently touched, follow-up in a few days.
  insert into customers (name, phone) values ('Main St Brewery', '(555) 348-5521') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, next_action, next_action_due_on, last_updated_at, created_at)
  values (c, 'Glycol chiller upgrade', 'waiting_on_customer', 'referral', 5400,
          'Follow up on quote', d + 4, now() - interval '1 day', now() - interval '4 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '4 days'),
    (j, 'quote_sent', 'Owner reviewing with partners, call back Friday.', now() - interval '1 day');

  -- 13 & 14. Done.
  insert into customers (name, phone) values ('Lakeside Diner', '(555) 120-3390') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, last_updated_at, closed_at, created_at)
  values (c, 'Freezer defrost timer replaced', 'done', 'repeat', 380, now() - interval '2 days', now() - interval '2 days', now() - interval '5 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '5 days'),
    (j, 'job_scheduled', null, now() - interval '4 days'),
    (j, 'job_completed', null, now() - interval '2 days');

  insert into customers (name, phone) values ('Golden Dragon', '(555) 455-7781') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, last_updated_at, closed_at, created_at)
  values (c, 'Reach-in freezer recharge', 'done', 'phone', 520, now() - interval '5 days', now() - interval '5 days', now() - interval '10 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', null, now() - interval '10 days'),
    (j, 'job_completed', null, now() - interval '5 days');

  -- 15. Lost.
  insert into customers (name, phone) values ('Pete''s Burgers', '(555) 806-2214') returning id into c;
  insert into jobs (customer_id, issue, status, source, estimated_value, last_updated_at, closed_at, created_at)
  values (c, 'Walk-in freezer not cooling', 'lost', 'phone', 1800, now() - interval '3 days', now() - interval '3 days', now() - interval '8 days')
  returning id into j;
  insert into activities (job_id, type, note, created_at) values
    (j, 'created', 'Called Friday evening.', now() - interval '8 days'),
    (j, 'marked_lost', 'Went with another company — we didn''t call back in time.', now() - interval '3 days');
end;
$$;

revoke all on function public.reset_demo_data(text) from public, anon;
grant execute on function public.reset_demo_data(text) to authenticated;
