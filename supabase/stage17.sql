-- Stage 17: hadiah di menu CLAIM
--   LOGIN    = 1.000 coin, sekali per akun (hadiah login pertama)
--   SLEEPY   = 5.000 coin saat pertama kali mendapat kartu tier C "Sleepy Cat"
--   FIRST_ABS= 20.000 coin saat pertama kali mendapat kartu tier ABSOLUTE
--   CROWN    = simbol mahkota di kanan username untuk pemain yang berhasil mengoleksi 150 kartu berbeda
-- Jalankan sekali di Supabase SQL Editor (setelah stage16.sql), lalu restart `npm run dev`. Aman dijalankan berulang kali.

create table if not exists user_rewards (
  user_id uuid not null references users(id) on delete cascade,
  reward text not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  primary key (user_id, reward)
);
alter table user_rewards enable row level security;
revoke all on user_rewards from anon, authenticated;

-- Membuka semua hadiah yang sudah memenuhi syarat dan mengembalikan HANYA yang baru terbuka.
-- Kartu yang pernah didapat (user_cards + user_discovered) tetap dihitung walau sudah dijual / difusi.
create or replace function sync_rewards(p_user uuid)
returns setof text language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into user_rewards (user_id, reward) values (p_user, 'LOGIN') on conflict do nothing;
  if found then return next 'LOGIN'; end if;

  if exists (select 1 from cards c where c.name = 'Sleepy Cat' and c.tier::text = 'C'
      and (exists (select 1 from user_cards u where u.user_id = p_user and u.card_id = c.id)
        or exists (select 1 from user_discovered d where d.user_id = p_user and d.card_id = c.id))) then
    insert into user_rewards (user_id, reward) values (p_user, 'SLEEPY') on conflict do nothing;
    if found then return next 'SLEEPY'; end if;
  end if;

  if exists (select 1 from cards c where c.tier::text = 'ABSOLUTE'
      and (exists (select 1 from user_cards u where u.user_id = p_user and u.card_id = c.id)
        or exists (select 1 from user_discovered d where d.user_id = p_user and d.card_id = c.id))) then
    insert into user_rewards (user_id, reward) values (p_user, 'FIRST_ABS') on conflict do nothing;
    if found then return next 'FIRST_ABS'; end if;
  end if;

  select count(*) into n from (
    select card_id from user_cards where user_id = p_user
    union
    select card_id from user_discovered where user_id = p_user
  ) x;
  if n >= 150 then
    insert into user_rewards (user_id, reward) values (p_user, 'CROWN') on conflict do nothing;
    if found then return next 'CROWN'; end if;
  end if;
  return;
end $$;
revoke all on function sync_rewards(uuid) from public, anon, authenticated;
grant execute on function sync_rewards(uuid) to service_role;

-- Klaim satu hadiah: tandai sudah diklaim + tambah coin dalam SATU transaksi.
-- Mengembalikan saldo coin baru, atau -1 jika hadiah belum terbuka / sudah diklaim (tidak bisa dobel klaim).
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

-- Pemain yang sudah memenuhi syarat sekarang langsung dapat hadiahnya.
select sync_rewards(id) from users;

notify pgrst, 'reload schema';
select reward, count(*) as pemain from user_rewards group by reward order by reward;
