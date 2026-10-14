-- Stage 18: hadiah SLEEPY sekarang berupa TUKAR KARTU.
--   Sebelumnya: hadiah terbuka kalau pemain pernah mendapat kartu tier C "Sleepy Cat".
--   Sekarang  : pemain harus MEMEGANG kartu tier C "Sleepy Cat". Saat CLAIM, satu kartu itu
--               otomatis dihapus dari akun (lalu dicatat di user_discovered supaya koleksi / mahkota tidak berkurang)
--               dan hadiah coin yang sama (5.000) masuk ke saldo, dalam SATU transaksi.
-- Jalankan sekali di Supabase SQL Editor (setelah stage17.sql). Aman dijalankan berulang kali.

create or replace function sync_rewards(p_user uuid)
returns setof text language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into user_rewards (user_id, reward) values (p_user, 'LOGIN') on conflict do nothing;
  if found then return next 'LOGIN'; end if;

  -- SLEEPY: hanya terbuka selama kartunya benar-benar ada di akun. Kalau kartunya sudah tidak ada
  -- (dijual / difusi / dihadiahkan) dan hadiahnya belum diklaim, hadiah dikunci lagi.
  if exists (select 1 from cards c join user_cards u on u.card_id = c.id
             where c.name = 'Sleepy Cat' and c.tier::text = 'C' and u.user_id = p_user) then
    insert into user_rewards (user_id, reward) values (p_user, 'SLEEPY') on conflict do nothing;
    if found then return next 'SLEEPY'; end if;
  else
    delete from user_rewards where user_id = p_user and reward = 'SLEEPY' and claimed_at is null;
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

-- Klaim satu hadiah. Untuk SLEEPY: satu kartu "Sleepy Cat" (tier C) dihapus dari akun di transaksi yang sama.
-- Mengembalikan saldo coin baru, -1 jika hadiah belum terbuka / sudah diklaim, atau -2 jika kartu Sleepy Cat tidak ada lagi.
create or replace function claim_reward(p_user uuid, p_reward text, p_coins bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint; card_row bigint; card int;
begin
  if p_coins < 0 then raise exception 'invalid reward'; end if;

  perform 1 from user_rewards where user_id = p_user and reward = p_reward and claimed_at is null for update;
  if not found then return -1; end if;

  if p_reward = 'SLEEPY' then
    select u.id, u.card_id into card_row, card
      from user_cards u join cards c on c.id = u.card_id
      where u.user_id = p_user and c.name = 'Sleepy Cat' and c.tier::text = 'C'
      order by u.obtained_at limit 1 for update of u;
    if card_row is null then return -2; end if;

    -- catat dulu sebagai "pernah didapat" supaya jumlah kartu unik (border / mahkota) tidak ikut turun
    insert into user_discovered (user_id, card_id, discovered_at)
      select p_user, card, obtained_at from user_cards where id = card_row
      on conflict do nothing;
    delete from user_cards where id = card_row;

    -- kalau itu salinan terakhir, lepas dari pameran profil
    if not exists (select 1 from user_cards where user_id = p_user and card_id = card) then
      delete from showcases where user_id = p_user and card_id = card;
      update profiles set showcase = array_remove(showcase, card) where user_id = p_user;
    end if;
  end if;

  update user_rewards set claimed_at = now() where user_id = p_user and reward = p_reward;
  if p_coins > 0 then
    update users set coins = users.coins + p_coins where id = p_user returning users.coins into v;
  else
    select coins into v from users where id = p_user;
  end if;
  return v;
end $$;
revoke all on function claim_reward(uuid, text, bigint) from public, anon, authenticated;
grant execute on function claim_reward(uuid, text, bigint) to service_role;

-- Kunci ulang hadiah SLEEPY (yang belum diklaim) untuk pemain yang sudah tidak punya kartunya.
select sync_rewards(id) from users;

notify pgrst, 'reload schema';
select reward, count(*) as pemain from user_rewards group by reward order by reward;
