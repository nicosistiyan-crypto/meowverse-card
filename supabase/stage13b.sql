-- Stage 13b: adds ONLY the missing Sleepy Cat COLLECTOR card (Villain Cat and Superhero Cat already exist). Safe to run more than once.
-- NOTE: a normal C card named "Sleepy Cat" already exists and card names must be unique, so the COLLECTOR one is named "Sleepy Time Cat".
-- Skipped when a card that uses the sleepy_cat scene already exists.
insert into cards (season_id, collection_number, name, tier, description, sprite_data)
select (select id from seasons where name = 'Season 3'), (select coalesce(max(collection_number), 0) + 1 from cards),
       'Sleepy Time Cat', 'COLLECTOR', 'Morning, noon, evening or night: the blanket stays on and the dreams keep coming.', '{"pal":{},"ov":[],"scene":"sleepy_cat"}'::jsonb
where not exists (select 1 from cards where sprite_data->>'scene' = 'sleepy_cat');

-- If you already ran the earlier version, this renames that card ("Sleepy Cat Collector") to the new name.
update cards set name = 'Sleepy Time Cat' where name = 'Sleepy Cat Collector' and sprite_data->>'scene' = 'sleepy_cat' and not exists (select 1 from cards where name = 'Sleepy Time Cat');

select collection_number, name, tier from cards where sprite_data->>'scene' = 'sleepy_cat';
