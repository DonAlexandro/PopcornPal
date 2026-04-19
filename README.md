# PopcornPal

PopcornPal is a Telegram bot that randomly picks a movie from my Notion database and fetches its details (poster, description, rating, etc.) using the TMDB API. It presents the movie directly in my Telegram chat for an easy movie night decision!

## Setup Guide

To run this bot locally, follow these steps:

1. **Clone the repository** (if you haven't already).
2. **Install dependencies** using Bun:
   ```bash
   bun install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and fill in your actual tokens and IDs.
   * `TELEGRAM_BOT_TOKEN`
   * `NOTION_API_KEY`
   * `NOTION_DATABASE_ID`
   * `TMDB_API_KEY`

4. **Run the bot**:
   ```bash
   bun run start
   ```
