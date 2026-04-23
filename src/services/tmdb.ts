import { getEnvVar } from "../runtime/env.ts";

export interface MovieDetails {
  tmdb_id: number;
  title: string;
  year: string;
  description: string;
  rating: number;
  genres: string[];
  country: string;
  posterUrl: string | null;
}

export async function fetchMovieDetails(
  title: string,
): Promise<MovieDetails[]> {
  const apiKey = getEnvVar("TMDB_API_KEY");
  const baseUrl = "https://api.themoviedb.org/3";

  const trySearch = async (language: string): Promise<number[] | null> => {
    const searchUrl = new URL(`${baseUrl}/search/movie`);
    searchUrl.searchParams.append("query", title);
    searchUrl.searchParams.append("language", language);

    const response = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        accept: "application/json",
      },
    });

    if (!response.ok) return null;
    const data = (await response.json()) as any;
    return data.results && data.results.length > 0
      ? data.results.map((r: any) => r.id)
      : null;
  };

  // Try finding the movie with different language fallbacks
  let movieIds = await trySearch("uk-UA");
  movieIds ??= await trySearch("ru-RU");
  movieIds ??= await trySearch("en-US");

  if (!movieIds || movieIds.length === 0) {
    return []; // Movie not found
  }

  // Limit to top 5 results to avoid telegram spam
  movieIds = movieIds.slice(0, 5);

  const fetchSingleMovie = async (
    movieId: number,
  ): Promise<MovieDetails | null> => {
    // Fetch full details
    const detailsUrl = new URL(`${baseUrl}/movie/${movieId}`);
    detailsUrl.searchParams.append("language", "uk-UA"); // Prefer Ukrainian for details

    const detailsResponse = await fetch(detailsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        accept: "application/json",
      },
    });

    if (!detailsResponse.ok) return null;
    const details = (await detailsResponse.json()) as any;

    const year = details.release_date
      ? details.release_date.split("-")[0]
      : "N/A";
    const genres = details.genres ? details.genres.map((g: any) => g.name) : [];
    const country =
      details.production_countries && details.production_countries.length > 0
        ? details.production_countries.map((c: any) => c.name).join(", ")
        : "N/A";

    // TMDB image base URL
    const posterUrl = details.poster_path
      ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
      : null;

    return {
      tmdb_id: movieId,
      title: details.title,
      year,
      description: details.overview || "Опис відсутній.",
      rating: details.vote_average || 0,
      genres,
      country,
      posterUrl,
    };
  };

  const detailsPromises = movieIds.map((id) => fetchSingleMovie(id));
  const allDetails = await Promise.all(detailsPromises);

  return allDetails.filter((d): d is MovieDetails => d !== null);
}
