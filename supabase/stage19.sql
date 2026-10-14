-- Stage 19: satukan hitungan "total koleksi kartu" untuk hadiah border (UNGU 50 / MERAH 100 / EMAS 150) dan mahkota.
-- Aturan SAMA dengan menu KARTU & PROFIL: kartu aktif yang dimiliki sekarang ATAU pernah didapat (user_discovered), duplikat dihitung sekali.
-- Dulu border hanya menghitung kartu yang masih dipegang, jadi angkanya turun saat menjual / fusi dan tidak sama dengan menu KARTU.
-- Jalankan sekali di Supabase SQL Editor (setelah stage18.sql), lalu restart `npm run dev`. Aman dijalankan berulang kali.

create or replace function collection_count(p_user uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  begin
    select count(*) into n from cards c
    where c.enabled and (
      exists (select 1 from user_cards u where u.user_id = p_user and u.card_id = c.id)
      or exists (select 1 from user_discovered d where d.user_id = p_user and d.card_id = c.id));
  exception when others then   -- user_discovered (stage16) belum ada: hitung kartu yang dimiliki saja
    select count(*) into n from cards c
    where c.enabled and exists (select 1 from user_cards u where u.user_id = p_user and u.card_id = c.id);
  end;
  return coalesce(n, 0);
end $$;
revoke all on function collection_count(uuid) from public, anon, authenticated;
grant execute on function collection_count(uuid) to service_role;

create or replace function sync_borders(p_user uuid)
returns setof text language plpgsql security definer set search_path = public as $$
declare n int; r record;
begin
  n := collection_count(p_user);
  for r in select v.b as b, v.need as need from (values ('PURPLE', 50), ('RED', 100), ('GOLD', 150)) as v(b, need) loop
    if n >= r.need then
      insert into user_borders (user_id, border) values (p_user, r.b) on conflict do nothing;
      if found then return next r.b; end if;
    end if;
  end loop;
  return;
end $$;
revoke all on function sync_borders(uuid) from public, anon, authenticated;
grant execute on function sync_borders(uuid) to service_role;

-- Mahkota (hadiah 150 kartu) memakai hitungan yang sama: ganti blok CROWN di sync_rewards.
create or replace function sync_rewards(p_user uuid)
returns setof text language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into user_rewards (user_id, reward) values (p_user, 'LOGIN') on conflict do nothing;
    if found then return next 'LOGIN'; end if;
  exception when others then null; end;

  begin
    if exists (select 1 from cards c join user_cards u on u.card_id = c.id
               where u.user_id = p_user and c.name = 'Sleepy Cat' and c.tier::text = 'C') then
      insert into user_rewards (user_id, reward) values (p_user, 'SLEEPY') on conflict do nothing;
      if found then return next 'SLEEPY'; end if;
    end if;
  exception when others then null; end;
  begin
    if exists (select 1 from cards c join user_discovered d on d.card_id = c.id
               where d.user_id = p_user and c.name = 'Sleepy Cat' and c.tier::text = 'C') then
      insert into user_rewards (user_id, reward) values (p_user, 'SLEEPY') on conflict do nothing;
      if found then return next 'SLEEPY'; end if;
    end if;
  exception when others then null; end;

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

  begin
    if collection_count(p_user) >= 150 then
      insert into user_rewards (user_id, reward) values (p_user, 'CROWN') on conflict do nothing;
      if found then return next 'CROWN'; end if;
    end if;
  exception when others then null; end;
  return;
end $$;
revoke all on function sync_rewards(uuid) from public, anon, authenticated;
grant execute on function sync_rewards(uuid) to service_role;

-- pemain yang sekarang memenuhi syarat langsung mendapat border / mahkotanya
select sync_borders(id) from users;
select sync_rewards(id) from users;

notify pgrst, 'reload schema';
select border, count(*) as pemain from user_borders group by border order by border;
