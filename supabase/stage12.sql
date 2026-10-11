-- Stage 12: packs can be paid with vouchers. Safe to run more than once. Run after stage11.sql, then restart `npm run dev`.
alter table packs add column if not exists voucher_kind text check (voucher_kind in ('blue', 'gold'));   -- null = not paid with vouchers
alter table packs add column if not exists voucher_cost int not null default 1;                           -- vouchers per opening

-- "MV Pack 2" = 1 BLUE voucher, "MV Pack Collector" = 1 GOLD voucher (matched by name). They stop costing coins.
-- Only packs that have no voucher setting yet are touched, so re-running never overwrites what the admin set later.
update packs set voucher_kind = 'blue', voucher_cost = 1, coin_price = 0
 where voucher_kind is null and (lower(name) like '%pack 2%' or lower(name) = 'premium cat pack');
update packs set voucher_kind = 'gold', voucher_cost = 1, coin_price = 0
 where voucher_kind is null and lower(name) like '%collector%';

-- Open a voucher-priced pack: take the vouchers and save the cards in ONE transaction.
create or replace function record_opening_voucher(p_user uuid, p_pack int, p_cards int[], p_kind text, p_cost int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b bigint; g bigint;
begin
  if p_kind not in ('blue', 'gold') or p_cost < 1 then raise exception 'invalid price'; end if;
  update users set blue_vouchers = users.blue_vouchers - (case when p_kind = 'blue' then p_cost else 0 end),
                   gold_vouchers = users.gold_vouchers - (case when p_kind = 'gold' then p_cost else 0 end)
   where id = p_user
     and (case when p_kind = 'blue' then users.blue_vouchers else users.gold_vouchers end) >= p_cost
   returning users.blue_vouchers, users.gold_vouchers into b, g;
  if b is null then raise exception 'insufficient vouchers'; end if;
  insert into pack_openings (user_id, pack_id, card_ids) values (p_user, p_pack, p_cards);
  insert into user_cards (user_id, card_id) select p_user, unnest(p_cards);
  return jsonb_build_object('blue', b, 'gold', g);
end $$;
revoke all on function record_opening_voucher(uuid, int, int[], text, int) from public, anon, authenticated;
grant execute on function record_opening_voucher(uuid, int, int[], text, int) to service_role;

notify pgrst, 'reload schema';
select id, name, card_count, voucher_kind, voucher_cost, coin_price from packs order by id;   -- check: pack 2 = blue, collector = gold
