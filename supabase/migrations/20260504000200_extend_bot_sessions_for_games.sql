alter table public.bot_sessions
alter column page_id drop not null;

alter table public.bot_sessions
add column if not exists platform text,
add column if not exists notion_title text;