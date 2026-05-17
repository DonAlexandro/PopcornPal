import type { SessionStore, UserSession } from "./session-store.ts";
import type { BotMessenger } from "./messenger.ts";
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
  deleteMoviesByNotionTitle,
  deleteSeriesByNotionTitle,
  deleteGamesByNotionTitle,
  getGameByNotionTitle,
  getMoviesByNotionTitle,
  getSeriesByNotionTitle,
  saveGame,
  saveMovies,
  saveSeries,
} from "../services/db.ts";

export const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "Find a Movie" }],
      [{ text: "Find a Series" }],
      [{ text: "Find a Game" }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
};

const backButtonText = "<< back";

const gamePlatformKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "Playstation" }, { text: "PC" }],
      [{ text: backButtonText }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
};

const gameTypeKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "📖 Story-driven" }, { text: "🎮 Gameplay-driven" }],
      [{ text: backButtonText }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
};

export async function handleStartCommand(
  messenger: BotMessenger,
  chatId: number,
) {
  await messenger.sendMessage(
    chatId,
    'Hi! Press "Find a Movie", "Find a Series", or "Find a Game" to get a random recommendation.',
    mainKeyboard,
  );
}

export async function handleTextMessage(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  sessionStore: SessionStore,
) {
  const userState = await sessionStore.get(chatId);

  if (text === "Find a Game") {
    await sessionStore.delete(chatId);
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });

    await messenger.sendMessage(
      chatId,
      "Choose a platform:",
      gamePlatformKeyboard,
    );
    return;
  }

  if (text === "Find a Movie") {
    await sessionStore.delete(chatId);
    await handleFindMovie(messenger, chatId, sessionStore);
    return;
  }

  if (text === "Find a Series") {
    await sessionStore.delete(chatId);
    await handleFindSeries(messenger, chatId, sessionStore);
    return;
  }

  if (isBackButton(text)) {
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
) {
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
  const parts = data.split("_");
  const pageId = parts[1];
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
        text: "Movie not found. Find it again.",
        show_alert: true,
      });
      return;
    }

    notionTitle = title;
    const moviesDetails = await getMoviesByNotionTitle(title);
    const seriesDetails = await getSeriesByNotionTitle(title);
    if (
      (!moviesDetails || moviesDetails.length === 0) &&
      (!seriesDetails || seriesDetails.length === 0)
    ) {
      await messenger.answerCallbackQuery(callbackQueryId, {
        text: "Movie not found. Find it again.",
        show_alert: true,
      });
      return;
    }

    genres =
      moviesDetails?.[index]?.genres ||
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

  await messenger.sendMessage(chatId, "Enter your rating:", {
    reply_markup: {
      force_reply: true,
    },
  });
  await messenger.answerCallbackQuery(callbackQueryId);
}

async function handleWatchedGameCallback(
  messenger: BotMessenger,
  callbackQueryId: string,
  chatId: number,
  data: string,
  sessionStore: SessionStore,
) {
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
        text: "Game not found. Find it again.",
        show_alert: true,
      });
      return;
    }

    const gameDetails = await getGameByNotionTitle(title);
    if (!gameDetails) {
      await messenger.answerCallbackQuery(callbackQueryId, {
        text: "Game not found. Find it again.",
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

  await messenger.sendMessage(chatId, "Rate the game from 1 to 5:", {
    reply_markup: {
      force_reply: true,
    },
  });
  await messenger.answerCallbackQuery(callbackQueryId);
}

async function handleAwaitingRating(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  userState: UserSession,
  sessionStore: SessionStore,
) {
  const rating = Number(text.trim());

  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    await messenger.sendMessage(chatId, "Rating must be between 1 and 5");
    return;
  }

  if (!userState.pageId) {
    await messenger.sendMessage(
      chatId,
      "Data expired. Find a movie again.",
      mainKeyboard,
    );
    await sessionStore.delete(chatId);
    return;
  }

  try {
    await messenger.sendMessage(chatId, "Updating Notion...");
    await updateMovieInNotion(userState.pageId, rating, userState.genres || []);
    if (userState.notionTitle) {
      await deleteMoviesByNotionTitle(userState.notionTitle);
      await deleteSeriesByNotionTitle(userState.notionTitle);
    }
    await messenger.sendMessage(chatId, "✅ Page updated in Notion!");
    await sessionStore.delete(chatId);
  } catch (error) {
    console.error("Error updating Notion:", error);
    await messenger.sendMessage(chatId, "Something went wrong updating Notion");
    await sessionStore.delete(chatId);
  }
}

async function handleAwaitingGamePlatform(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  sessionStore: SessionStore,
) {
  if (isBackButton(text)) {
    await sessionStore.delete(chatId);
    await messenger.sendMessage(chatId, "Choose an action:", mainKeyboard);
    return;
  }

  if (text !== "Playstation" && text !== "PC") {
    await messenger.sendMessage(
      chatId,
      "Choose a platform:",
      gamePlatformKeyboard,
    );
    return;
  }

  await sessionStore.set(chatId, {
    step: "AWAITING_GAME_TYPE",
    platform: text,
  });

  await messenger.sendMessage(chatId, "Choose game type:", gameTypeKeyboard);
}

async function handleAwaitingGameType(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  userState: UserSession,
  sessionStore: SessionStore,
) {
  if (!userState.platform) {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      "Choose a platform:",
      gamePlatformKeyboard,
    );
    return;
  }

  if (userState.platform !== "Playstation" && userState.platform !== "PC") {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      "Choose a platform:",
      gamePlatformKeyboard,
    );
    return;
  }

  if (isBackButton(text)) {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      "Choose a platform:",
      gamePlatformKeyboard,
    );
    return;
  }

  if (text !== "📖 Story-driven" && text !== "🎮 Gameplay-driven") {
    await messenger.sendMessage(chatId, "Choose game type:", gameTypeKeyboard);
    return;
  }

  await handleFindGame(
    messenger,
    chatId,
    sessionStore,
    userState.platform,
    text === "📖 Story-driven" ? "story" : "gameplay",
  );
}

async function handleAwaitingGameRating(
  messenger: BotMessenger,
  chatId: number,
  text: string,
  userState: UserSession,
  sessionStore: SessionStore,
) {
  const rating = Number(text.trim());

  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    await messenger.sendMessage(chatId, "Rating must be between 1 and 5");
    return;
  }

  if (!userState.pageId || !userState.notionTitle) {
    await messenger.sendMessage(
      chatId,
      "Data expired. Find a game again.",
      mainKeyboard,
    );
    await sessionStore.delete(chatId);
    return;
  }

  try {
    await messenger.sendMessage(chatId, "Updating Notion...");
    await updateGameInNotion(userState.pageId, rating, userState.genres || []);
    await deleteGamesByNotionTitle(userState.notionTitle);
    await messenger.sendMessage(
      chatId,
      "✅ Game updated in Notion!",
      mainKeyboard,
    );
    await sessionStore.delete(chatId);
  } catch (error) {
    console.error("Error updating game in Notion:", error);
    await messenger.sendMessage(
      chatId,
      "Something went wrong updating the game in Notion",
      mainKeyboard,
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
  if (userState.platform !== "Playstation" && userState.platform !== "PC") {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      "Choose a platform:",
      gamePlatformKeyboard,
    );
    return;
  }

  if (!isGameTypeButton(text)) {
    return;
  }

  await handleFindGame(
    messenger,
    chatId,
    sessionStore,
    userState.platform,
    text === "📖 Story-driven" ? "story" : "gameplay",
  );
}

async function handleBackButtonPress(
  messenger: BotMessenger,
  chatId: number,
  userState: UserSession | null,
  sessionStore: SessionStore,
) {
  if (userState?.step === "AWAITING_GAME_TYPE") {
    await sessionStore.set(chatId, {
      step: "AWAITING_GAME_PLATFORM",
    });
    await messenger.sendMessage(
      chatId,
      "Choose a platform:",
      gamePlatformKeyboard,
    );
    return;
  }

  await sessionStore.delete(chatId);
  await messenger.sendMessage(chatId, "Choose an action:", mainKeyboard);
}

async function handleFindMovie(
  messenger: BotMessenger,
  chatId: number,
  sessionStore: SessionStore,
) {
  try {
    await messenger.sendMessage(
      chatId,
      "Looking for a movie in Notion...",
      mainKeyboard,
    );

    const notionMovie = await getRandomMovieFromNotion();

    await messenger.sendMessage(
      chatId,
      `Found movie: "${notionMovie.title}". Fetching details from TMDB...`,
    );

    let moviesDetails = await getMoviesByNotionTitle(notionMovie.title);

    if (moviesDetails) {
      console.log(
        `Fetched details for "${notionMovie.title}" from Supabase cache.`,
      );
    } else {
      moviesDetails = await fetchMovieDetails(notionMovie.title);

      if (moviesDetails && moviesDetails.length > 0) {
        await saveMovies(notionMovie.title, moviesDetails);
      }
    }

    if (!moviesDetails || moviesDetails.length === 0) {
      await messenger.sendMessage(
        chatId,
        `Could not find details for "${notionMovie.title}" on TMDB. 😢`,
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

      const caption = `<b>${movieDetails.title} (${movieDetails.year})</b>\n\n${movieDetails.description}\n\n⭐️ Rating: ${movieDetails.rating.toFixed(1)}\n\n🎬 Genres: ${movieDetails.genres.join(", ")}\n\n📍 Country: ${movieDetails.country}`;
      const googleQuery = encodeURIComponent(
        `${movieDetails.title} watch online`,
      );

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "ℹ️ More info",
                url: `https://www.themoviedb.org/movie/${movieDetails.tmdb_id}`,
              },
            ],
            [
              {
                text: "✅ Watched",
                callback_data: `watched_${notionMovie.id}_${index}`,
              },
              {
                text: "🍿 Watch",
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
      "Something went wrong fetching data from Notion",
    );
  }
}

async function handleFindSeries(
  messenger: BotMessenger,
  chatId: number,
  sessionStore: SessionStore,
) {
  try {
    await messenger.sendMessage(
      chatId,
      "Looking for a series in Notion...",
      mainKeyboard,
    );

    const notionSeries = await getRandomSeriesFromNotion();

    await messenger.sendMessage(
      chatId,
      `Found series: "${notionSeries.title}". Fetching details from TMDB...`,
    );

    let seriesDetails = await getSeriesByNotionTitle(notionSeries.title);

    if (seriesDetails) {
      console.log(
        `Fetched details for "${notionSeries.title}" from Supabase cache.`,
      );
    } else {
      seriesDetails = await fetchSeriesDetails(notionSeries.title);

      if (seriesDetails && seriesDetails.length > 0) {
        await saveSeries(notionSeries.title, seriesDetails);
      }
    }

    if (!seriesDetails || seriesDetails.length === 0) {
      await messenger.sendMessage(
        chatId,
        `Could not find details for "${notionSeries.title}" on TMDB. 😢`,
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

      const caption = `<b>${series.title} (${series.year})</b>\n\n${series.description}\n\n⭐️ Rating: ${series.rating.toFixed(1)}\n\n🎬 Genres: ${series.genres.join(", ") || "N/A"}`;

      const googleQuery = encodeURIComponent(`${series.title} watch online`);

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "ℹ️ More info",
                url: `https://www.themoviedb.org/tv/${series.tmdb_id}`,
              },
            ],
            [
              {
                text: "✅ Watched",
                callback_data: `watched_${notionSeries.id}_${index}`,
              },
              {
                text: "🍿 Watch",
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
      "Something went wrong fetching series data",
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
  try {
    await messenger.sendMessage(chatId, "Looking for a game in Notion...");

    const notionGame = await getRandomGameFromNotion(
      platformChoice,
      styleChoice,
    );

    await messenger.sendMessage(
      chatId,
      `Found game: "${notionGame.title}". Fetching details from IGDB...`,
    );

    let gameDetails = await getGameByNotionTitle(notionGame.title);

    if (gameDetails) {
      console.log(
        `Fetched details for "${notionGame.title}" from Supabase cache.`,
      );
    } else {
      gameDetails = await fetchGameDetails(notionGame.title);

      if (gameDetails) {
        await saveGame(
          notionGame.title,
          notionGame.platforms.join(", "),
          gameDetails,
        );
      }
    }

    if (!gameDetails) {
      await sessionStore.delete(chatId);
      await messenger.sendMessage(
        chatId,
        `Could not find details for "${notionGame.title}" on IGDB. 😢`,
        mainKeyboard,
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
    const caption = `<b>${gameDetails.title} (${gameDetails.year})</b>\n\n${trimmedDescription}\n\n⭐ Rating: ${gameDetails.rating.toFixed(1)}\n\n🎭 Genres: ${gameDetails.genres.join(", ") || "N/A"}\n\n🕹️ Platform: ${notionGame.platforms.join(", ") || platformChoice}`;

    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Played",
              callback_data: `played_game_${notionGame.id}`,
            },
            {
              text: "ℹ️ More info",
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
      "Something went wrong fetching game data",
      mainKeyboard,
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

function isBackButton(text: string): boolean {
  return text.trim().toLowerCase() === backButtonText;
}

function isGameTypeButton(text: string): boolean {
  return text === "📖 Story-driven" || text === "🎮 Gameplay-driven";
}
