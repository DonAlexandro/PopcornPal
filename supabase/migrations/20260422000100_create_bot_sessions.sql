create table if not exists public.bot_sessions (
  chat_id bigint primary key,
  step text not null,
  page_id text not null,
  options jsonb,
  genres text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_bot_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bot_sessions_set_updated_at on public.bot_sessions;

create trigger bot_sessions_set_updated_at
before update on public.bot_sessions
for each row
execute function public.set_bot_sessions_updated_at();