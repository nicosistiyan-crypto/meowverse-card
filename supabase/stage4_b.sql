-- Stage 4, step 2. Run after stage4_a.sql.

-- Admin-editable settings (fusion upgrade chances live here).
create table if not exists settings (key text primary key, value jsonb not null);
insert into settings (key, value) values ('fusion_upgrade', '{"C":45,"B":35,"A":25,"S":15,"S_PLUS":8}') on conflict do nothing;

-- Fusion history (for admin stats).
create table if not exists fusions (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  input_card_ids int[] not null,
  result_card_id int not null references cards(id),
  created_at timestamptz not null default now()
);
alter table settings enable row level security;
alter table fusions enable row level security;
revoke all on settings, fusions from anon, authenticated;

-- Harder odds for A and above (admin can change them later in /admin).
update packs set odds = '{"C":66,"B":26,"A":5.5,"S":1.8,"S_PLUS":0.5,"PRIME":0.17,"ABSOLUTE":0.03}' where name = 'Basic Cat Pack';
update packs set odds = '{"C":50,"B":33,"A":11,"S":4,"S_PLUS":1.5,"PRIME":0.45,"ABSOLUTE":0.05}' where name = 'Premium Cat Pack';

-- Fusion: removes exactly 3 owned cards and adds the result, in one transaction.
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

-- Avatar storage: public-read bucket, images only, 2 MB. Uploads go through our server only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
