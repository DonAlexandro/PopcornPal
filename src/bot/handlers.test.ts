import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { BotMessenger } from "./messenger.ts";
import type { Language, SessionStore, UserSession } from "./session-store.ts";

mock.module("../services/db.ts", () => ({
  deleteGamesByNotionTitle: async () => {},
  deleteMoviesByNotionTitle: async () => {},
  deleteSeriesByNotionTitle: async () => {},
  getGameByNotionTitle: async () => null,
  getMoviesByNotionTitle: async () => null,
  getSeriesByNotionTitle: async () => null,
  saveGame: async () => {},
  saveMovies: async () => {},
  saveSeries: async () => {},
}));

mock.module("../services/notion.ts", () => ({
  getNotionPageTitleById: async () => null,
  getRandomGameFromNotion: async () => null,
  getRandomMovieFromNotion: async () => null,
  getRandomSeriesFromNotion: async () => null,
  updateGameInNotion: async () => {},
  updateMovieInNotion: async () => {},
}));

mock.module("../services/igdb.ts", () => ({
  fetchGameDetails: async () => null,
}));

mock.module("../services/tmdb.ts", () => ({
  fetchMovieDetails: async () => [],
  fetchSeriesDetails: async () => [],
}));

const { handleStartCommand, handleTextMessage } = await import("./handlers.ts");

class TestSessionStore implements SessionStore {
  language: Language = "en";
  session: UserSession | null = null;
  failLanguageLoad = false;
  failLanguageSave = false;

  async get() {
    return this.session;
  }

  async set(_chatId: number, session: UserSession) {
    this.session = session;
  }

  async delete() {
    this.session = null;
  }

  async getLanguage() {
    if (this.failLanguageLoad) {
      throw new Error("Preference unavailable");
    }

    return this.language;
  }

  async setLanguage(_chatId: number, language: Language) {
    if (this.failLanguageSave) {
      throw new Error("Save failed");
    }

    this.language = language;
    this.session = null;
  }
}

describe("language settings", () => {
  let store: TestSessionStore;
  let messages: Array<{ text: string; options?: Record<string, unknown> }>;
  let messenger: BotMessenger;

  beforeEach(() => {
    store = new TestSessionStore();
    messages = [];
    messenger = {
      sendMessage(_chatId, text, options) {
        messages.push({ text, options });
        return Promise.resolve(undefined);
      },
      sendPhoto() {
        return Promise.resolve(undefined);
      },
      answerCallbackQuery() {
        return Promise.resolve(undefined);
      },
    };
  });

  it("shows a four-button English menu by default", async () => {
    await handleStartCommand(messenger, 1, store);

    expect(messages.at(-1)?.text).toContain("Find a Movie");
    const keyboard = messages.at(-1)?.options?.reply_markup as {
      keyboard: Array<Array<{ text: string }>>;
    };
    expect(keyboard.keyboard).toHaveLength(4);
    expect(keyboard.keyboard[3]?.[0]?.text).toBe("⚙️ Settings");
  });

  it("restricts language changes to private chats and switches preference", async () => {
    await handleTextMessage(messenger, 1, "⚙️ Settings", store, false);
    expect(messages.at(-1)?.text).toContain("private chats");
    expect(store.language).toBe("en");

    await handleTextMessage(messenger, 1, "⚙️ Settings", store, true);
    expect(store.session?.step).toBe("AWAITING_LANGUAGE");
    await handleTextMessage(messenger, 1, "unexpected text", store, true);
    expect(messages.at(-1)?.text).toBe("Choose a language:");
    await handleTextMessage(messenger, 1, "🇺🇦 Українська", store, true);

    expect(store.language).toBe("uk");
    expect(messages.at(-1)?.text).toBe("Мову змінено на українську.");
    const keyboard = messages.at(-1)?.options?.reply_markup as {
      keyboard: Array<Array<{ text: string }>>;
    };
    expect(keyboard.keyboard[3]?.[0]?.text).toBe("⚙️ Налаштування");
  });

  it("does not apply an unsaved language choice", async () => {
    store.failLanguageSave = true;
    await handleTextMessage(messenger, 1, "⚙️ Settings", store, true);
    await handleTextMessage(messenger, 1, "🇺🇦 Українська", store, true);

    expect(store.language).toBe("en");
    expect(messages.at(-1)?.text).toContain("Could not save");
  });

  it("shows a localized retry message and uses Telegram language when loading fails", async () => {
    store.failLanguageLoad = true;

    await handleTextMessage(
      messenger,
      1,
      "unknown message",
      store,
      true,
      "uk-UA",
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe(
      "Тимчасово не вдалося завантажити налаштування профілю. Будь ласка, спробуйте ще раз трохи пізніше.",
    );
  });
});
