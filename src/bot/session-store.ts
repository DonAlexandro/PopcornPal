export type SessionStep =
  | "VIEWING_OPTIONS"
  | "VIEWING_GAME"
  | "AWAITING_RATING"
  | "AWAITING_GAME_PLATFORM"
  | "AWAITING_GAME_TYPE"
  | "AWAITING_GAME_RATING";

export interface UserSession {
  step: SessionStep;
  pageId?: string;
  options?: string[][];
  genres?: string[];
  platform?: string;
  notionTitle?: string;
}

export interface SessionStore {
  get(chatId: number): Promise<UserSession | null>;
  set(chatId: number, session: UserSession): Promise<void>;
  delete(chatId: number): Promise<void>;
}
