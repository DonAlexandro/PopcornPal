// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  Bot,
  webhookCallback,
} from "https://deno.land/x/grammy@v1.38.3/mod.ts";

import { SupabaseSessionStore } from "../../../src/bot/session-store.supabase.ts";
import { getEnvVar } from "../../../src/runtime/env.ts";
import {
  handleCallbackQuery,
  handleStartCommand,
  handleTextMessage,
} from "../../../src/bot/handlers.ts";

const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const webhookSecret = Deno.env.get("SUPA_FUNCTION_SECRET") || "";

const bot = new Bot(telegramBotToken);
const supabaseUrl = getEnvVar("SUPA_URL");
const supabaseSecretKey = getEnvVar("SUPA_SECRET_KEY");
if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("SUPA_URL and SUPA_SECRET_KEY are required");
}
const sessionStore = new SupabaseSessionStore(supabaseUrl, supabaseSecretKey);

const messenger = {
  sendMessage(chatId: number, text: string, options?: Record<string, unknown>) {
    return bot.api.sendMessage(chatId, text, options);
  },
  sendPhoto(
    chatId: number,
    photoUrl: string,
    options?: Record<string, unknown>,
  ) {
    return bot.api.sendPhoto(chatId, photoUrl, options);
  },
  answerCallbackQuery(
    callbackQueryId: string,
    options?: Record<string, unknown>,
  ) {
    return bot.api.answerCallbackQuery(callbackQueryId, options);
  },
};

bot.command("start", async (ctx) => {
  if (!ctx.chat) {
    return;
  }

  await handleStartCommand(
    messenger,
    ctx.chat.id,
    sessionStore,
    ctx.from?.language_code,
  );
});

bot.on("message:text", async (ctx) => {
  if (!ctx.chat || !ctx.message?.text) {
    return;
  }

  await handleTextMessage(
    messenger,
    ctx.chat.id,
    ctx.message.text,
    sessionStore,
    ctx.chat.type === "private",
    ctx.from?.language_code,
  );
});

bot.on("callback_query:data", async (ctx) => {
  const chatId = ctx.callbackQuery.message?.chat.id;
  if (!chatId) {
    return;
  }

  await handleCallbackQuery(
    messenger,
    ctx.callbackQuery.id,
    chatId,
    ctx.callbackQuery.data,
    sessionStore,
    ctx.from?.language_code,
  );
});

const handleUpdate = webhookCallback(
  bot,
  "std/http",
  webhookSecret ? { secretToken: webhookSecret } : undefined,
);

Deno.serve(async (request) => {
  if (request.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        message: "telegram-bot webhook is running",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    return await handleUpdate(request);
  } catch (error) {
    console.error("Error handling Telegram webhook:", error);
    return new Response("internal error", { status: 500 });
  }
});
