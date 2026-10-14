-- Stage 16: (1) kartu yang sudah pernah didapat tetap tercatat di KOLEKSI walau dijual / difusi,
--           (2) MV Pack 3 (20 kartu per pack), (3) penanda online (bulatan hijau).
-- Jalankan sekali di Supabase SQL Editor (setelah stage15.sql), lalu restart `npm run dev`. Aman dijalankan berulang kali.

-- ---------- 1) kartu yang pernah didapat ----------
-- Saat sebuah kartu terakhir dijual / dipakai fusi, catatannya disimpan di sini, jadi di halaman KARTU tetap terhitung
-- (angka koleksi tidak berkurang) dan kartunya tidak kembali menjadi kartu "?".
create table if not exists user_discovered (
  user_id uuid not null references users(id) on delete cascade,
  card_id int not null references cards(id),
  discovered_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
alter table user_discovered enable row level security;
revoke all on user_discovered from anon, authenticated;

-- Jual: catat dulu kartu yang akan dijual, baru dihapus (sisanya sama persis seperti stage11).
create or replace function sell_cards(p_user uuid, p_rows bigint[], p_total bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare n int; v bigint;
begin
  if p_total < 0 or coalesce(array_length(p_rows, 1), 0) = 0 then raise exception 'invalid sale'; end if;
  insert into user_discovered (user_id, card_id, discovered_at)
    select p_user, card_id, min(obtained_at) from user_cards where user_id = p_user and id = any(p_rows) group by card_id
    on conflict do nothing;
  delete from user_cards where user_id = p_user and id = any(p_rows);
  get diagnostics n = row_count;
  if n <> array_length(p_rows, 1) then raise exception 'some cards are not yours'; end if;
  update users set coins = users.coins + p_total where id = p_user returning users.coins into v;
  return v;
end $$;
revoke all on function sell_cards(uuid, bigint[], bigint) from public, anon, authenticated;
grant execute on function sell_cards(uuid, bigint[], bigint) to service_role;

-- Fusi: catat dulu 3 kartu yang dipakai, baru dihapus (sisanya sama persis seperti stage7_a).
create or replace function fuse_cards(p_user uuid, p_rows bigint[], p_result int)
returns void language plpgsql security definer set search_path = public as $$
declare n int; inputs int[];
begin
  select array_agg(card_id) into inputs from user_cards where user_id = p_user and id = any(p_rows);
  insert into user_discovered (user_id, card_id, discovered_at)
    select p_user, card_id, min(obtained_at) from user_cards where user_id = p_user and id = any(p_rows) group by card_id
    on conflict do nothing;
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

-- Kartu yang SUDAH terlanjur terjual / terfusi sebelum file ini dijalankan: dipulihkan dari riwayat pack dan fusi.
-- Kartu yang pernah dihadiahkan ke pemain lain tidak ikut dipulihkan (hadiah memang mengurangi koleksi).
insert into user_discovered (user_id, card_id, discovered_at)
select x.user_id, x.card_id, min(x.at)
from (
  select p.user_id, unnest(p.card_ids) as card_id, p.created_at as at from pack_openings p
  union all select f.user_id, f.result_card_id, f.created_at from fusions f
  union all select f.user_id, unnest(f.input_card_ids), f.created_at from fusions f
) x
where exists (select 1 from cards c where c.id = x.card_id)
  and not exists (select 1 from gifts g where g.from_user = x.user_id and g.card_id = x.card_id)
group by x.user_id, x.card_id
on conflict do nothing;

-- ---------- 2) MV Pack 3: 20 kartu per pack ----------
-- Batas lama "card_count between 1 and 10" dari schema.sql dilepas supaya 20 kartu bisa.
alter table packs drop constraint if exists packs_card_count_check;
-- Peluang awalnya disalin dari MV Pack 2 (bisa diubah di /admin). Dibuat hanya jika belum ada.
insert into packs (name, card_count, odds)
select 'Mv Pack 3', 20,
       coalesce((select odds from packs where lower(name) like '%pack 2%' or lower(name) = 'premium cat pack' order by id limit 1),
                '{"C":50,"B":33,"A":11,"S":4,"S_PLUS":1.5,"PRIME":0.45,"ABSOLUTE":0.05}'::jsonb)
where not exists (select 1 from packs where lower(name) like '%pack 3%');
-- Harga awal: 4 voucher biru per pack (= 4 x harga MV Pack 2, karena isinya 4 x lebih banyak). Bisa diubah di /admin > Toko & harga.
update packs set card_count = 20 where lower(name) like '%pack 3%';
update packs set voucher_kind = 'blue', voucher_cost = 4, coin_price = 0 where lower(name) like '%pack 3%' and voucher_kind is null;

-- ---------- 3) penanda online ----------
-- Browser mengirim "ping" tiap ~45 detik selama web terbuka; pemain dianggap online jika ping terakhir < 2 menit lalu.
alter table users add column if not exists last_seen timestamptz;

notify pgrst, 'reload schema';
select id, name, card_count, voucher_kind, voucher_cost, coin_price from packs order by id;   -- cek: Mv Pack 3 = 20 kartu
