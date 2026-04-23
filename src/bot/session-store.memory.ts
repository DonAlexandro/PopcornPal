import type { SessionStore, UserSession } from "./session-store.ts";

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<number, UserSession>();

  async get(chatId: number): Promise<UserSession | null> {
    return this.sessions.get(chatId) ?? null;
  }

  async set(chatId: number, session: UserSession): Promise<void> {
    this.sessions.set(chatId, session);
  }

  async delete(chatId: number): Promise<void> {
    this.sessions.delete(chatId);
  }
}
