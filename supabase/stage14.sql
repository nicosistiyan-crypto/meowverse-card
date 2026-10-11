-- Stage 14: adds 1 new ABSOLUTE card and gives the 3 COLLECTOR cards + the new ABSOLUTE card to the account "sistiyan".
-- Run after stage13.sql / stage13b.sql (the 3 COLLECTOR cards must already exist). Safe to run more than once:
-- the card is created only if missing, and the account only receives a card it does not own yet.

-- 1) new ABSOLUTE card (free concept: a cosmic king crowned among the stars)
insert into seasons (name) values ('Season 2') on conflict (name) do nothing;
insert into cards (season_id, collection_number, name, tier, description, sprite_data)
select (select id from seasons where name = 'Season 2'), (select coalesce(max(collection_number), 0) + 1 from cards),
       'Absolute Galaxy King Cat', 'ABSOLUTE', 'Crowned among the stars, the whole galaxy bows to him.',
       '{"pal":{"a":"#5b3fc4","b":"#2f1b7a","c":"#ffd23f","d":"#00e5ff","y":"#ffffff"},"ov":[[5,2,"c.cc.c"],[5,3,"cccccc"],[7,4,"dd"],[4,5,"d"],[4,6,"d"],[11,5,"d"],[11,6,"d"],[3,10,"dddddddddd"],[4,11,"y"],[11,11,"y"],[6,12,"y"],[9,13,"y"],[0,3,"y"],[15,2,"y"],[0,7,"d"],[15,8,"y"],[0,12,"d"],[15,12,"d"],[2,14,"d"],[13,14,"d"]]}'::jsonb
where not exists (select 1 from cards where name = 'Absolute Galaxy King Cat');

-- 2) give one copy of each of the 4 cards to sistiyan (skipped for any card the account already owns)
insert into user_cards (user_id, card_id)
select u.id, c.id
from users u
join cards c on c.name in ('Villain Cat', 'Superhero Cat', 'Sleepy Time Cat', 'Absolute Galaxy King Cat')
where u.username = 'sistiyan'
  and not exists (select 1 from user_cards x where x.user_id = u.id and x.card_id = c.id);

-- 3) profile borders are counted by different cards owned, so refresh them
select sync_borders(id) from users where username = 'sistiyan';

-- check: should list the 4 cards for sistiyan
select c.collection_number, c.name, c.tier, count(*) as copies
from user_cards uc join users u on u.id = uc.user_id join cards c on c.id = uc.card_id
where u.username = 'sistiyan' and c.name in ('Villain Cat', 'Superhero Cat', 'Sleepy Time Cat', 'Absolute Galaxy King Cat')
group by c.collection_number, c.name, c.tier order by c.collection_number;
