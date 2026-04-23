# Production Deployment

This guide covers the cloud deployment of the bot to Supabase Edge Functions.

## Before you start

You need:

- a Supabase project
- Supabase CLI logged in
- your Supabase project reference ID
- a Telegram bot token from BotFather
- a production `SUPA_FUNCTION_SECRET`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `TMDB_API_KEY`
- `SUPA_URL`
- `SUPA_SECRET_KEY`

Use only `A-Z`, `a-z`, `0-9`, `_`, and `-` in `SUPA_FUNCTION_SECRET`.

## Step 1. Link this repository to your Supabase project

Run:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
```

To get the `PROJECT_REF` run:

```bash
supabase projects list
```

In the output, use the value in the REFERENCE ID column.

## Step 2. Set production secrets

The deployed function reads these values at runtime, so all of them must be present in Supabase secrets.

`SUPA_URL` is the project URL, usually `https://<YOUR_PROJECT_REF>.supabase.co`.

`SUPA_SECRET_KEY` is available in Supabase project settings under API.

Run:

```bash
supabase secrets set --env-file supabase/functions/.env.production
```

## Step 3. Apply the database migration

Production session state is stored in Supabase, so the `bot_sessions` table must exist before the bot starts handling real chats.

Run:

```bash
supabase db push
```

## Step 4. Deploy the Edge Function

Run:

```bash
bun run webhook
```

The production webhook URL is:

```text
https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/telegram-bot
```

## Step 5. Register the production Telegram webhook

Run:

```bash
bun run set:webhook
```

If you later change `SUPA_FUNCTION_SECRET`, run the same command again with the new value.

## Notes

- `SESSION_STORE_DRIVER` must be `supabase` in production.
- `SUPA_SECRET_KEY` is used for persistent bot sessions and movies cache.
