-- Migration: add commission_rate to referrals
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- Stores the rate locked at activation time. Non-retroactive: existing rows
-- will have NULL, which the invoice.paid handler treats as the legacy 0.20 fallback.

alter table public.referrals
  add column if not exists commission_rate numeric(4,2);
