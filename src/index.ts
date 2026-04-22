import { setupBot } from "./services/bot";

const requiredEnvVars = [
  "TELEGRAM_BOT_TOKEN",
  "NOTION_API_KEY",
  "NOTION_DATABASE_ID",
  "TMDB_API_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log("Starting PopcornPal bot...");
setupBot(process.env.TELEGRAM_BOT_TOKEN!);
console.log("Bot is running.");
