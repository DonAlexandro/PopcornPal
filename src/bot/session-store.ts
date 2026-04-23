export type SessionStep = "VIEWING_OPTIONS" | "AWAITING_RATING";

export interface UserSession {
  step: SessionStep;
  pageId: string;
  options?: string[][];
  genres?: string[];
}

export interface SessionStore {
  get(chatId: number): Promise<UserSession | null>;
  set(chatId: number, session: UserSession): Promise<void>;
  delete(chatId: number): Promise<void>;
}
