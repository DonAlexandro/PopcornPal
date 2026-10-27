import { SupabaseSessionStore } from "./bot/session-store.supabase";
import { getEnvVar } from "./runtime/env";
import { setupBot } from "./services/bot";

const requiredEnvVars = [
  "TELEGRAM_BOT_TOKEN",
  "NOTION_API_KEY",
  "NOTION_MOVIES_DATABASE_ID",
  "NOTION_SERIES_DATABASE_ID",
  "NOTION_GAMES_DATABASE_ID",
  "TMDB_API_KEY",
  "SUPA_URL",
  "SUPA_SECRET_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!getEnvVar(envVar)) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log("Starting PopcornPal bot...");
const sessionStore = new SupabaseSessionStore(
  getEnvVar("SUPA_URL")!,
  getEnvVar("SUPA_SECRET_KEY")!,
);
setupBot(getEnvVar("TELEGRAM_BOT_TOKEN")!, sessionStore);
console.log("Bot is running.");
