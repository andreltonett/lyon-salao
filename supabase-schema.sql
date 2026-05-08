create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_select" on public.app_state;
drop policy if exists "app_state_insert" on public.app_state;
drop policy if exists "app_state_update" on public.app_state;

create policy "app_state_select"
on public.app_state
for select
to anon
using (true);

create policy "app_state_insert"
on public.app_state
for insert
to anon
with check (true);

create policy "app_state_update"
on public.app_state
for update
to anon
using (true)
with check (true);

create or replace function public.set_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_state_updated_at on public.app_state;

create trigger app_state_updated_at
before update on public.app_state
for each row
execute function public.set_app_state_updated_at();
