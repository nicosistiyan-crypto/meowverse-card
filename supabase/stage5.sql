-- Stage 5: gift cards between players. Run once in Supabase SQL Editor.
create table if not exists gifts (
  id bigserial primary key,
  from_user uuid not null references users(id) on delete cascade,
  to_user uuid not null references users(id) on delete cascade,
  card_id int not null references cards(id),
  created_at timestamptz not null default now()
);
create index if not exists gifts_to_idx on gifts (to_user, created_at desc);
alter table gifts enable row level security;
revoke all on gifts from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Moves ONE owned card copy from sender to receiver in one transaction.
create or replace function gift_card(p_from uuid, p_to uuid, p_row bigint)
returns void language plpgsql security definer set search_path = public as $$
declare cid int;
begin
  if p_from = p_to then raise exception 'cannot gift to yourself'; end if;
  update user_cards set user_id = p_to, obtained_at = now()
    where id = p_row and user_id = p_from returning card_id into cid;
  if cid is null then raise exception 'card not owned'; end if;
  insert into gifts (from_user, to_user, card_id) values (p_from, p_to, cid);
  delete from showcases s where s.user_id = p_from
    and not exists (select 1 from user_cards u where u.user_id = p_from and u.card_id = s.card_id);
end $$;
revoke all on function gift_card(uuid, uuid, bigint) from public, anon, authenticated;
grant execute on function gift_card(uuid, uuid, bigint) to service_role;
