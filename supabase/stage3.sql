-- Stage 3: run once in Supabase SQL Editor.
-- Records a pack opening and the won cards in ONE transaction (all or nothing).
create or replace function record_opening(p_user uuid, p_pack int, p_cards int[])
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into pack_openings (user_id, pack_id, card_ids) values (p_user, p_pack, p_cards);
  insert into user_cards (user_id, card_id) select p_user, unnest(p_cards);
end $$;
revoke all on function record_opening(uuid, int, int[]) from public, anon, authenticated;
grant execute on function record_opening(uuid, int, int[]) to service_role;
