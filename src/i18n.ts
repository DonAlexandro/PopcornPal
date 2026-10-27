import i18next from "i18next";
import type { Language } from "./language.ts";

const resources = {
  en: {
    translation: {
      "menu.movie": "🎬 Find a Movie",
      "menu.series": "📺 Find a Series",
      "menu.game": "🎮 Find a Game",
      "menu.settings": "⚙️ Settings",
      "menu.back": "« Back",
      "menu.playstation": "PlayStation",
      "menu.pc": "PC",
      "menu.story": "📖 Story-driven",
      "menu.gameplay": "🎮 Gameplay-driven",
      "menu.english": "🇬🇧 English",
      "menu.ukrainian": "🇺🇦 Українська",
      "message.start":
        'Hi! Press "{{movie}}", "{{series}}", "{{game}}", or "{{settings}}" to get a random recommendation or change language.',
      "message.choose_action": "Choose an action:",
      "message.choose_platform": "Choose a platform:",
      "message.choose_game_type": "Choose game type:",
      "message.select_language": "Choose a language:",
      "message.language_saved": "Language changed to English.",
      "message.language_save_failed":
        "Could not save your language preference. Please try again.",
      "message.language_load_failed":
        "Temporarily couldn't load your profile settings. Please try again in a moment.",
      "message.settings_private_only":
        "Language settings are available in private chats. Open a private chat with me to change the language.",
      "message.enter_rating": "Enter your rating:",
      "message.game_rating": "Rate the game from 1 to 5:",
      "message.invalid_rating": "Rating must be between 1 and 5.",
      "message.expired_movie": "Data expired. Find a movie again.",
      "message.expired_game": "Data expired. Find a game again.",
      "message.updating_notion": "Updating Notion...",
      "message.movie_updated": "✅ Page updated in Notion!",
      "message.game_updated": "✅ Game updated in Notion!",
      "message.movie_update_failed": "Something went wrong updating Notion.",
      "message.game_update_failed":
        "Something went wrong updating the game in Notion.",
      "message.finding_movie": "Looking for a movie in Notion...",
      "message.found_movie":
        'Found movie: "{{title}}". Fetching details from TMDB...',
      "message.movie_not_found":
        'Could not find details for "{{title}}" on TMDB. 😢',
      "message.movie_fetch_failed":
        "Something went wrong fetching data from Notion.",
      "message.finding_series": "Looking for a series in Notion...",
      "message.found_series":
        'Found series: "{{title}}". Fetching details from TMDB...',
      "message.series_not_found":
        'Could not find details for "{{title}}" on TMDB. 😢',
      "message.series_fetch_failed":
        "Something went wrong fetching series data.",
      "message.finding_game": "Looking for a game in Notion...",
      "message.found_game":
        'Found game: "{{title}}". Fetching details from IGDB...',
      "message.game_not_found":
        'Could not find details for "{{title}}" on IGDB. 😢',
      "message.game_fetch_failed": "Something went wrong fetching game data.",
      "message.movie_callback_not_found": "Movie not found. Find it again.",
      "message.game_callback_not_found": "Game not found. Find it again.",
      "caption.rating": "Rating",
      "caption.genres": "Genres",
      "caption.country": "Country",
      "caption.platform": "Platform",
      "caption.not_available": "N/A",
      "button.more_info": "ℹ️ More info",
      "button.watched": "✅ Watched",
      "button.watch": "🍿 Watch",
      "button.played": "✅ Played",
    },
  },
  uk: {
    translation: {
      "menu.movie": "🎬 Знайти кіно",
      "menu.series": "📺 Знайти серіал",
      "menu.game": "🎮 Знайти гру",
      "menu.settings": "⚙️ Налаштування",
      "menu.back": "« Назад",
      "menu.playstation": "PlayStation",
      "menu.pc": "ПК",
      "menu.story": "📖 Сюжетна гра",
      "menu.gameplay": "🎮 Геймплейна гра",
      "menu.english": "🇬🇧 English",
      "menu.ukrainian": "🇺🇦 Українська",
      "message.start":
        'Вітаю! Натисніть "{{movie}}", "{{series}}" або "{{game}}", щоб отримати випадкову рекомендацію, чи "{{settings}}", щоб змінити мову.',
      "message.choose_action": "Оберіть дію:",
      "message.choose_platform": "Оберіть платформу:",
      "message.choose_game_type": "Оберіть тип гри:",
      "message.select_language": "Оберіть мову:",
      "message.language_saved": "Мову змінено на українську.",
      "message.language_save_failed":
        "Не вдалося зберегти налаштування мови. Спробуйте ще раз.",
      "message.language_load_failed":
        "Тимчасово не вдалося завантажити налаштування профілю. Будь ласка, спробуйте ще раз трохи пізніше.",
      "message.settings_private_only":
        "Змінити мову можна лише в приватному чаті. Відкрийте приватний чат зі мною, щоб змінити мову.",
      "message.enter_rating": "Введіть свою оцінку:",
      "message.game_rating": "Оцініть гру від 1 до 5:",
      "message.invalid_rating": "Оцінка має бути від 1 до 5.",
      "message.expired_movie": "Дані застаріли. Знайдіть фільм ще раз.",
      "message.expired_game": "Дані застаріли. Знайдіть гру ще раз.",
      "message.updating_notion": "Оновлюю Notion...",
      "message.movie_updated": "✅ Сторінку оновлено в Notion!",
      "message.game_updated": "✅ Гру оновлено в Notion!",
      "message.movie_update_failed": "Не вдалося оновити Notion.",
      "message.game_update_failed": "Не вдалося оновити гру в Notion.",
      "message.finding_movie": "Шукаю фільм у Notion...",
      "message.found_movie":
        'Знайдено фільм: "{{title}}". Отримую дані з TMDB...',
      "message.movie_not_found":
        'Не вдалося знайти дані про "{{title}}" у TMDB. 😢',
      "message.movie_fetch_failed":
        "Сталася помилка під час отримання даних із Notion.",
      "message.finding_series": "Шукаю серіал у Notion...",
      "message.found_series":
        'Знайдено серіал: "{{title}}". Отримую дані з TMDB...',
      "message.series_not_found":
        'Не вдалося знайти дані про "{{title}}" у TMDB. 😢',
      "message.series_fetch_failed":
        "Сталася помилка під час отримання даних про серіал.",
      "message.finding_game": "Шукаю гру в Notion...",
      "message.found_game": 'Знайдено гру: "{{title}}". Отримую дані з IGDB...',
      "message.game_not_found":
        'Не вдалося знайти дані про "{{title}}" в IGDB. 😢',
      "message.game_fetch_failed":
        "Сталася помилка під час отримання даних про гру.",
      "message.movie_callback_not_found":
        "Фільм не знайдено. Знайдіть його ще раз.",
      "message.game_callback_not_found": "Гру не знайдено. Знайдіть її ще раз.",
      "caption.rating": "Оцінка",
      "caption.genres": "Жанри",
      "caption.country": "Країна",
      "caption.platform": "Платформа",
      "caption.not_available": "Н/Д",
      "button.more_info": "ℹ️ Детальніше",
      "button.watched": "✅ Переглянуто",
      "button.watch": "🍿 Дивитися",
      "button.played": "✅ Зіграно",
    },
  },
} as const;

await i18next.init({
  resources,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function translate(
  language: Language,
  key: string,
  values?: Record<string, string>,
): string {
  return i18next.getFixedT(language)(key, values);
}
