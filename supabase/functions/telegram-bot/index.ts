// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  Bot,
  webhookCallback,
} from "https://deno.land/x/grammy@v1.38.3/mod.ts";

import { createSessionStore } from "../../../src/bot/create-session-store.ts";
import {
  handleCallbackQuery,
  handleStartCommand,
  handleTextMessage,
} from "../../../src/bot/handlers.ts";

const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const webhookSecret = Deno.env.get("SUPA_FUNCTION_SECRET") || "";

const bot = new Bot(telegramBotToken);
const sessionStore = createSessionStore();

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

  await handleStartCommand(messenger, ctx.chat.id);
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
  );
});

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const webhookSecretHeader = request.headers.get(
    "x-telegram-bot-api-secret-token",
  );
  const webhookSecretQuery = url.searchParams.get("secret");

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

  if (
    webhookSecret &&
    webhookSecretQuery !== webhookSecret &&
    webhookSecretHeader !== webhookSecret
  ) {
    return new Response("not allowed", { status: 405 });
  }

  try {
    return await handleUpdate(request);
  } catch (error) {
    console.error("Error handling Telegram webhook:", error);
    return new Response("internal error", { status: 500 });
  }
});
