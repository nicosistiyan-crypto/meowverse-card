-- TESTING ONLY (until pack opening exists in stage 3): gives one account 12 random cards.
-- Change 'snpcats' to your username. Run again to add more.
insert into user_cards (user_id, card_id)
select (select id from users where username = 'snpcats'), id
from cards order by random() limit 12;
-- To reset your collection:  delete from user_cards where user_id = (select id from users where username = 'snpcats');
