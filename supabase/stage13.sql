-- Stage 13: 3 new animated COLLECTOR scene cards. Safe to run more than once (a card is skipped if its name already exists).
-- Run this whole file once in the Supabase SQL editor, then restart `npm run dev`. The scenes themselves are drawn in src/lib/scenes.ts.
-- The cards join the COLLECTOR pool automatically, so packs that already have a COLLECTOR chance can drop them.
insert into seasons (name) values ('Season 3') on conflict (name) do nothing;

insert into cards (season_id, collection_number, name, tier, description, sprite_data)
select (select id from seasons where name = 'Season 3'), (select coalesce(max(collection_number), 0) + 1 from cards),
       'Villain Cat', 'COLLECTOR', 'Floating before a hungry black hole, he rules the dark side of the galaxy.', '{"pal":{},"ov":[],"scene":"villain_cat"}'::jsonb
where not exists (select 1 from cards where name = 'Villain Cat');

insert into cards (season_id, collection_number, name, tier, description, sprite_data)
select (select id from seasons where name = 'Season 3'), (select coalesce(max(collection_number), 0) + 1 from cards),
       'Superhero Cat', 'COLLECTOR', 'Cape out, fist up, guarding planet Earth from the stars above.', '{"pal":{},"ov":[],"scene":"hero_cat"}'::jsonb
where not exists (select 1 from cards where name = 'Superhero Cat');

-- NOTE: a normal C card named "Sleepy Cat" already exists and card names must be unique, so the COLLECTOR one is named "Sleepy Time Cat".
-- Skipped when a card that uses the sleepy_cat scene already exists.
insert into cards (season_id, collection_number, name, tier, description, sprite_data)
select (select id from seasons where name = 'Season 3'), (select coalesce(max(collection_number), 0) + 1 from cards),
       'Sleepy Time Cat', 'COLLECTOR', 'Morning, noon, evening or night: the blanket stays on and the dreams keep coming.', '{"pal":{},"ov":[],"scene":"sleepy_cat"}'::jsonb
where not exists (select 1 from cards where sprite_data->>'scene' = 'sleepy_cat');

-- If you already ran the earlier version, this renames that card ("Sleepy Cat Collector") to the new name.
update cards set name = 'Sleepy Time Cat' where name = 'Sleepy Cat Collector' and sprite_data->>'scene' = 'sleepy_cat' and not exists (select 1 from cards where name = 'Sleepy Time Cat');

select collection_number, name, tier from cards where name in ('Villain Cat', 'Superhero Cat', 'Sleepy Time Cat') order by collection_number;
