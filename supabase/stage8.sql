-- Stage 8. Safe to run more than once.
-- (1) Player-to-player chat (the CHAT menu).  (2) Animated scenes for the "Crazy Rich Cat" and "Surf Cat" COLLECTOR cards.

-- (1) a message from another player is a notifications row with kind = 'dm' and from_user = the sender
alter table notifications add column if not exists from_user uuid references users(id) on delete set null;
create index if not exists notifications_from_idx on notifications (from_user, created_at desc) where from_user is not null;

-- (2) the two COLLECTOR cards that were still empty: point them to their new animated scenes (name, tier and text are NOT touched)
update cards set sprite_data = '{"pal":{},"ov":[],"scene":"crazy_rich"}'::jsonb where name ilike 'crazy rich%';
update cards set sprite_data = '{"pal":{},"ov":[],"scene":"surf_cat"}'::jsonb where name ilike 'surf cat%';

-- If your database does not have those two cards yet, they are created here (skipped when they already exist).
insert into cards (season_id, collection_number, name, tier, description, sprite_data)
select (select id from seasons where name = 'Season 3'), (select coalesce(max(collection_number), 0) + 1 from cards),
       'Crazy Rich Cat', 'COLLECTOR', 'Sunset on the super-yacht. Money is just confetti.', '{"pal":{},"ov":[],"scene":"crazy_rich"}'::jsonb
where not exists (select 1 from cards where name ilike 'crazy rich%') and exists (select 1 from seasons where name = 'Season 3');
insert into cards (season_id, collection_number, name, tier, description, sprite_data)
select (select id from seasons where name = 'Season 3'), (select coalesce(max(collection_number), 0) + 1 from cards),
       'Surf Cat', 'COLLECTOR', 'Who needs waves? A snow dune and the northern lights will do.', '{"pal":{},"ov":[],"scene":"surf_cat"}'::jsonb
where not exists (select 1 from cards where name ilike 'surf cat%') and exists (select 1 from seasons where name = 'Season 3');
