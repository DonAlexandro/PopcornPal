# PopcornPal

PopcornPal is a Telegram bot that randomly picks a movie from my Notion database and fetches its details (poster, description, rating, etc.) using the TMDB API. It presents the movie directly in my Telegram chat for an easy movie night decision!

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
   - `NOTION_DATABASE_ID`
   - `TMDB_API_KEY`
   - `SUPA_URL`

   Notes:
   - Keep `SESSION_STORE_DRIVER=memory` for the simplest local setup.
   - `SUPA_SECRET_KEY` is only needed if you switch to `SESSION_STORE_DRIVER=supabase`.
   - `SUPA_FUNCTION_SECRET` must only use `A-Z`, `a-z`, `0-9`, `_`, and `-` because Telegram rejects other characters in `secret_token`.

4. **Start the local Supabase runtime**:

   ```bash
   supabase start
   ```

5. **Serve the Telegram Edge Function locally**:

   ```bash
   bun run webhook
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
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<YOUR_TUNNEL_URL>/functions/v1/telegram-bot&secret=<SUPA_FUNCTION_SECRET>
   ```

   If you previously registered the webhook with an older secret, run the same `setWebhook` call again after restarting the local function runtime.

8. **Open the bot in Telegram and test it**:
   - send `/start`
   - press `Знайти кіно`
   - check that the bot returns movie options
