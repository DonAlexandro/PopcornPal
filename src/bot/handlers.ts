import type { SessionStore, UserSession } from "./session-store.ts";
import type { BotMessenger } from "./messenger.ts";
import {
  getRandomMovieFromNotion,
  updateMovieInNotion,
} from "../services/notion.ts";
import { fetchMovieDetails } from "../services/tmdb.ts";
import { getMoviesByNotionTitle, saveMovies } from "../services/db.ts";

export const mainKeyboard = {
  reply_markup: {
    keyboard: [[{ text: "Знайти кіно" }]],
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
    'Привіт! Натисни кнопку "Знайти кіно", щоб отримати випадковий фільм.',
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

  if (text !== "Знайти кіно") {
    return;
  }

  await handleFindMovie(messenger, chatId, sessionStore);
}

export async function handleCallbackQuery(
  messenger: BotMessenger,
  callbackQueryId: string,
  chatId: number,
  data: string,
  sessionStore: SessionStore,
) {
  if (!data.startsWith("watched_")) {
    return;
  }

  const parts = data.split("_");
  const pageId = parts[1];
  const index = parts[2] ? Number.parseInt(parts[2], 10) : 0;
  const userState = await sessionStore.get(chatId);

  if (!userState?.options || userState.pageId !== pageId) {
    await messenger.answerCallbackQuery(callbackQueryId, {
      text: "Дані застаріли. Знайдіть фільм знову.",
      show_alert: true,
    });
    return;
  }

  const genres = userState.options[index] || [];
  await sessionStore.set(chatId, {
    step: "AWAITING_RATING",
    pageId,
    genres,
  });

  await messenger.sendMessage(chatId, "Введи свою оцінку:", {
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
    await messenger.sendMessage(
      chatId,
      "Оцінка не може бути нижчою за 1 чи більшою за 5",
    );
    return;
  }

  try {
    await messenger.sendMessage(chatId, "Оновлюю Notion...");
    await updateMovieInNotion(userState.pageId, rating, userState.genres || []);
    await messenger.sendMessage(chatId, "✅ Сторінку оновлено в Notion!");
    await sessionStore.delete(chatId);
  } catch (error) {
    console.error("Error updating Notion:", error);
    await messenger.sendMessage(
      chatId,
      "Щось пішло не так при оновленні сторінки в Notion",
    );
    await sessionStore.delete(chatId);
  }
}

async function handleFindMovie(
  messenger: BotMessenger,
  chatId: number,
  sessionStore: SessionStore,
) {
  try {
    await messenger.sendMessage(
      chatId,
      "Шукаю фільм у Notion...",
      mainKeyboard,
    );

    const notionMovie = await getRandomMovieFromNotion();

    await messenger.sendMessage(
      chatId,
      `Знайдено фільм: "${notionMovie.title}". Шукаю деталі на TMDB...`,
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
        `Не вдалося знайти деталі для фільму "${notionMovie.title}" на TMDB. 😢`,
      );
      return;
    }

    await sessionStore.set(chatId, {
      step: "VIEWING_OPTIONS",
      pageId: notionMovie.id,
      options: moviesDetails.map((movie) => movie.genres),
    });

    for (let index = 0; index < moviesDetails.length; index++) {
      const movieDetails = moviesDetails[index];
      if (!movieDetails) {
        continue;
      }

      const caption = `<b>${movieDetails.title} (${movieDetails.year})</b>\n\n${movieDetails.description}\n\n⭐️ Rating: ${movieDetails.rating.toFixed(1)}\n\n🎬 Genres: ${movieDetails.genres.join(", ")}\n\n📍 Country: ${movieDetails.country}`;

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Переглянув",
                callback_data: `watched_${notionMovie.id}_${index}`,
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
    console.error("Error handling Знайти кіно:", error);
    await messenger.sendMessage(
      chatId,
      "Щось пішло не так при отриманні даних з Notion",
    );
  }
}
