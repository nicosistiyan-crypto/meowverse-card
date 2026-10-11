-- Stage 6, step 2. Run after stage6_a.sql. Adds 3 animated COLLECTOR scene cards (safe to re-run).
insert into seasons (name) values ('Season 3') on conflict (name) do nothing;
insert into cards (season_id, collection_number, name, tier, description, sprite_data) values
((select id from seasons where name='Season 3'), 201, 'Donut Feast Cat', 'COLLECTOR', 'One donut is never enough. The whole cafe is his plate.', '{"pal":{},"ov":[],"scene":"donut_cafe"}'::jsonb),
((select id from seasons where name='Season 3'), 202, 'Moon Walker Cat', 'COLLECTOR', 'Small steps, big hops, Earth waving from far away.', '{"pal":{},"ov":[],"scene":"moon_walk"}'::jsonb),
((select id from seasons where name='Season 3'), 203, 'Blossom Duo Cat', 'COLLECTOR', 'Two best friends in a sea of pink flowers.', '{"pal":{},"ov":[],"scene":"blossom_pair"}'::jsonb)
on conflict do nothing;

-- Pack odds: a tiny COLLECTOR chance, taken from the C share so the total stays 100 (admin can change it later in /admin).
update packs set odds = jsonb_set(odds || '{"COLLECTOR":0.1}'::jsonb, '{C}', to_jsonb(round(((odds->>'C')::numeric - 0.1), 3))) where name = 'Basic Cat Pack' and not (odds ? 'COLLECTOR');
update packs set odds = jsonb_set(odds || '{"COLLECTOR":0.2}'::jsonb, '{C}', to_jsonb(round(((odds->>'C')::numeric - 0.2), 3))) where name = 'Premium Cat Pack' and not (odds ? 'COLLECTOR');
