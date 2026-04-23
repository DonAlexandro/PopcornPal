import { createSessionStore } from "./bot/create-session-store";
import { getEnvVar } from "./runtime/env";
import { setupBot } from "./services/bot";

const requiredEnvVars = [
  "TELEGRAM_BOT_TOKEN",
  "NOTION_API_KEY",
  "NOTION_DATABASE_ID",
  "TMDB_API_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!getEnvVar(envVar)) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log("Starting PopcornPal bot...");
const sessionStore = createSessionStore();
setupBot(getEnvVar("TELEGRAM_BOT_TOKEN")!, sessionStore);
console.log("Bot is running.");
