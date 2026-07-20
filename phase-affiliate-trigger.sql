-- Migration: affiliate row creation trigger
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- Why: signUp() with email confirmation enabled returns no session, so any
-- client-side INSERT into affiliates (which requires auth.uid()) fails with 403.
-- This trigger runs server-side with SECURITY DEFINER privileges immediately
-- after the auth.users row is created — before email is confirmed, no session needed.

create or replace function public.handle_new_affiliate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'account_kind' = 'affiliate' then
    insert into public.affiliates (id, email, name, referral_code)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'referral_code'
    );
  end if;
  return new;
end;
$$;

create trigger on_affiliate_created
  after insert on auth.users
  for each row execute procedure public.handle_new_affiliate();
