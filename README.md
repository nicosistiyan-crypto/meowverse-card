# Pixel Cats Card (full-stack, Supabase)

Next.js 14 + Supabase (PostgreSQL). No Prisma. Auth is custom (username + password) and runs on the server.

## Setup
1. Create a project at supabase.com.
2. SQL Editor > New query > paste `supabase/schema.sql` > Run.
3. Project Settings > API: copy the Project URL and the `service_role` (or "secret") key.
4. Copy `.env.example` to `.env.local` and fill in the 3 values.
5. `npm install` then `npm run dev` -> http://localhost:3000
6. Register with the username you set in `ADMIN_USERNAME` (password is your own choice). That account becomes SUPER_ADMIN.

## Security model
- The service role key is used only in server code (`src/lib/db.ts` imports `server-only`).
  It must never be prefixed with `NEXT_PUBLIC_` and never committed.
- Row Level Security is enabled on every table and anon/authenticated access is revoked, so the
  public anon key cannot read or write anything. All data goes through our server routes.
- Passwords: bcrypt (cost 12). Sessions: random 256-bit token in an httpOnly SameSite=Lax cookie; only its SHA-256 is stored.
- Role comes only from `ADMIN_USERNAME` on the server. No endpoint accepts a role from the client.
- Every page/route re-checks session + role on the server (middleware is only a first gate).

## Stage 2: cards, /home, /collection
1. Run `supabase/seed_cards.sql` once in the SQL Editor (inserts the 100 Season 1 cats).
2. Testing only: run `supabase/give_test_cards.sql` to give your account 12 random cards
   (until pack opening exists in stage 3).
3. Open /home and /collection.
Unowned cards are sent to the browser as silhouettes only (no name, tier or description).

## Stage 3: gacha + visiting other players
1. Run `supabase/stage3.sql` once (transactional function that saves an opening and its cards).
2. Restart `npm run dev`.
- `/pack`: open Basic (1 card) or Premium (3 cards) packs. The server draws tiers with its own crypto RNG
  using the odds stored in the `packs` table, then saves via `record_opening`. The browser only sends a pack id.
- `/players` searches players by username; `/u/<username>` is a public (logged-in only) profile with stats and cards.
- Optional `PACK_COOLDOWN_SECONDS` in `.env.local` limits how often one player can open packs.
- You can delete the test cards with the reset line in `supabase/give_test_cards.sql`.

## Stage 4 (update): Prime + Absolute tiers, fusion, avatar upload, admin odds
Run these in the Supabase SQL Editor, in this order, each one separately:
1. `supabase/stage4_a.sql`   (adds the PRIME and ABSOLUTE tiers; must be committed first)
2. `supabase/stage4_b.sql`   (settings, fusion function, harder pack odds, avatars storage bucket)
3. `supabase/seed_cards_2.sql` (Season 2: 31 new cards, numbers 101-131)
Then restart `npm run dev`. No new npm packages.

- Fusion (`/fusion`): 3 cards of the same tier (C to S+) are removed and become 1 random card. Chance to go up one tier
  is set per tier (default C 45%, B 35%, A 25%, S 15%, S+ 8%); otherwise you get a random card of the same tier.
  Prime and Absolute cannot be fused. Absolute only comes from packs.
- Avatar (`/profile`): upload PNG/JPG/WEBP up to 2 MB. File type is checked from real bytes on the server.
- Admin (`/admin`): SUPER_ADMIN can edit each pack's odds per tier (must total 100%) and the fusion upgrade chances.
- New default odds (Basic): C 66, B 26, A 5.5, S 1.8, S+ 0.5, Prime 0.17, Absolute 0.03.

## Fusion jackpot
Every fusion first rolls a jackpot: ABSOLUTE 1%, PRIME 2% (any input tier). Otherwise the normal tier-up roll applies.
Both numbers are editable in /admin ("Peluang jackpot fusi"); defaults work without any SQL.

## Stage 5: gift cards, fixes
Run `supabase/stage5.sql` once in the SQL Editor, then restart `npm run dev`.
- `/gift`: pick one of your cards, type the receiver's username, send. The card moves (it is not copied); a row is kept in `gifts`.
  The "Kirim kartu" link on another player's profile pre-fills the username.
- Avatars are now served through `/api/avatar/<id>`; the `avatars` bucket is created automatically if missing.
- Supabase reads are no longer cached by Next.js (`src/lib/db.ts`), so admin changes to odds apply immediately.

## Stage 6/7: Collector cards, messages, profile borders, faster dev
Run in the Supabase SQL Editor, **in this order** (each file as its own run):
1. `stage4_a.sql` (only if never run), then `stage6_a.sql` — new enum values must be committed alone.
2. `stage7_a.sql` (fusion + gift functions) then `stage7_b.sql` (notifications + profile borders). Both are safe to repeat. They fix "Could not find the function fuse_cards / gift_card in the schema cache".
3. `seed_cards_2.sql` (if not run yet), then `stage6_b.sql` — adds the 3 COLLECTOR scene cards and a tiny COLLECTOR pack chance.
4. Optional test: `test_borders.sql` gives one user 150 cards so the three borders unlock.

- **Collector cards**: `sprite_data.scene` = `donut_cafe | moon_walk | blossom_pair`. Scenes are drawn in code (`src/lib/scenes.ts`, 60x80 pixels, 10 fps, same orange cat as the game sprite). Add a new scene by adding a draw function there and a card row with its id.
- **Reveal animations** (`RevealFx.tsx`): S+ (rays + confetti) < PRIME (diamond rain) < ABSOLUTE (fire + falling crown) < COLLECTOR (curtains + spotlight). Longer and louder with each tier.
- **NOTIF** (`/notifikasi`, table `notifications`; separate from any existing `messages` table): gifts and unlocked borders arrive here; the green dot pops, rings and shakes the label when a new one arrives (checked every 15 s).
- **Borders**: 50 / 100 / 150 DIFFERENT cards (duplicates do not count) unlock Purple / Red / Gold. Unlock is saved forever; claim in **CLAIM**, which jumps to **Edit Profil > Border Profil** to equip.
- **Dev speed**: `npm run dev` now uses Turbopack. If it misbehaves use `npm run dev:webpack`. `npm run clean` clears `.next`.

## Stage 11: vouchers, coin packs, selling
Run `supabase/stage11.sql` once in the SQL Editor (after stage10), then restart `npm run dev`. The last line of that file lists your packs so you can check them.
- **Header wallet** (top right): `[gold voucher] [blue voucher] [coin]`, each voucher with a cat head. Hidden in the profile section like the coin.
- **SHOP** (`/shop`, the SHOP button on Home): buy blue / gold vouchers with coins (quantity 1-99). Prices are set in `/admin > Toko & harga`.
- **Packs**: a pack with a coin price is paid with coins when opened (coins and cards are saved in one transaction). Price 0 = free.
  `/admin > Toko & harga` also edits cards per pack. stage11 sets "pack 2" to 5 cards and gives the pack-2 / collector packs a starting price (200 / 2000), matched by name.
- **JUAL** (`/sell`, button left of FUSHION on the KARTU page): sell any copy. C 10, B 25, A 80, S 250, S+ 700, PRIME 3.000, ABSOLUTE 10.000, COLLECTOR 50.000 coins.
  Warns before the last copy of a card is sold; "pilih semua duplikat" keeps one of each card. Borders stay unlocked after selling.
- The "Urutkan" row on KARTU was removed; the list is always sorted by rarity.
- Vouchers pay for packs (see Stage 12).

## Stage 12: packs paid with vouchers
Run `supabase/stage12.sql` once (after stage11), then restart `npm run dev`.
- "MV Pack 2" costs 1 BLUE voucher per opening, "MV Pack Collector" costs 1 GOLD voucher (matched by name; they no longer cost coins).
- `/admin > Toko & harga`: every pack has a "Pembayaran" choice (Gratis / Voucher biru / Voucher emas / Coin) and an amount, so the cost per opening can be changed any time.
- Vouchers are bought in the SHOP with coins. The voucher is taken in the same transaction that saves the cards.

## Stage 15: ABSOLUTE costumes + blink / nod animation
Run `supabase/stage15.sql` once in the SQL Editor, then restart `npm run dev`.
- Every ABSOLUTE card gets a new anime-inspired costume (the cat's fur and eye colour stay), and a new name without "Absolute" in front:
  Akatsuki Cloud Cat, Jujutsu Sorcerer Cat, Soul Reaper Captain Cat, Straw Hat Captain Cat, Super Saiyan Warrior Cat, Scout Regiment Cat, Caped Baldy Hero Cat, Demon Slayer Corps Cat, State Alchemist Cat.
- Cards with `sprite_data.anim = true` blink and nod their head (`src/lib/sprite.ts`, `src/components/Sprite.tsx`). Other cards are unchanged.
