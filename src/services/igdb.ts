import { getEnvVar } from "../runtime/env.ts";

interface IgdbAuthToken {
  accessToken: string;
  expiresAt: number;
}

interface IgdbGameResponse {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  rating?: number;
  total_rating?: number;
  total_rating_count?: number;
  rating_count?: number;
  first_release_date?: number;
  url?: string;
  slug?: string;
  cover?: {
    image_id?: string;
  };
  genres?: Array<{
    name: string;
  }>;
}

export interface GameDetails {
  igdb_id: number;
  title: string;
  year: string;
  description: string;
  rating: number;
  genres: string[];
  posterUrl: string | null;
  url: string;
}

let cachedToken: IgdbAuthToken | null = null;

export async function fetchGameDetails(
  title: string,
): Promise<GameDetails | null> {
  const token = await getIgdbAccessToken();
  const clientId = getEnvVar("IGDB_CLIENT_ID") || "";
  const query = [
    `search ${JSON.stringify(title)};`,
    "fields name,summary,storyline,rating,total_rating,total_rating_count,rating_count,first_release_date,url,slug,cover.image_id,genres.name,version_parent;",
    "where version_parent = null;",
    "limit 10;",
  ].join(" ");

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`IGDB request failed with status ${response.status}`);
  }

  const data = (await response.json()) as IgdbGameResponse[];

  if (!data.length) {
    return null;
  }

  const bestMatch = pickBestGameMatch(title, data);

  if (!bestMatch) {
    return null;
  }

  return mapIgdbGame(bestMatch);
}

async function getIgdbAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const clientId = getEnvVar("IGDB_CLIENT_ID") || "";
  const clientSecret = getEnvVar("IGDB_CLIENT_SECRET") || "";
  const authUrl = new URL("https://id.twitch.tv/oauth2/token");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("client_secret", clientSecret);
  authUrl.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(authUrl, { method: "POST" });

  if (!response.ok) {
    throw new Error(`IGDB auth failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(data.expires_in - 60, 0) * 1000,
  };

  return cachedToken.accessToken;
}

function pickBestGameMatch(
  sourceTitle: string,
  candidates: IgdbGameResponse[],
): IgdbGameResponse | null {
  const normalizedSource = normalizeTitle(sourceTitle);
  const rankedCandidates = [...candidates].sort((left, right) => {
    return (
      scoreGameCandidate(normalizedSource, right) -
      scoreGameCandidate(normalizedSource, left)
    );
  });

  return rankedCandidates[0] ?? null;
}

function scoreGameCandidate(
  normalizedSource: string,
  candidate: IgdbGameResponse,
): number {
  const normalizedCandidate = normalizeTitle(candidate.name);
  const ratingScore =
    candidate.total_rating_count ?? candidate.rating_count ?? 0;
  const qualityScore = candidate.total_rating ?? candidate.rating ?? 0;

  let matchScore = 0;

  if (normalizedCandidate === normalizedSource) {
    matchScore = 10_000;
  } else if (normalizedCandidate.startsWith(normalizedSource)) {
    matchScore = 8_000;
  } else if (normalizedCandidate.includes(normalizedSource)) {
    matchScore = 6_000;
  }

  return matchScore + qualityScore * 10 + Math.min(ratingScore, 500);
}

function mapIgdbGame(game: IgdbGameResponse): GameDetails {
  const year = game.first_release_date
    ? String(new Date(game.first_release_date * 1000).getUTCFullYear())
    : "N/A";
  const genres = game.genres?.map((genre) => genre.name) ?? [];
  const description = game.summary || game.storyline || "Опис відсутній.";
  const rating = game.total_rating ?? game.rating ?? 0;

  return {
    igdb_id: game.id,
    title: game.name,
    year,
    description,
    rating,
    genres,
    posterUrl: game.cover?.image_id
      ? buildIgdbImageUrl(game.cover.image_id)
      : null,
    url: game.url || `https://www.igdb.com/games/${game.slug}`,
  };
}

function buildIgdbImageUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}
