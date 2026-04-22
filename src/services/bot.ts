import TelegramBot from "node-telegram-bot-api";
import { getRandomMovieFromNotion, updateMovieInNotion } from "./notion";
import { fetchMovieDetails } from "./tmdb";
import { getMoviesByNotionTitle, saveMovies } from "./db";

interface UserState {
  step: "VIEWING_OPTIONS" | "AWAITING_RATING";
  pageId: string;
  options?: string[][]; // Genres mapped by index
  genres?: string[];
}
const userStates = new Map<number, UserState>();

export function setupBot(token: string) {
  const bot = new TelegramBot(token, { polling: true });

  const keyboard = {
    reply_markup: {
      keyboard: [[{ text: "Знайти кіно" }]],
      resize_keyboard: true,
      persistent: true,
    },
  };

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      'Привіт! Натисни кнопку "Знайти кіно", щоб отримати випадковий фільм.',
      keyboard,
    );
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    const userState = userStates.get(chatId);

    if (userState?.step === "AWAITING_RATING") {
      await handleAwaitingRating(bot, chatId, text, userState);
      return;
    }

    if (text !== "Знайти кіно") {
      return;
    }

    await handleFindMovie(bot, chatId, keyboard);
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    if (query.data?.startsWith("watched_")) {
      const parts = query.data.split("_");
      const pageId = parts[1];
      const index = parts[2] ? Number.parseInt(parts[2], 10) : 0;

      const userState = userStates.get(chatId);
      if (!userState || userState.pageId !== pageId || !userState.options) {
        await bot.answerCallbackQuery(query.id, {
          text: "Дані застаріли. Знайдіть фільм знову.",
          show_alert: true,
        });
        return;
      }

      const genres = userState.options[index] || [];
      userStates.set(chatId, { step: "AWAITING_RATING", pageId, genres });

      await bot.sendMessage(chatId, "Введи свою оцінку:", {
        reply_markup: {
          force_reply: true,
        },
      });
      await bot.answerCallbackQuery(query.id);
    }
  });

  return bot;
}

async function handleAwaitingRating(
  bot: TelegramBot,
  chatId: number,
  text: string,
  userState: UserState,
) {
  const rating = Number(text.trim());

  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    await bot.sendMessage(
      chatId,
      "Оцінка не може бути нижчою за 1 чи більшою за 5",
    );
    return; // stay in the state
  }

  try {
    await bot.sendMessage(chatId, "Оновлюю Notion...");
    await updateMovieInNotion(userState.pageId, rating, userState.genres || []);
    await bot.sendMessage(chatId, "✅ Сторінку оновлено в Notion!");
    userStates.delete(chatId);
  } catch (error) {
    console.error("Error updating Notion:", error);
    await bot.sendMessage(
      chatId,
      "Щось пішло не так при оновленні сторінки в Notion",
    );
    userStates.delete(chatId);
  }
}

async function handleFindMovie(
  bot: TelegramBot,
  chatId: number,
  keyboard: any,
) {
  try {
    await bot.sendMessage(chatId, "Шукаю фільм у Notion...", keyboard);

    const notionMovie = await getRandomMovieFromNotion();

    await bot.sendMessage(
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
      await bot.sendMessage(
        chatId,
        `Не вдалося знайти деталі для фільму "${notionMovie.title}" на TMDB. 😢`,
      );
      return;
    }

    userStates.set(chatId, {
      step: "VIEWING_OPTIONS",
      pageId: notionMovie.id,
      options: moviesDetails.map((m) => m.genres),
    });

    for (let i = 0; i < moviesDetails.length; i++) {
      const movieDetails = moviesDetails[i];
      if (!movieDetails) continue;
      const caption = `<b>${movieDetails.title} (${movieDetails.year})</b>\n\n${movieDetails.description}\n\n⭐️ Rating: ${movieDetails.rating.toFixed(1)}\n\n🎬 Genres: ${movieDetails.genres.join(", ")}\n\n📍 Country: ${movieDetails.country}`;

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Переглянув",
                callback_data: `watched_${notionMovie.id}_${i}`,
              },
            ],
          ],
        },
      };

      if (movieDetails.posterUrl) {
        await bot.sendPhoto(chatId, movieDetails.posterUrl, {
          parse_mode: "HTML",
          caption,
          ...inlineKeyboard,
        });
      } else {
        await bot.sendMessage(chatId, caption, {
          parse_mode: "HTML",
          ...inlineKeyboard,
        });
      }
    }
  } catch (error) {
    console.error("Error handling Знайти кіно:", error);
    bot.sendMessage(chatId, "Щось пішло не так при отриманні даних з Notion");
  }
}
