create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id int8 not null,
  title text not null,
  notion_title text not null,
  description text,
  rating numeric,
  genres text,
  image text,
  country text,
  created_at timestamptz not null default now()
);