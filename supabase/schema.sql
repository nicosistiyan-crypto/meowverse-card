-- Run this whole file once in Supabase: SQL Editor > New query > Run.
create type role as enum ('USER', 'ADMIN', 'SUPER_ADMIN');
create type tier as enum ('C', 'B', 'A', 'S', 'S_PLUS');

create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  password_hash text not null,
  role role not null default 'USER',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  user_id uuid primary key references users(id) on delete cascade,
  avatar_url text,
  bio text,
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on sessions (user_id);

-- Season 2, 3... = insert a new season row + new cards. No code change needed.
create table seasons (
  id serial primary key,
  name text unique not null,
  active boolean not null default true
);

create table cards (
  id serial primary key,
  season_id int not null references seasons(id),
  collection_number int not null,
  name text unique not null,
  tier tier not null,
  description text not null,
  sprite_data jsonb not null,
  enabled boolean not null default true,
  unique (season_id, collection_number)
);

create table user_cards (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  card_id int not null references cards(id),
  obtained_at timestamptz not null default now()
);
create index on user_cards (user_id, card_id);

create table packs (
  id serial primary key,
  name text unique not null,
  card_count int not null default 1 check (card_count between 1 and 10),
  odds jsonb not null, -- {"C":60,"B":25,"A":10,"S":4,"S_PLUS":1}
  enabled boolean not null default true
);

create table pack_openings (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  pack_id int not null references packs(id),
  card_ids int[] not null,
  created_at timestamptz not null default now()
);
create index on pack_openings (user_id);

create table showcases (
  user_id uuid not null references users(id) on delete cascade,
  position int not null check (position between 0 and 5),
  card_id int not null references cards(id),
  primary key (user_id, position)
);

-- Security: the browser (anon / authenticated keys) can never touch these tables.
-- Only the server, using the service role key, reads and writes data.
alter table users enable row level security;
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table seasons enable row level security;
alter table cards enable row level security;
alter table user_cards enable row level security;
alter table packs enable row level security;
alter table pack_openings enable row level security;
alter table showcases enable row level security;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

insert into seasons (name) values ('Season 1');
insert into packs (name, card_count, odds) values
  ('Basic Cat Pack', 1, '{"C":60,"B":25,"A":10,"S":4,"S_PLUS":1}'),
  ('Premium Cat Pack', 3, '{"C":35,"B":30,"A":20,"S":10,"S_PLUS":5}');
