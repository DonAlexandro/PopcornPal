import TelegramBot from "node-telegram-bot-api";
import type { BotMessenger } from "../bot/messenger";
import type { SessionStore } from "../bot/session-store";
import {
  handleCallbackQuery,
  handleStartCommand,
  handleTextMessage,
} from "../bot/handlers";

export function setupBot(token: string, sessionStore: SessionStore) {
  const bot = new TelegramBot(token, { polling: true });

  const messenger: BotMessenger = {
    sendMessage(chatId, text, options) {
      return bot.sendMessage(chatId, text, options);
    },
    sendPhoto(chatId, photoUrl, options) {
      return bot.sendPhoto(chatId, photoUrl, options);
    },
    answerCallbackQuery(callbackQueryId, options) {
      return bot.answerCallbackQuery(callbackQueryId, options);
    },
  };

  bot.onText(/\/start/, (msg) => {
    void handleStartCommand(messenger, msg.chat.id);
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    await handleTextMessage(messenger, chatId, text, sessionStore);
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId || !query.data) return;

    await handleCallbackQuery(
      messenger,
      query.id,
      chatId,
      query.data,
      sessionStore,
    );
  });

  return bot;
}
