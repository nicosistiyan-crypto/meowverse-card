-- Stage 15: ABSOLUTE tier gets new anime-inspired costumes, new names (no "Absolute" in front) and a blinking / head-nodding animation.
-- Run once in the Supabase SQL editor, then restart `npm run dev`. Safe to run more than once (a second run changes nothing).
--
-- What changes, for every card whose tier is ABSOLUTE:
--   * the costume (sprite overlays) is replaced; the cat itself stays: its fur colours (a / b) and eye colour (e) are kept,
--   * the name loses "Absolute" and points at a well-known anime outfit (easy to look up),
--   * sprite_data gets "anim": true, which makes the card blink and nod (drawn in src/lib/sprite.ts + src/components/Sprite.tsx).
-- The 5 cards known from the SQL files are matched by their old name; any other ABSOLUTE card (e.g. "Solar Crown Cat") takes the next free costume,
-- in collection-number order. Costumes beyond the number of ABSOLUTE cards you have simply stay unused.

with d(n, old_pat, new_name, descr, extra, ov) as (
values
  (1, 'Absolute Shinobi King Cat', 'Akatsuki Cloud Cat', 'A black cloak with red clouds and a slashed headband. The mission is never over.', '{"k":"#15101f","r":"#e53935","w":"#ffffff","n":"#1d2b53","m":"#cfd8dc","x":"#7f0000"}'::jsonb, '[[2,4,"nnnnnnnnnnnn"],[6,4,"mmmm"],[7,4,"k"],[8,4,"k"],[3,9,"kkkkkkkkkk"],[3,10,"kkkkkkkkkk"],[2,11,"kkkkkkkkkkkk"],[2,12,"kkkkkkkkkkkk"],[2,13,"kkkkkkkkkkkk"],[5,14,"kkkkkk"],[6,9,"xx"],[4,10,"www"],[3,11,"wrrrw"],[4,12,"www"],[9,12,"www"],[8,13,"wrrrw"],[8,14,"www"],[2,14,"kk"],[12,14,"kk"]]'::jsonb),
  (2, 'Absolute Curse King Cat', 'Jujutsu Sorcerer Cat', 'A high-collar uniform and a cursed aura. He does not lose.', '{"u":"#1b2845","v":"#7c4dff","g":"#ffd23f","k":"#0d0d1a","q":"#b388ff","i":"#3a4a7a"}'::jsonb, '[[3,9,"uuuuuuuuuu"],[3,10,"uuuuuuuuuu"],[2,11,"uuuuuuuuuuuu"],[2,12,"uuuuuuuuuuuu"],[2,13,"uuuuuuuuuuuu"],[5,14,"uuuuuu"],[7,10,"ii"],[7,11,"g"],[7,12,"g"],[8,13,"g"],[3,9,"i"],[12,9,"i"],[3,7,"k"],[12,7,"k"],[5,3,"k"],[0,10,"v"],[0,11,"q"],[0,12,"v"],[0,13,"q"],[15,10,"q"],[15,11,"v"],[15,12,"q"],[15,13,"v"],[1,5,"v"],[14,6,"v"],[0,3,"q"],[15,2,"q"],[2,14,"uu"],[12,14,"uu"]]'::jsonb),
  (3, 'Absolute Soul King Cat', 'Soul Reaper Captain Cat', 'A captain-rank haori over black robes. The blade answers only to him.', '{"k":"#15151f","h":"#f4f6fa","c":"#00bfa5","u":"#3b3b55","g":"#ffd23f","m":"#cfd8dc","r":"#b71c1c"}'::jsonb, '[[3,9,"kkkkkkkkkk"],[3,10,"kkkkkkkkkk"],[2,11,"kkkkkkkkkkkk"],[2,12,"kkkkkkkkkkkk"],[2,13,"kkkkkkkkkkkk"],[5,14,"kkkkkk"],[6,9,"hh"],[6,10,"hh"],[7,11,"h"],[2,12,"uuuuuuuuuuuu"],[7,13,"u"],[2,10,"chh"],[2,11,"chh"],[2,12,"cuu"],[2,13,"chh"],[11,10,"hhc"],[11,11,"hhc"],[11,12,"uuc"],[11,13,"hhc"],[14,9,"g"],[14,10,"k"],[14,11,"r"],[13,12,"gg"],[15,12,"m"],[15,13,"m"],[2,14,"hh"],[12,14,"hh"]]'::jsonb),
  (4, 'Absolute Pirate King Cat', 'Straw Hat Captain Cat', 'A straw hat, a red vest and a dream bigger than the sea.', '{"h":"#f4c95d","j":"#b8862b","r":"#e53935","z":"#1e63d6","g":"#ffd23f","k":"#1a1a1a","x":"#7f1d1d"}'::jsonb, '[[5,1,"hhhhhh"],[4,2,"rrrrrrrr"],[1,3,"hhhhhhhhhhhhhh"],[1,3,"j"],[14,3,"j"],[4,7,"k"],[3,9,"rrrrrrrrrr"],[3,10,"rrr"],[10,10,"rrr"],[2,11,"rrrr"],[10,11,"rrrr"],[2,12,"rrrr"],[10,12,"rrrr"],[2,13,"zzzzzzzzzzzz"],[7,11,"x"],[8,12,"x"],[8,11,"x"],[7,12,"x"],[2,12,"gggggggggggg"],[5,14,"zzzzzz"],[2,14,"jj"],[12,14,"jj"]]'::jsonb),
  (5, 'Absolute Galaxy King Cat', 'Super Saiyan Warrior Cat', 'Golden hair, golden aura, and a power that will not stop rising.', '{"g":"#ffe135","h":"#f4f6fa","n":"#1565c0","q":"#fff59d","j":"#c79100","t":"#0d3a6b"}'::jsonb, '[[4,0,"g"],[6,0,"g"],[9,0,"g"],[11,0,"g"],[4,1,"gggggggg"],[5,2,"gggggg"],[4,3,"gggggggg"],[3,4,"g"],[12,4,"g"],[0,3,"q"],[0,5,"q"],[0,7,"q"],[15,2,"q"],[15,4,"q"],[15,6,"q"],[3,9,"nnnnnnnnnn"],[3,10,"nnnnnnnnnn"],[2,11,"nnnnnnnnnnnn"],[2,12,"nnnnnnnnnnnn"],[2,13,"nnnnnnnnnnnn"],[5,14,"nnnnnn"],[4,10,"hhhhhhhh"],[4,11,"hhhhhhhh"],[4,12,"hhhhhhhh"],[2,10,"gg"],[12,10,"gg"],[3,13,"gggggggg"],[0,10,"q"],[0,12,"q"],[15,11,"q"],[15,13,"q"],[2,14,"gg"],[12,14,"gg"]]'::jsonb),
  (6, 'Solar Crown%', 'Scout Regiment Cat', 'The green cloak and the wings of freedom. Dedicate your heart.', '{"v":"#3f7a3a","d":"#2c5a28","w":"#ffffff","z":"#2f5fb3","u":"#6d4c41","g":"#cfd8dc"}'::jsonb, '[[3,9,"vvvvvvvvvv"],[2,10,"dvvvvvvvvvvd"],[2,11,"vvvvvvvvvvvv"],[2,12,"vvvvvvvvvvvv"],[2,13,"dvvvvvvvvvvd"],[5,14,"vvvvvv"],[5,11,"zw..wz"],[5,12,".zwwz."],[6,13,"zz"],[4,10,"u"],[5,11,"u"],[11,10,"u"],[10,11,"u"],[3,12,"u"],[12,12,"u"],[0,9,"d"],[0,10,"v"],[15,9,"d"],[15,10,"v"],[7,9,"g"],[8,9,"g"],[2,14,"uu"],[12,14,"uu"]]'::jsonb),
  (7, '', 'Caped Baldy Hero Cat', 'Yellow suit, white cape, red gloves. One punch is enough.', '{"f":"#ffd600","h":"#f4f6fa","r":"#d32f2f","k":"#2a1b33","s":"#cfd8dc"}'::jsonb, '[[3,9,"hhhhhhhhhh"],[6,9,"rr"],[3,10,"ffffffffff"],[2,11,"ffffffffffff"],[2,12,"ffffffffffff"],[2,13,"ffffffffffff"],[5,14,"ffffff"],[2,12,"kkkkkkkkkkkk"],[7,12,"rr"],[0,9,"h"],[0,10,"h"],[0,11,"h"],[0,12,"h"],[0,13,"s"],[15,9,"h"],[15,10,"h"],[15,11,"h"],[15,12,"h"],[15,13,"s"],[1,10,"h"],[14,10,"h"],[1,13,"r"],[14,13,"r"],[2,14,"rr"],[12,14,"rr"]]'::jsonb),
  (8, '', 'Demon Slayer Corps Cat', 'A checkered haori and water that flows like a blade.', '{"v":"#2e8b57","k":"#101018","r":"#e53935","w":"#ffffff","q":"#4fc3f7","m":"#cfd8dc","u":"#1a1a2e"}'::jsonb, '[[2,10,"vvkkvvkkvvkk"],[2,11,"vvkkvvkkvvkk"],[2,12,"kkvvkkvvkkvv"],[2,13,"kkvvkkvvkkvv"],[3,9,"kkkkkkkkkk"],[5,14,"kkkkkk"],[6,10,"uu"],[5,3,"r"],[6,4,"r"],[0,10,"q"],[0,11,"w"],[0,12,"q"],[0,13,"q"],[15,10,"q"],[15,11,"q"],[15,12,"w"],[15,13,"q"],[1,6,"q"],[14,7,"q"],[14,9,"m"],[14,10,"u"],[2,14,"kk"],[12,14,"kk"]]'::jsonb),
  (9, '', 'State Alchemist Cat', 'A red coat, a clap of the hands, and the world rearranges itself.', '{"r":"#c62828","k":"#15151f","h":"#f4f6fa","g":"#ffd23f","q":"#4fc3f7","x":"#7f1d1d"}'::jsonb, '[[3,9,"rrrrrrrrrr"],[2,10,"rrrrkkrrrr"],[2,11,"rrrrkkkkrrrr"],[2,12,"rrrrkkkkrrrr"],[2,13,"rrrrkkkkrrrr"],[2,14,"rrrrkkkkrrrr"],[5,10,"xx"],[10,10,"xx"],[7,14,"kk"],[1,12,"h"],[14,12,"h"],[1,13,"h"],[14,13,"h"],[9,11,"g"],[10,12,"g"],[0,3,"q"],[15,4,"q"],[0,6,"q"],[15,7,"q"],[1,7,"q"],[14,1,"q"]]'::jsonb)
),
abs as (select id, name, collection_number from cards where tier = 'ABSOLUTE'),
matched as (
  select distinct on (a.id) a.id, d.n from abs a join d on d.old_pat <> '' and a.name ilike d.old_pat order by a.id, d.n
),
rest as (
  select a.id, row_number() over (order by a.collection_number) as rn from abs a
  where a.id not in (select id from matched) and a.name not in (select new_name from d)
),
free as (
  select d.n, row_number() over (order by d.n) as rn from d
  where d.n not in (select n from matched) and d.new_name not in (select name from cards)
),
assign as (
  select id, n from matched
  union all
  select r.id, f.n from rest r join free f on f.rn = r.rn
)
update cards c
   set name = d.new_name,
       description = d.descr,
       sprite_data = jsonb_build_object('pal', coalesce(c.sprite_data->'pal', '{}'::jsonb) || d.extra, 'ov', d.ov, 'anim', true)
  from assign s join d on d.n = s.n
 where c.id = s.id;

-- check: every ABSOLUTE card with its new name
select collection_number, name, tier, sprite_data->>'anim' as anim from cards where tier = 'ABSOLUTE' order by collection_number;
