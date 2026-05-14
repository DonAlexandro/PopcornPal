create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  igdb_id int8 not null,
  title text not null,
  notion_title text not null,
  description text,
  rating numeric,
  genres text[],
  image text,
  platform varchar(255),
  url text,
  created_at timestamptz not null default now()
);