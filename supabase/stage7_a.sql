-- Stage 7A: fusion + gift functions (idempotent, safe to run more than once). Run after stage4_a.sql. If you ever see "Could not find the function ... in the schema cache",
-- run this file again: the last line reloads the API schema.

-- ---------- fusion (same as stage4_b, repeated so it can never be missing)
create table if not exists settings (key text primary key, value jsonb not null);
insert into settings (key, value) values ('fusion_upgrade', '{"C":45,"B":35,"A":25,"S":15,"S_PLUS":8}') on conflict do nothing;
create table if not exists fusions (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  input_card_ids int[] not null,
  result_card_id int not null references cards(id),
  created_at timestamptz not null default now()
);
alter table settings enable row level security; alter table fusions enable row level security;
revoke all on settings, fusions from anon, authenticated;
create or replace function fuse_cards(p_user uuid, p_rows bigint[], p_result int)
returns void language plpgsql security definer set search_path = public as $$
declare n int; inputs int[];
begin
  select array_agg(card_id) into inputs from user_cards where user_id = p_user and id = any(p_rows);
  delete from user_cards where user_id = p_user and id = any(p_rows);
  get diagnostics n = row_count;
  if n <> 3 then raise exception 'invalid fusion'; end if;
  insert into user_cards (user_id, card_id) values (p_user, p_result);
  insert into fusions (user_id, input_card_ids, result_card_id) values (p_user, inputs, p_result);
  delete from showcases s where s.user_id = p_user
    and not exists (select 1 from user_cards u where u.user_id = p_user and u.card_id = s.card_id);
end $$;
revoke all on function fuse_cards(uuid, bigint[], int) from public, anon, authenticated;
grant execute on function fuse_cards(uuid, bigint[], int) to service_role;

-- ---------- gifts (same as stage5)
create table if not exists gifts (
  id bigserial primary key,
  from_user uuid not null references users(id) on delete cascade,
  to_user uuid not null references users(id) on delete cascade,
  card_id int not null references cards(id),
  created_at timestamptz not null default now()
);
alter table gifts enable row level security;
revoke all on gifts from anon, authenticated;
create or replace function gift_card(p_from uuid, p_to uuid, p_row bigint)
returns void language plpgsql security definer set search_path = public as $$
declare cid int;
begin
  if p_from = p_to then raise exception 'cannot gift to yourself'; end if;
  update user_cards set user_id = p_to, obtained_at = now() where id = p_row and user_id = p_from returning card_id into cid;
  if cid is null then raise exception 'card not owned'; end if;
  insert into gifts (from_user, to_user, card_id) values (p_from, p_to, cid);
  delete from showcases s where s.user_id = p_from
    and not exists (select 1 from user_cards u where u.user_id = p_from and u.card_id = s.card_id);
end $$;
revoke all on function gift_card(uuid, uuid, bigint) from public, anon, authenticated;
grant execute on function gift_card(uuid, uuid, bigint) to service_role;

notify pgrst, 'reload schema';
