-- Stage 11: vouchers (blue + gold), coin-priced packs, selling cards. Safe to run more than once.
-- Run this whole file once in the Supabase SQL editor (after stage10.sql), then restart `npm run dev`.

alter table users add column if not exists blue_vouchers bigint not null default 0;
alter table users add column if not exists gold_vouchers bigint not null default 0;
alter table packs add column if not exists coin_price bigint not null default 0;   -- 0 = free pack

-- Voucher prices (in coins) live in `settings`; the admin changes them in /admin > Toko.
insert into settings (key, value) values ('voucher_prices', '{"blue":100,"gold":500}') on conflict do nothing;

-- "MV Pack 2" -> 5 cards per pack, paid with coins. "MV Pack Collector" -> paid with coins.
-- These match by NAME ("... pack 2" / "premium cat pack" / "... collector"). Prices only apply while still 0, so re-running never
-- overwrites a price the admin set. Check the result table at the bottom; anything can also be changed later in /admin > Toko.
update packs set card_count = 5 where lower(name) like '%pack 2%' or lower(name) = 'premium cat pack';
update packs set coin_price = 200  where coin_price = 0 and (lower(name) like '%pack 2%' or lower(name) = 'premium cat pack');
update packs set coin_price = 2000 where coin_price = 0 and lower(name) like '%collector%';

-- Open a coin-priced pack: take the coins and save the cards in ONE transaction (no coins lost if saving fails).
create or replace function record_opening_paid(p_user uuid, p_pack int, p_cards int[], p_price bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if p_price < 0 then raise exception 'invalid price'; end if;
  update users set coins = users.coins - p_price where id = p_user and users.coins >= p_price returning users.coins into v;
  if v is null then raise exception 'insufficient coins'; end if;
  insert into pack_openings (user_id, pack_id, card_ids) values (p_user, p_pack, p_cards);
  insert into user_cards (user_id, card_id) select p_user, unnest(p_cards);
  return v;
end $$;

-- Buy vouchers with coins (p_total = unit price x qty, worked out on the server from the admin's price).
create or replace function buy_voucher(p_user uuid, p_kind text, p_qty int, p_total bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c bigint; b bigint; g bigint;
begin
  if p_kind not in ('blue', 'gold') or p_qty < 1 or p_total < 0 then raise exception 'invalid purchase'; end if;
  update users set coins = users.coins - p_total,
         blue_vouchers = users.blue_vouchers + (case when p_kind = 'blue' then p_qty else 0 end),
         gold_vouchers = users.gold_vouchers + (case when p_kind = 'gold' then p_qty else 0 end)
   where id = p_user and users.coins >= p_total
   returning users.coins, users.blue_vouchers, users.gold_vouchers into c, b, g;
  if c is null then raise exception 'insufficient coins'; end if;
  return jsonb_build_object('coins', c, 'blue', b, 'gold', g);
end $$;

-- Sell cards: remove exactly these owned card copies and pay p_total coins, all or nothing.
create or replace function sell_cards(p_user uuid, p_rows bigint[], p_total bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare n int; v bigint;
begin
  if p_total < 0 or coalesce(array_length(p_rows, 1), 0) = 0 then raise exception 'invalid sale'; end if;
  delete from user_cards where user_id = p_user and id = any(p_rows);
  get diagnostics n = row_count;
  if n <> array_length(p_rows, 1) then raise exception 'some cards are not yours'; end if;
  update users set coins = users.coins + p_total where id = p_user returning users.coins into v;
  return v;
end $$;

revoke all on function record_opening_paid(uuid, int, int[], bigint) from public, anon, authenticated;
revoke all on function buy_voucher(uuid, text, int, bigint) from public, anon, authenticated;
revoke all on function sell_cards(uuid, bigint[], bigint) from public, anon, authenticated;
grant execute on function record_opening_paid(uuid, int, int[], bigint) to service_role;
grant execute on function buy_voucher(uuid, text, int, bigint) to service_role;
grant execute on function sell_cards(uuid, bigint[], bigint) to service_role;

notify pgrst, 'reload schema';
select id, name, card_count, coin_price from packs order by id;   -- check: pack 2 = 5 cards, paid packs have a price
