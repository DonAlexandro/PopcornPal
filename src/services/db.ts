import { createClient } from "@supabase/supabase-js";
import type { MovieDetails } from "./tmdb";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

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

  return data.map((movie) => {
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
