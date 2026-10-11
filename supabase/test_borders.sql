-- TEST ONLY: gives one player every enabled card once (change the username first), then unlocks borders.
-- Borders count DIFFERENT cards, so Gold (150) only unlocks once the game has at least 150 cards.
insert into user_cards (user_id, card_id)
select u.id, c.id from users u cross join cards c
where u.username = 'snpcats' and c.enabled
  and not exists (select 1 from user_cards x where x.user_id = u.id and x.card_id = c.id);
select sync_borders(id) from users where username = 'snpcats';
