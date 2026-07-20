-- Migration: add calendar_feed_token to profiles
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- Adds a unique, auto-generated token to each photographer's profile.
-- The token is the public identifier for their calendar feed URL:
--   https://camrhia.com/api/calendar/{token}
-- No auth is required to fetch the feed — the token itself is the access control,
-- matching the security model used for couple share-token links.
--
-- Existing rows automatically receive a token via the gen_random_uuid() default.

alter table public.profiles
  add column if not exists calendar_feed_token text
    not null default gen_random_uuid()::text;

-- Unique index so the lookup by token uses an index scan, not a full table scan
create unique index if not exists profiles_calendar_feed_token_idx
  on public.profiles (calendar_feed_token);
