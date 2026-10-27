import type { SessionStore, UserSession } from "./session-store.ts";
import type { Language } from "./session-store.ts";
import type { BotMessenger } from "./messenger.ts";
import { translate } from "../i18n.ts";
import {
  getNotionPageTitleById,
  getRandomGameFromNotion,
  getRandomMovieFromNotion,
  getRandomSeriesFromNotion,
  updateGameInNotion,
  updateMovieInNotion,
} from "../services/notion.ts";
import { fetchGameDetails } from "../services/igdb.ts";
import { fetchMovieDetails, fetchSeriesDetails } from "../services/tmdb.ts";
import {
  deleteGamesByNotionTitle,
  deleteMoviesByNotionTitle,
  deleteSeriesByNotionTitle,
  getGameByNotionTitle,
  getMoviesByNotionTitle,
  getSeriesByNotionTitle,
  saveGame,
  saveMovies,
  saveSeries,
} from "../services/db.ts";

function mainKeyboard(language: Language) {
  return {
    reply_markup: {
      keyboard: [
        [{ text: translate(language, "menu.movie") }],
        [{ text: translate(language, "menu.series") }],
        [{ text: translate(language, "menu.game") }],
        [{ text: translate(language, "menu.settings") }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  };
}

function settingsKeyboard(language: Language) {
  return {
    reply_markup: {
      keyboard: [
        [
          { text: translate(language, "menu.english") },
          { text: translate(language, "menu.ukrainian") },
        ],
        [{ text: translate(language, "menu.back") }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  };
}

function gamePlatformKeyboard(language: Language) {
  return {
    reply_markup: {
      keyboard: [
        [
          { text: translate(language, "menu.playstation") },
          { text: translate(language, "menu.pc") },
        ],
        [{ text: translate(language, "menu.back") }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  };
}

function gameTypeKeyboard(language: Language) {
  return {
    reply_markup: {
      keyboard: [
        [
          { text: translate(language, "menu.story") },
          { text: translate(language, "menu.gameplay") },
        ],
        [{ text: translate(language, "menu.back") }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  };
}

function getTelegramLanguage(languageCode?: string): Language {
  return languageCode?.toLowerCase().startsWith("uk") ? "uk" : "en";
}

function sessionStoreWithLanguageFallback(
  messenger: BotMessenger,
  chatId: number,
  sessionStore: SessionStore,
  fallbackLanguage: Language,
): SessionStore {
  let languageResult: Promise<Language> | undefined;

  return {
    get: (id) => sessionStore.get(id),
    set: (id, session) => sessionStore.set(id, session),
    delete: (id) => sessionStore.delete(id),
    getLanguage: (id) => {
      languageResult ??= sessionStore.getLanguage(id).catch(async (error) => {
        console.error(
          "Could not load saved language; using Telegram language:",
          error,
        );
        await messenger.sendMessage(
          chatId,
          translate(fallbackLanguage, "message.language_load_failed"),
        );
        return fallbackLanguage;
      });
      return languageResult;
    },
    setLanguage: async (id, language) => {
      await sessionStore.setLanguage(id, language);
      languageResult = Promise.resolve(language);
    },
  };
}

export async function handleStartCommand(
  messenger: BotMessenger,
  chatId: number,
  sessionStore: SessionStore,
  telegramLanguageCode?: string,
) {
  sessionStore = sessionStoreWithLanguageFallback(
    messenger,
    chatId,
    sessionStore,
    getTelegramLanguage(telegramLanguageCode),
  );
  const language = await sessionStore.getLanguage(chatId);
  await messenger.sendMessage(
    chatId,
    translate(language, "message.start", {
      movie: translate(language, "menu.movie"),
      series: translate(language, "menu.series"),
      game: translate(language, "menu.game"),
      settings: translate(language, "menu.settings"),
    }),
    mainKeyboard(language),
  );
}

export async function handleTextMessage(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  sessionStore: SessionStore,
  isPrivateChat = true,
  telegramLanguageCode?: string,
) {
  sessionStore = sessionStoreWithLanguageFallback(
    messenger,
    chatId,
    sessionStore,
    getTelegramLanguage(telegramLanguageCode),
  );
  const userState = await sessionStore.get(chatId);
  const language = await sessionStore.getLanguage(chatId);

  if (text === translate(language, "menu.settings")) {
    if (!isPrivateChat) {
      await messenger.sendMessage(
        chatId,
        translate(language, "message.settings_private_only"),
        mainKeyboard(language),
      );
      return;
    }

    await sessionStore.set(chatId, { step: "AWAITING_LANGUAGE" });
    await messenger.sendMessage(
      chatId,
      translate(language, "message.select_language"),
      settingsKeyboard(language),
    );
    return;
  }

  if (userState?.step === "AWAITING_LANGUAGE") {
    const selectedLanguage = text === translate(language, "menu.english")
      ? "en"
      : text === translate(language, "menu.ukrainian")
      ? "uk"
      : null;

    if (selectedLanguage) {
      try {
        await sessionStore.setLanguage(chatId, selectedLanguage);
      } catch {
        await messenger.sendMessage(
          chatId,
          translate(language, "message.language_save_failed"),
          settingsKeyboard(language),
        );
        return;
      }

      await messenger.sendMessage(
        chatId,
        translate(selectedLanguage, "message.language_saved"),
        mainKeyboard(selectedLanguage),
      );
      return;
    }

    if (isBackButton(text, language)) {
      await handleBackButtonPress(messenger, chatId, userState, sessionStore);
      return;
    }

    await messenger.sendMessage(
      chatId,
      translate(language, "message.select_language"),
      settingsKeyboard(language),
    );
    return;
  }

  if (text === translate(language, "menu.game")) {
    await sessionStore.delete(chatId);
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });

    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_platform"),
      gamePlatformKeyboard(language),
    );
    return;
  }

  if (text === translate(language, "menu.movie")) {
    await sessionStore.delete(chatId);
    await handleFindMovie(messenger, chatId, sessionStore);
    return;
  }

  if (text === translate(language, "menu.series")) {
    await sessionStore.delete(chatId);
    await handleFindSeries(messenger, chatId, sessionStore);
    return;
  }

  if (isBackButton(text, language)) {
    await handleBackButtonPress(messenger, chatId, userState, sessionStore);
    return;
  }

  if (userState?.step === "AWAITING_RATING") {
    await handleAwaitingRating(
      messenger,
      chatId,
      text,
      userState,
      sessionStore,
    );
    return;
  }

  if (userState?.step === "AWAITING_GAME_PLATFORM") {
    await handleAwaitingGamePlatform(messenger, chatId, text, sessionStore);
    return;
  }

  if (userState?.step === "AWAITING_GAME_TYPE") {
    await handleAwaitingGameType(
      messenger,
      chatId,
      text,
      userState,
      sessionStore,
    );
    return;
  }

  if (userState?.step === "AWAITING_GAME_RATING") {
    await handleAwaitingGameRating(
      messenger,
      chatId,
      text,
      userState,
      sessionStore,
    );
    return;
  }

  if (userState?.step === "VIEWING_GAME") {
    await handleViewingGame(messenger, chatId, text, userState, sessionStore);
  }
}

export async function handleCallbackQuery(
  messenger: BotMessenger,
  callbackQueryId: string,
  chatId: number,
  data: string,
  sessionStore: SessionStore,
  telegramLanguageCode?: string,
) {
  sessionStore = sessionStoreWithLanguageFallback(
    messenger,
    chatId,
    sessionStore,
    getTelegramLanguage(telegramLanguageCode),
  );
  if (data.startsWith("watched_")) {
    await handleWatchedMovieCallback(
      messenger,
      callbackQueryId,
      chatId,
      data,
      sessionStore,
    );
    return;
  }

  if (data.startsWith("played_game_")) {
    await handleWatchedGameCallback(
      messenger,
      callbackQueryId,
      chatId,
      data,
      sessionStore,
    );
  }
}

async function handleWatchedMovieCallback(
  messenger: BotMessenger,
  callbackQueryId: string,
  chatId: number,
  data: string,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  const parts = data.split("_");
  const pageId = parts[1];
  if (!pageId) {
    await messenger.answerCallbackQuery(callbackQueryId, {
      text: translate(language, "message.movie_callback_not_found"),
      show_alert: true,
    });
    return;
  }
  const index = parts[2] ? Number.parseInt(parts[2], 10) : 0;
  const userState = await sessionStore.get(chatId);

  let notionTitle: string;
  let genres: string[];

  if (
    userState?.options &&
    userState.pageId === pageId &&
    userState.notionTitle
  ) {
    notionTitle = userState.notionTitle;
    genres = userState.options[index] || [];
  } else {
    const title = await getNotionPageTitleById(pageId);
    if (!title) {
      await messenger.answerCallbackQuery(callbackQueryId, {
        text: translate(language, "message.movie_callback_not_found"),
        show_alert: true,
      });
      return;
    }

    notionTitle = title;
    const moviesDetails = await getMoviesByNotionTitle(title, language);
    const seriesDetails = await getSeriesByNotionTitle(title, language);
    if (
      (!moviesDetails || moviesDetails.length === 0) &&
      (!seriesDetails || seriesDetails.length === 0)
    ) {
      await messenger.answerCallbackQuery(callbackQueryId, {
        text: translate(language, "message.movie_callback_not_found"),
        show_alert: true,
      });
      return;
    }

    genres = moviesDetails?.[index]?.genres ||
      moviesDetails?.[0]?.genres ||
      seriesDetails?.[index]?.genres ||
      seriesDetails?.[0]?.genres ||
      [];
  }

  await sessionStore.set(chatId, {
    step: "AWAITING_RATING",
    pageId,
    notionTitle,
    genres,
  });

  await messenger.sendMessage(
    chatId,
    translate(language, "message.enter_rating"),
    {
      reply_markup: {
        force_reply: true,
      },
    },
  );
  await messenger.answerCallbackQuery(callbackQueryId);
}

async function handleWatchedGameCallback(
  messenger: BotMessenger,
  callbackQueryId: string,
  chatId: number,
  data: string,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  const pageId = data.slice("played_game_".length);
  const userState = await sessionStore.get(chatId);

  let notionTitle: string;
  let genres: string[];

  if (
    userState?.step === "VIEWING_GAME" &&
    userState.pageId === pageId &&
    userState.notionTitle
  ) {
    notionTitle = userState.notionTitle;
    genres = userState.genres || [];
  } else {
    const title = await getNotionPageTitleById(pageId);
    if (!title) {
      await messenger.answerCallbackQuery(callbackQueryId, {
        text: translate(language, "message.game_callback_not_found"),
        show_alert: true,
      });
      return;
    }

    const gameDetails = await getGameByNotionTitle(title, language);
    if (!gameDetails) {
      await messenger.answerCallbackQuery(callbackQueryId, {
        text: translate(language, "message.game_callback_not_found"),
        show_alert: true,
      });
      return;
    }

    notionTitle = title;
    genres = gameDetails.genres || [];
  }

  await sessionStore.set(chatId, {
    step: "AWAITING_GAME_RATING",
    pageId,
    notionTitle,
    genres,
  });

  await messenger.sendMessage(
    chatId,
    translate(language, "message.game_rating"),
    {
      reply_markup: {
        force_reply: true,
      },
    },
  );
  await messenger.answerCallbackQuery(callbackQueryId);
}

async function handleAwaitingRating(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  userState: UserSession,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  const rating = Number(text.trim());

  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.invalid_rating"),
    );
    return;
  }

  if (!userState.pageId) {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.expired_movie"),
      mainKeyboard(language),
    );
    await sessionStore.delete(chatId);
    return;
  }

  try {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.updating_notion"),
    );
    await updateMovieInNotion(userState.pageId, rating, userState.genres || []);
    if (userState.notionTitle) {
      await deleteMoviesByNotionTitle(userState.notionTitle);
      await deleteSeriesByNotionTitle(userState.notionTitle);
    }
    await messenger.sendMessage(
      chatId,
      translate(language, "message.movie_updated"),
    );
    await sessionStore.delete(chatId);
  } catch (error) {
    console.error("Error updating Notion:", error);
    await messenger.sendMessage(
      chatId,
      translate(language, "message.movie_update_failed"),
    );
    await sessionStore.delete(chatId);
  }
}

async function handleAwaitingGamePlatform(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  if (isBackButton(text, language)) {
    await sessionStore.delete(chatId);
    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_action"),
      mainKeyboard(language),
    );
    return;
  }

  const platform = text === translate(language, "menu.playstation")
    ? "Playstation"
    : text === translate(language, "menu.pc")
    ? "PC"
    : null;

  if (!platform) {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_platform"),
      gamePlatformKeyboard(language),
    );
    return;
  }

  await sessionStore.set(chatId, {
    step: "AWAITING_GAME_TYPE",
    platform,
  });

  await messenger.sendMessage(
    chatId,
    translate(language, "message.choose_game_type"),
    gameTypeKeyboard(language),
  );
}

async function handleAwaitingGameType(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  userState: UserSession,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  if (!userState.platform) {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_platform"),
      gamePlatformKeyboard(language),
    );
    return;
  }

  if (userState.platform !== "Playstation" && userState.platform !== "PC") {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_platform"),
      gamePlatformKeyboard(language),
    );
    return;
  }

  if (isBackButton(text, language)) {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_platform"),
      gamePlatformKeyboard(language),
    );
    return;
  }

  const isStory = text === translate(language, "menu.story");
  const isGameplay = text === translate(language, "menu.gameplay");
  if (!isStory && !isGameplay) {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_game_type"),
      gameTypeKeyboard(language),
    );
    return;
  }

  await handleFindGame(
    messenger,
    chatId,
    sessionStore,
    userState.platform,
    isStory ? "story" : "gameplay",
  );
}

async function handleAwaitingGameRating(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  userState: UserSession,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  const rating = Number(text.trim());

  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.invalid_rating"),
    );
    return;
  }

  if (!userState.pageId || !userState.notionTitle) {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.expired_game"),
      mainKeyboard(language),
    );
    await sessionStore.delete(chatId);
    return;
  }

  try {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.updating_notion"),
    );
    await updateGameInNotion(userState.pageId, rating, userState.genres || []);
    await deleteGamesByNotionTitle(userState.notionTitle);
    await messenger.sendMessage(
      chatId,
      translate(language, "message.game_updated"),
      mainKeyboard(language),
    );
    await sessionStore.delete(chatId);
  } catch (error) {
    console.error("Error updating game in Notion:", error);
    await messenger.sendMessage(
      chatId,
      translate(language, "message.game_update_failed"),
      mainKeyboard(language),
    );
    await sessionStore.delete(chatId);
  }
}

async function handleViewingGame(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  userState: UserSession,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  if (userState.platform !== "Playstation" && userState.platform !== "PC") {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_platform"),
      gamePlatformKeyboard(language),
    );
    return;
  }

  if (!isGameTypeButton(text, language)) {
    return;
  }

  await handleFindGame(
    messenger,
    chatId,
    sessionStore,
    userState.platform,
    text === translate(language, "menu.story") ? "story" : "gameplay",
  );
}

async function handleBackButtonPress(
  messenger: BotMessenger,
  chatId: number,
  userState: UserSession | null,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  if (userState?.step === "AWAITING_GAME_TYPE") {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      translate(language, "message.choose_platform"),
      gamePlatformKeyboard(language),
    );
    return;
  }

  await sessionStore.delete(chatId);
  await messenger.sendMessage(
    chatId,
    translate(language, "message.choose_action"),
    mainKeyboard(language),
  );
}

async function handleFindMovie(
  messenger: BotMessenger,
  chatId: number,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  try {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.finding_movie"),
      mainKeyboard(language),
    );

    const notionMovie = await getRandomMovieFromNotion();

    await messenger.sendMessage(
      chatId,
      translate(language, "message.found_movie", {
        title: notionMovie.title,
      }),
    );

    let moviesDetails = await getMoviesByNotionTitle(
      notionMovie.title,
      language,
    );

    if (moviesDetails) {
      console.log(
        `Fetched details for "${notionMovie.title}" from Supabase cache.`,
      );
    } else {
      moviesDetails = await fetchMovieDetails(notionMovie.title, language);

      if (moviesDetails && moviesDetails.length > 0) {
        await saveMovies(notionMovie.title, language, moviesDetails);
      }
    }

    if (!moviesDetails || moviesDetails.length === 0) {
      await messenger.sendMessage(
        chatId,
        translate(language, "message.movie_not_found", {
          title: notionMovie.title,
        }),
      );
      return;
    }

    await sessionStore.set(chatId, {
      step: "VIEWING_OPTIONS",
      pageId: notionMovie.id,
      notionTitle: notionMovie.title,
      options: moviesDetails.map((movie) => movie.genres),
    });

    for (let index = 0; index < moviesDetails.length; index++) {
      const movieDetails = moviesDetails[index];
      if (!movieDetails) {
        continue;
      }

      const caption =
        `<b>${movieDetails.title} (${movieDetails.year})</b>\n\n${movieDetails.description}\n\n⭐️ ${
          translate(language, "caption.rating")
        }: ${movieDetails.rating.toFixed(1)}\n\n🎬 ${
          translate(language, "caption.genres")
        }: ${movieDetails.genres.join(", ")}\n\n📍 ${
          translate(language, "caption.country")
        }: ${movieDetails.country}`;
      const googleQuery = encodeURIComponent(
        `${movieDetails.title} watch online`,
      );

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: translate(language, "button.more_info"),
                url: `https://www.themoviedb.org/movie/${movieDetails.tmdb_id}`,
              },
            ],
            [
              {
                text: translate(language, "button.watched"),
                callback_data: `watched_${notionMovie.id}_${index}`,
              },
              {
                text: translate(language, "button.watch"),
                url: `https://www.google.com/search?q=${googleQuery}`,
              },
            ],
          ],
        },
      };

      if (movieDetails.posterUrl) {
        await messenger.sendPhoto(chatId, movieDetails.posterUrl, {
          parse_mode: "HTML",
          caption,
          ...inlineKeyboard,
        });
      } else {
        await messenger.sendMessage(chatId, caption, {
          parse_mode: "HTML",
          ...inlineKeyboard,
        });
      }
    }
  } catch (error) {
    console.error("Error handling Find a Movie:", error);
    await messenger.sendMessage(
      chatId,
      translate(language, "message.movie_fetch_failed"),
    );
  }
}

async function handleFindSeries(
  messenger: BotMessenger,
  chatId: number,
  sessionStore: SessionStore,
) {
  const language = await sessionStore.getLanguage(chatId);
  try {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.finding_series"),
      mainKeyboard(language),
    );

    const notionSeries = await getRandomSeriesFromNotion();

    await messenger.sendMessage(
      chatId,
      translate(language, "message.found_series", {
        title: notionSeries.title,
      }),
    );

    let seriesDetails = await getSeriesByNotionTitle(
      notionSeries.title,
      language,
    );

    if (seriesDetails) {
      console.log(
        `Fetched details for "${notionSeries.title}" from Supabase cache.`,
      );
    } else {
      seriesDetails = await fetchSeriesDetails(notionSeries.title, language);

      if (seriesDetails && seriesDetails.length > 0) {
        await saveSeries(notionSeries.title, language, seriesDetails);
      }
    }

    if (!seriesDetails || seriesDetails.length === 0) {
      await messenger.sendMessage(
        chatId,
        translate(language, "message.series_not_found", {
          title: notionSeries.title,
        }),
      );
      return;
    }

    await sessionStore.set(chatId, {
      step: "VIEWING_OPTIONS",
      pageId: notionSeries.id,
      notionTitle: notionSeries.title,
      options: seriesDetails.map((series) => series.genres),
    });

    for (let index = 0; index < seriesDetails.length; index++) {
      const series = seriesDetails[index];
      if (!series) {
        continue;
      }

      const caption =
        `<b>${series.title} (${series.year})</b>\n\n${series.description}\n\n⭐️ ${
          translate(language, "caption.rating")
        }: ${series.rating.toFixed(1)}\n\n🎬 ${
          translate(language, "caption.genres")
        }: ${
          series.genres.join(", ") ||
          translate(language, "caption.not_available")
        }`;

      const googleQuery = encodeURIComponent(`${series.title} watch online`);

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: translate(language, "button.more_info"),
                url: `https://www.themoviedb.org/tv/${series.tmdb_id}`,
              },
            ],
            [
              {
                text: translate(language, "button.watched"),
                callback_data: `watched_${notionSeries.id}_${index}`,
              },
              {
                text: translate(language, "button.watch"),
                url: `https://www.google.com/search?q=${googleQuery}`,
              },
            ],
          ],
        },
      };

      if (series.posterUrl) {
        await messenger.sendPhoto(chatId, series.posterUrl, {
          parse_mode: "HTML",
          caption,
          ...inlineKeyboard,
        });
      } else {
        await messenger.sendMessage(chatId, caption, {
          parse_mode: "HTML",
          ...inlineKeyboard,
        });
      }
    }
  } catch (error) {
    console.error("Error handling Find a Series:", error);
    await messenger.sendMessage(
      chatId,
      translate(language, "message.series_fetch_failed"),
    );
  }
}

async function handleFindGame(
  messenger: BotMessenger,
  chatId: number,
  sessionStore: SessionStore,
  platformChoice: "Playstation" | "PC",
  styleChoice: "story" | "gameplay",
) {
  const language = await sessionStore.getLanguage(chatId);
  try {
    await messenger.sendMessage(
      chatId,
      translate(language, "message.finding_game"),
    );

    const notionGame = await getRandomGameFromNotion(
      platformChoice,
      styleChoice,
    );

    await messenger.sendMessage(
      chatId,
      translate(language, "message.found_game", {
        title: notionGame.title,
      }),
    );

    let gameDetails = await getGameByNotionTitle(
      notionGame.title,
      language,
    );

    if (gameDetails) {
      console.log(
        `Fetched details for "${notionGame.title}" from Supabase cache.`,
      );
    } else {
      gameDetails = await fetchGameDetails(notionGame.title);

      if (gameDetails) {
        await saveGame(
          notionGame.title,
          language,
          notionGame.platforms.join(", "),
          gameDetails,
        );
      }
    }

    if (!gameDetails) {
      await sessionStore.delete(chatId);
      await messenger.sendMessage(
        chatId,
        translate(language, "message.game_not_found", {
          title: notionGame.title,
        }),
        mainKeyboard(language),
      );
      return;
    }

    await sessionStore.set(chatId, {
      step: "VIEWING_GAME",
      pageId: notionGame.id,
      notionTitle: notionGame.title,
      genres: gameDetails.genres,
      platform: platformChoice,
    });

    const trimmedDescription = trimToSentenceCount(gameDetails.description, 2);
    const caption =
      `<b>${gameDetails.title} (${gameDetails.year})</b>\n\n${trimmedDescription}\n\n⭐ ${
        translate(language, "caption.rating")
      }: ${gameDetails.rating.toFixed(1)}\n\n🎭 ${
        translate(language, "caption.genres")
      }: ${
        gameDetails.genres.join(", ") ||
        translate(language, "caption.not_available")
      }\n\n🕹️ ${translate(language, "caption.platform")}: ${
        notionGame.platforms.join(", ") || platformChoice
      }`;

    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: translate(language, "button.played"),
              callback_data: `played_game_${notionGame.id}`,
            },
            {
              text: translate(language, "button.more_info"),
              url: gameDetails.url,
            },
          ],
        ],
      },
    };

    if (gameDetails.posterUrl) {
      await messenger.sendPhoto(chatId, gameDetails.posterUrl, {
        parse_mode: "HTML",
        caption,
        ...inlineKeyboard,
      });
    } else {
      await messenger.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        ...inlineKeyboard,
      });
    }
  } catch (error) {
    console.error("Error handling Find a Game:", error);
    await sessionStore.delete(chatId);
    await messenger.sendMessage(
      chatId,
      translate(language, "message.game_fetch_failed"),
      mainKeyboard(language),
    );
  }
}

function trimToSentenceCount(text: string, maxSentences: number): string {
  const normalizedText = text.replaceAll(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "No description available.";
  }

  const sentenceMatches = normalizedText.match(/(?:[^.!?]+[.!?]+|[^.!?]+$)/g);

  if (!sentenceMatches || sentenceMatches.length <= maxSentences) {
    return normalizedText;
  }

  return `${sentenceMatches.slice(0, maxSentences).join(" ").trim()}`;
}

function isBackButton(text: string, language: Language): boolean {
  return text === translate(language, "menu.back");
}

function isGameTypeButton(text: string, language: Language): boolean {
  return (
    text === translate(language, "menu.story") ||
    text === translate(language, "menu.gameplay")
  );
}
