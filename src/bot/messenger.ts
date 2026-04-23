export interface BotMessenger {
  sendMessage(
    chatId: number,
    text: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  sendPhoto(
    chatId: number,
    photoUrl: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  answerCallbackQuery(
    callbackQueryId: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
}
