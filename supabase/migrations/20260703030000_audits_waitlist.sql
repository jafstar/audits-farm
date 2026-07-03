-- Audits.farm waitlist — email capture, shares the colony's Supabase project
-- (same one aint.farm/colony.aint.farm use) but its own table/namespace.
create table if not exists public.audits_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.audits_waitlist enable row level security;

create policy "Anyone can join audits waitlist"
  on public.audits_waitlist for insert
  with check (true);

create policy "Service role reads audits waitlist"
  on public.audits_waitlist for select
  using (auth.role() = 'service_role');
