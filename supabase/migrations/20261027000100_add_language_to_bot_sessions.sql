alter table public.bot_sessions
alter column step drop not null;

alter table public.bot_sessions
add column if not exists language text not null default 'en'
check (language in ('en', 'uk'));

alter table public.movies
add column if not exists language text not null default 'en'
check (language in ('en', 'uk'));

alter table public.series
add column if not exists language text not null default 'en'
check (language in ('en', 'uk'));

alter table public.games
add column if not exists language text not null default 'en'
check (language in ('en', 'uk'));
