-- Stage 7B: notifications + profile borders. Safe to run more than once. Run after stage7_a.sql.

-- ---------- notifications (gift received, border unlocked). Separate from the game's own "messages" table on purpose.
create table if not exists notifications (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  kind text not null default 'info',
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
alter table notifications enable row level security;
revoke all on notifications from anon, authenticated;

-- ---------- profile borders
-- A border is UNLOCKED the moment the player owns enough DIFFERENT cards (50 / 100 / 150, duplicates do not count),
-- then CLAIMED in the Claim menu. Rows are never deleted, so a border stays even if the collection later shrinks.
alter table profiles add column if not exists border text;
create table if not exists user_borders (
  user_id uuid not null references users(id) on delete cascade,
  border text not null,
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  primary key (user_id, border)
);
alter table user_borders enable row level security;
revoke all on user_borders from anon, authenticated;

-- Unlocks every border the player qualifies for and returns only the NEWLY unlocked ones.
create or replace function sync_borders(p_user uuid)
returns setof text language plpgsql security definer set search_path = public as $$
declare n int; r record;
begin
  select count(distinct card_id) into n from user_cards where user_id = p_user;
  for r in select v.b as b, v.need as need from (values ('PURPLE', 50), ('RED', 100), ('GOLD', 150)) as v(b, need) loop
    if n >= r.need then
      insert into user_borders (user_id, border) values (p_user, r.b) on conflict do nothing;
      if found then return next r.b; end if;
    end if;
  end loop;
  return;
end $$;
revoke all on function sync_borders(uuid) from public, anon, authenticated;
grant execute on function sync_borders(uuid) to service_role;

-- Players who already own enough cards get their borders right away.
select sync_borders(id) from users;

notify pgrst, 'reload schema';
