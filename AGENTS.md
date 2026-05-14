# PopcornPal — Agent Instructions

PopcornPal is a Telegram bot that randomly picks a movie or a game from Notion databases and returns rich details via TMDB (movies) and IGDB (games). It runs as a **Supabase Edge Function** (Deno runtime).

## Commands

```bash
bun run dev:webhook      # serve Edge Function locally (no JWT verification)
bun run deploy:webhook   # deploy to Supabase production
bun run set:webhook      # register the Telegram webhook URL
```

Use **Bun** for local tooling and dependency management (`bun install`, `bun run …`). The deployed runtime is **Deno**.

## Architecture

```text
src/                        # Shared logic (dual-runtime: Deno + Node/Bun)
  index.ts                  # Node/Bun entry point (not used in production)
  bot/
    handlers.ts             # All Telegram message/callback handlers
    messenger.ts            # BotMessenger interface (decouples handlers from framework)
    session-store.ts        # SessionStore interface + UserSession types
    session-store.memory.ts # In-memory implementation (default)
    session-store.supabase.ts # Supabase-persisted implementation
    create-session-store.ts # Factory: reads SESSION_STORE_DRIVER env var
  runtime/env.ts            # getEnvVar() — works in both Deno and Node/Bun
  services/
    bot.ts                  # node-telegram-bot-api setup (Node/Bun only)
    db.ts                   # Supabase client for movie/game cache
    notion.ts               # Notion API — picks random movie/game
    tmdb.ts                 # TMDB API — enriches movie details
    igdb.ts                 # IGDB API — enriches game details

supabase/functions/telegram-bot/index.ts  # Edge Function entry point (Deno + grammy)
supabase/migrations/                      # SQL migrations
```

The Edge Function imports `src/` directly via relative paths (`../../../src/…`). The `// @ts-nocheck` header and `jsr:`/`https://deno.land/x/` imports are intentional in the Edge Function — do not remove them.

## Key Conventions

- **Dual-runtime env access**: Always use `getEnvVar()` from `src/runtime/env.ts` — never access `process.env` or `Deno.env` directly.
- **BotMessenger abstraction**: Handlers in `src/bot/handlers.ts` receive a `BotMessenger` interface, not a framework object. Keep handlers framework-agnostic.
- **UI language**: All user-facing bot messages are in **Ukrainian**. Button texts like `"Знайти кіно"`, `"Знайти гру"`, `"<< назад"` are hardcoded string literals — match them exactly in handler comparisons.
- **Session steps** are typed in `SessionStore` — see `src/bot/session-store.ts` for valid `SessionStep` values before adding new flow steps.
- **DB client is always created** in `src/services/db.ts`, regardless of `SESSION_STORE_DRIVER`. `SUPA_URL` and `SUPA_SECRET_KEY` are always required at runtime.

## Environment Variables

| Variable                    | Required | Notes                                                    |
| --------------------------- | -------- | -------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`        | Always   | From BotFather                                           |
| `NOTION_API_KEY`            | Always   |                                                          |
| `NOTION_MOVIES_DATABASE_ID` | Always   |                                                          |
| `NOTION_SERIES_DATABASE_ID` | Always   |                                                          |
| `NOTION_GAMES_DATABASE_ID`  | Always   |                                                          |
| `TMDB_API_KEY`              | Always   |                                                          |
| `IGDB_CLIENT_ID`            | Always   |                                                          |
| `IGDB_CLIENT_SECRET`        | Always   |                                                          |
| `SUPA_URL`                  | Always   | Required even with `SESSION_STORE_DRIVER=memory` (db.ts) |
| `SUPA_SECRET_KEY`           | Always   | Same reason as above                                     |
| `SUPA_FUNCTION_SECRET`      | Always   | Telegram `secret_token` — only `A-Z a-z 0-9 _ -` allowed |
| `SESSION_STORE_DRIVER`      | Optional | `memory` (default) or `supabase`                         |

Local env file: `supabase/functions/.env.local` (copy from `.env.example`).

## Gotchas

- `SUPA_FUNCTION_SECRET` must only contain `A-Z`, `a-z`, `0-9`, `_`, `-`. Any other character (e.g. `#`, `!`, `%`) will break or silently invalidate Telegram webhook auth.
- Local development requires `--no-verify-jwt`. The `dev:webhook` script already includes it — do not remove it.
- After editing `supabase/functions/.env.local`, restart `bun run dev:webhook` to reload env values.
- DB migrations live in `supabase/migrations/` — run `supabase db push` to apply locally after adding a new migration file.
- Series recommendations are cached in `public.series` (separate from `public.movies`).

## Docs

- [Local setup guide](README.md)
- [Production deployment guide](docs/PRODUCTION.md)

## Always-Active Skills

- **Caveman Mode**: The "caveman" skill is always active unless explicitly deactivated. This ensures ultra-terse, token-efficient communication for all responses. To deactivate, use "stop caveman" or "normal mode."
