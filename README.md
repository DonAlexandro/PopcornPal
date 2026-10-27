# PopcornPal

PopcornPal is a Telegram bot that randomly picks a movie or a game from my Notion databases and fetches rich details for Telegram. Movies are enriched with TMDB, while games are enriched with IGDB.

## Supabase Edge Functions

For the new webhook-based Supabase setup and implementation plan, see `docs/supabase-edge-functions-setup.md`.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Docker](https://www.docker.com/)
- [ngrok](https://ngrok.com/)

## Setup Guide

To run this bot locally, use the Supabase Edge Function webhook flow.

1. **Install project dependencies** using Bun:

   ```bash
   bun install
   ```

2. **Create the local function env file**:

   ```bash
   cp .env.example supabase/functions/.env.local
   ```

3. **Fill in `supabase/functions/.env.local`**.

   Required values:
   - `TELEGRAM_BOT_TOKEN`
   - `SUPA_FUNCTION_SECRET`
   - `NOTION_API_KEY`
   - `NOTION_MOVIES_DATABASE_ID`
   - `NOTION_SERIES_DATABASE_ID`
   - `NOTION_GAMES_DATABASE_ID`
   - `TMDB_API_KEY`
   - `IGDB_CLIENT_ID`
   - `IGDB_CLIENT_SECRET`
   - `SUPA_URL`
   - `SUPA_SECRET_KEY`

   Notes:
   - Bot sessions and caches always use Supabase, locally and in production.
   - `SUPA_FUNCTION_SECRET` must only use `A-Z`, `a-z`, `0-9`, `_`, and `-` because Telegram rejects other characters in `secret_token`.

   The bot supports English and Ukrainian. Use **Settings** in a private chat to change the chat language; run `supabase db push` to apply the session-language and locale-aware cache migrations.

4. **Start the local Supabase runtime**:

   ```bash
   supabase start
   ```

5. **Serve the Telegram Edge Function locally**:

   ```bash
   bun run dev:webhook
   ```

   The bot webhook will be available at `http://localhost:54321/functions/v1/telegram-bot`.

   If you change `supabase/functions/.env.local`, stop and start the serve command again so the function runtime reloads the new values.

6. **Expose the local webhook with a tunnel**:

   Example with ngrok:

   ```bash
   ngrok http 54321
   ```

7. **Register the Telegram webhook**:

   Register the webhook and pass the secret via Telegram's `secret_token` support.

   Replace the placeholders and open this URL:

   ```text
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<YOUR_TUNNEL_URL>/functions/v1/telegram-bot&secret_token=<SUPA_FUNCTION_SECRET>
   ```

   If you previously registered the webhook with an older secret, run the same `setWebhook` call again after restarting the local function runtime.

8. **Open the bot in Telegram and test it**:
   - send `/start`
   - press `Знайти кіно`
   - check that the bot returns movie options
