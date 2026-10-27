import { createClient } from "@supabase/supabase-js";
import type { Language, SessionStore, UserSession } from "./session-store.ts";

interface BotSessionRow {
  chat_id: number;
  step: UserSession["step"] | null;
  page_id: string | null;
  options: string[][] | null;
  genres: string[] | null;
  platform: string | null;
  notion_title: string | null;
  language: Language;
}

export class SupabaseSessionStore implements SessionStore {
  private readonly supabase;

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key);
  }

  async get(chatId: number): Promise<UserSession | null> {
    const { data, error } = await this.supabase
      .from("bot_sessions")
      .select("chat_id, step, page_id, options, genres, platform, notion_title")
      .eq("chat_id", chatId)
      .maybeSingle<BotSessionRow>();

    if (error) {
      console.error("Error fetching bot session from Supabase:", error);
      throw new Error("Could not load the bot session");
    }

    if (!data?.step) {
      return null;
    }

    return {
      step: data.step,
      pageId: data.page_id ?? undefined,
      options: data.options ?? undefined,
      genres: data.genres ?? undefined,
      platform: data.platform ?? undefined,
      notionTitle: data.notion_title ?? undefined,
    };
  }

  async set(chatId: number, session: UserSession): Promise<void> {
    const { error } = await this.supabase.from("bot_sessions").upsert({
      chat_id: chatId,
      step: session.step,
      page_id: session.pageId ?? null,
      options: session.options ?? null,
      genres: session.genres ?? null,
      platform: session.platform ?? null,
      notion_title: session.notionTitle ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error saving bot session to Supabase:", error);
      throw new Error("Could not save the bot session");
    }
  }

  async delete(chatId: number): Promise<void> {
    const { error } = await this.supabase
      .from("bot_sessions")
      .update({
        step: null,
        page_id: null,
        options: null,
        genres: null,
        platform: null,
        notion_title: null,
        updated_at: new Date().toISOString(),
      })
      .eq("chat_id", chatId);

    if (error) {
      console.error("Error deleting bot session from Supabase:", error);
      throw new Error("Could not clear the bot session");
    }
  }

  async getLanguage(chatId: number): Promise<Language> {
    const { data, error } = await this.supabase
      .from("bot_sessions")
      .select("language")
      .eq("chat_id", chatId)
      .maybeSingle<{ language: Language }>();

    if (error) {
      console.error("Error fetching bot language from Supabase:", error);
      throw new Error("Could not load the saved language preference");
    }

    return data?.language ?? "en";
  }

  async setLanguage(chatId: number, language: Language): Promise<void> {
    const { error } = await this.supabase.from("bot_sessions").upsert(
      {
        chat_id: chatId,
        step: null,
        page_id: null,
        options: null,
        genres: null,
        platform: null,
        notion_title: null,
        language,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chat_id" },
    );

    if (error) {
      console.error("Error saving bot language to Supabase:", error);
      throw new Error("Could not save the language preference");
    }
  }
}
