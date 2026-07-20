-- Migration: churn_log table
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)

create table public.churn_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  email        text,
  reason       text,
  feedback     text,
  canceled_at  timestamptz not null default now()
);

alter table public.churn_log enable row level security;

drop policy if exists "Authenticated users can read churn_log" on public.churn_log;

-- Only users in the admins table can read cancellation data.
-- No insert/update/delete policy — the webhook uses the service role key,
-- which bypasses RLS. Public clients cannot write to this table.
create policy "admins read churn_log" on public.churn_log
  for select to authenticated
  using (exists (select 1 from admins where id = auth.uid()));
