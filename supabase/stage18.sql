-- Stage 18: (1) kirim BANYAK kartu sekaligus di menu GIFT, (2) nama pack "Mv Pack 3",
--           (3) hadiah di menu CLAIM diperbaiki (Hadiah User Baru tidak lagi terkunci) dan dibuat tahan banting.
-- Jalankan sekali di Supabase SQL Editor (boleh langsung tanpa stage17.sql), lalu restart `npm run dev`. Aman dijalankan berulang kali.

-- ---------- 1) gift banyak kartu dalam SATU transaksi: semua terkirim atau tidak ada yang berpindah ----------
create or replace function gift_cards(p_from uuid, p_to uuid, p_rows bigint[])
returns int language plpgsql security definer set search_path = public as $$
declare want int; n int;
begin
  if p_from = p_to then raise exception 'cannot gift to yourself'; end if;
  select count(distinct x) into want from unnest(p_rows) x;
  if want = 0 then raise exception 'no cards'; end if;
  with moved as (
    update user_cards set user_id = p_to, obtained_at = now()
      where id = any(p_rows) and user_id = p_from returning card_id
  )
  insert into gifts (from_user, to_user, card_id) select p_from, p_to, card_id from moved;
  get diagnostics n = row_count;
  if n <> want then raise exception 'card not owned'; end if;
  delete from showcases s where s.user_id = p_from
    and not exists (select 1 from user_cards u where u.user_id = p_from and u.card_id = s.card_id);
  return n;
end $$;
revoke all on function gift_cards(uuid, uuid, bigint[]) from public, anon, authenticated;
grant execute on function gift_cards(uuid, uuid, bigint[]) to service_role;

-- ---------- 2) nama pack ----------
update packs set name = 'Mv Pack 3' where lower(name) = 'mv pack 3' and name <> 'Mv Pack 3';

-- ---------- 3) hadiah CLAIM (sama dengan stage17.sql, tapi tiap hadiah dicek terpisah) ----------
-- Penyebab "Hadiah Login tetap terkunci": satu pengecekan hadiah yang error (mis. tabel user_discovered dari stage16 belum ada)
-- membatalkan SELURUH fungsi, sehingga baris hadiah login pun tidak tersimpan. Sekarang tiap hadiah punya blok sendiri.
create table if not exists user_rewards (
  user_id uuid not null references users(id) on delete cascade,
  reward text not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  primary key (user_id, reward)
);
alter table user_rewards enable row level security;
revoke all on user_rewards from anon, authenticated;

create or replace function sync_rewards(p_user uuid)
returns setof text language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- Hadiah User Baru (LOGIN): selalu terbuka untuk akun yang aktif
  begin
    insert into user_rewards (user_id, reward) values (p_user, 'LOGIN') on conflict do nothing;
    if found then return next 'LOGIN'; end if;
  exception when others then null; end;

  -- Sleepy Cat (tier C): kartu yang dimiliki sekarang
  begin
    if exists (select 1 from cards c join user_cards u on u.card_id = c.id
               where u.user_id = p_user and c.name = 'Sleepy Cat' and c.tier::text = 'C') then
      insert into user_rewards (user_id, reward) values (p_user, 'SLEEPY') on conflict do nothing;
      if found then return next 'SLEEPY'; end if;
    end if;
  exception when others then null; end;
  -- ... atau pernah didapat (sudah dijual / difusi), butuh stage16.sql
  begin
    if exists (select 1 from cards c join user_discovered d on d.card_id = c.id
               where d.user_id = p_user and c.name = 'Sleepy Cat' and c.tier::text = 'C') then
      insert into user_rewards (user_id, reward) values (p_user, 'SLEEPY') on conflict do nothing;
      if found then return next 'SLEEPY'; end if;
    end if;
  exception when others then null; end;

  -- kartu ABSOLUTE pertama
  begin
    if exists (select 1 from cards c join user_cards u on u.card_id = c.id
               where u.user_id = p_user and c.tier::text = 'ABSOLUTE') then
      insert into user_rewards (user_id, reward) values (p_user, 'FIRST_ABS') on conflict do nothing;
      if found then return next 'FIRST_ABS'; end if;
    end if;
  exception when others then null; end;
  begin
    if exists (select 1 from cards c join user_discovered d on d.card_id = c.id
               where d.user_id = p_user and c.tier::text = 'ABSOLUTE') then
      insert into user_rewards (user_id, reward) values (p_user, 'FIRST_ABS') on conflict do nothing;
      if found then return next 'FIRST_ABS'; end if;
    end if;
  exception when others then null; end;

  -- mahkota: 150 kartu berbeda (dimiliki + pernah didapat)
  begin
    begin
      select count(*) into n from (
        select card_id from user_cards where user_id = p_user
        union
        select card_id from user_discovered where user_id = p_user
      ) x;
    exception when others then
      select count(distinct card_id) into n from user_cards where user_id = p_user;
    end;
    if n >= 150 then
      insert into user_rewards (user_id, reward) values (p_user, 'CROWN') on conflict do nothing;
      if found then return next 'CROWN'; end if;
    end if;
  exception when others then null; end;
  return;
end $$;
revoke all on function sync_rewards(uuid) from public, anon, authenticated;
grant execute on function sync_rewards(uuid) to service_role;

create or replace function claim_reward(p_user uuid, p_reward text, p_coins bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if p_coins < 0 then raise exception 'invalid reward'; end if;
  update user_rewards set claimed_at = now()
    where user_id = p_user and reward = p_reward and claimed_at is null;
  if not found then return -1; end if;
  if p_coins > 0 then
    update users set coins = users.coins + p_coins where id = p_user returning users.coins into v;
  else
    select coins into v from users where id = p_user;
  end if;
  return v;
end $$;
revoke all on function claim_reward(uuid, text, bigint) from public, anon, authenticated;
grant execute on function claim_reward(uuid, text, bigint) to service_role;

-- semua pemain yang sudah ada langsung mendapat hadiah yang memenuhi syarat
select sync_rewards(id) from users;

notify pgrst, 'reload schema';
select reward, count(*) filter (where claimed_at is null) as belum_diklaim, count(*) filter (where claimed_at is not null) as sudah_diklaim
from user_rewards group by reward order by reward;
select id, name, card_count from packs order by id;   -- cek: nama pack 3 = "Mv Pack 3"
