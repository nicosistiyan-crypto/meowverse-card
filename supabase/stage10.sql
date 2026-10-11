-- Stage 10: coins. Safe to run more than once. Run in the Supabase SQL editor.
alter table users add column if not exists coins bigint not null default 0;

-- Atomic top-up used by the admin panel. Returns the new balance (null if the user does not exist).
create or replace function grant_coins(p_user uuid, p_amount bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  update users set coins = coins + p_amount where id = p_user returning coins into v;
  return v;
end $$;
revoke all on function grant_coins(uuid, bigint) from public, anon, authenticated;
