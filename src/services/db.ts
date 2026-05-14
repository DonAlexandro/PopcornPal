import { createClient } from "npm:@supabase/supabase-js@2.103.3";
import { getEnvVar } from "../runtime/env.ts";
import type { GameDetails } from "./igdb.ts";
import type { MovieDetails } from "./tmdb.ts";

const supabaseUrl = getEnvVar("SUPA_URL") || "";
const supabaseKey = getEnvVar("SUPA_SECRET_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getMoviesByNotionTitle(
  notionTitle: string,
): Promise<MovieDetails[] | null> {
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("notion_title", notionTitle);

  if (error) {
    console.error("Error fetching movies from Supabase:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data.map((movie: any) => {
    const titleMatch = movie.title.match(/^(.*?) \(\d{4}\)$/);
    const title = titleMatch ? titleMatch[1] : movie.title;
    // In TMDB we receive original title and extract year. In the DB, we have "Title (Year)" format from bot formatting originally, but we can just map back year from the string.
    const yearMatch = movie.title.match(/\((\d{4})\)$/);
    const year = yearMatch ? yearMatch[1] : "N/A";

    return {
      tmdb_id: movie.tmdb_id,
      title: title,
      year: year,
      description: movie.description,
      rating: movie.rating,
      genres: movie.genres,
      country: movie.country,
      posterUrl: movie.image,
    };
  });
}

export async function saveMovies(notionTitle: string, movies: MovieDetails[]) {
  if (movies.length === 0) return;

  const records = movies.map((m) => ({
    tmdb_id: m.tmdb_id,
    title: `${m.title} (${m.year})`,
    notion_title: notionTitle,
    description: m.description,
    rating: m.rating,
    genres: m.genres,
    country: m.country,
    image: m.posterUrl,
  }));

  const { error } = await supabase.from("movies").insert(records);

  if (error) {
    console.error("Error saving movies to Supabase:", error);
  }
}

export async function getGameByNotionTitle(
  notionTitle: string,
): Promise<GameDetails | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("notion_title", notionTitle)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching game from Supabase:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const titleMatch = data.title.match(/^(.*?) \((.*?)\)$/);

  return {
    igdb_id: data.igdb_id,
    title: titleMatch ? titleMatch[1] : data.title,
    year: titleMatch ? titleMatch[2] : "N/A",
    description: data.description,
    rating: data.rating,
    genres: data.genres ?? [],
    posterUrl: data.image,
    url: data.url,
  };
}

export async function saveGame(
  notionTitle: string,
  notionPlatform: string,
  game: GameDetails,
) {
  const { error } = await supabase.from("games").insert({
    igdb_id: game.igdb_id,
    title: `${game.title} (${game.year})`,
    notion_title: notionTitle,
    description: game.description,
    rating: game.rating,
    genres: game.genres,
    image: game.posterUrl,
    platform: notionPlatform,
    url: game.url,
  });

  if (error) {
    console.error("Error saving game to Supabase:", error);
  }
}

export async function deleteGamesByNotionTitle(notionTitle: string) {
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("notion_title", notionTitle);

  if (error) {
    console.error("Error deleting games from Supabase:", error);
  }
}
