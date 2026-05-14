import { randomInt } from "node:crypto";
import { Client } from "npm:@notionhq/client@2.2.15";
import { getEnvVar } from "../runtime/env.ts";

export type GamePlatformChoice = "Playstation" | "PC";
export type GameStyleChoice = "story" | "gameplay";

export interface NotionGame {
  id: string;
  title: string;
  platforms: string[];
}

export async function getRandomMovieFromNotion(): Promise<{
  id: string;
  title: string;
}> {
  const notion = new Client({ auth: getEnvVar("NOTION_API_KEY") });
  const databaseId = getEnvVar("NOTION_MOVIES_DATABASE_ID")!;

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        or: [
          {
            property: "Status",
            status: {
              equals: "Backlog",
            },
          },
          {
            property: "Status",
            status: {
              equals: "Plan to watch",
            },
          },
        ],
      },
    });

    const pages = response.results;
    if (pages.length === 0) {
      throw new Error("No movies found");
    }

    const randomPage = pages[randomInt(pages.length)] as any;

    return {
      id: randomPage.id,
      title: getPageTitle(randomPage),
    };
  } catch (error) {
    console.error("Error fetching data from Notion:", error);
    throw error;
  }
}

export async function getRandomGameFromNotion(
  platformChoice: GamePlatformChoice,
  styleChoice: GameStyleChoice,
): Promise<NotionGame> {
  const notion = new Client({ auth: getEnvVar("NOTION_API_KEY") });
  const databaseId = getEnvVar("NOTION_GAMES_DATABASE_ID")!;

  const platformFilter =
    platformChoice === "Playstation"
      ? {
          property: "Platform",
          multi_select: {
            contains: "PS5",
          },
        }
      : {
          or: [
            {
              property: "Platform",
              multi_select: {
                contains: "Steam",
              },
            },
            {
              property: "Platform",
              multi_select: {
                contains: "Epic Games",
              },
            },
          ],
        };

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: "Story-driven",
            checkbox: {
              equals: styleChoice === "story",
            },
          },
          {
            or: [
              {
                property: "Status",
                status: {
                  equals: "Backlog",
                },
              },
              {
                property: "Status",
                status: {
                  equals: "Plan to play",
                },
              },
            ],
          },
          platformFilter,
        ],
      },
    });

    const pages = response.results;

    if (pages.length === 0) {
      throw new Error("No games found");
    }

    const randomPage = pages[randomInt(pages.length)] as any;

    return {
      id: randomPage.id,
      title: getPageTitle(randomPage),
      platforms: getMultiSelectNames(randomPage, "Platform"),
    };
  } catch (error) {
    console.error("Error fetching games from Notion:", error);
    throw error;
  }
}

export async function updateMovieInNotion(
  pageId: string,
  rating: number,
  genres: string[],
) {
  const notion = new Client({ auth: getEnvVar("NOTION_API_KEY") });

  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        Status: {
          status: {
            name: "Watched",
          },
        },
        Rating: {
          number: rating,
        },
        Genre: {
          multi_select: genres.map((g) => ({ name: g })),
        },
      },
    });
  } catch (error) {
    console.error("Error updating Notion page:", error);
    throw error;
  }
}

export async function updateGameInNotion(
  pageId: string,
  rating: number,
  genres: string[],
) {
  const notion = new Client({ auth: getEnvVar("NOTION_API_KEY") });

  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        Status: {
          status: {
            name: "Finished",
          },
        },
        Rating: {
          number: rating,
        },
        Genre: {
          multi_select: genres.map((genre) => ({ name: genre })),
        },
      },
    });
  } catch (error) {
    console.error("Error updating game page in Notion:", error);
    throw error;
  }
}

function getPageTitle(page: any): string {
  const titleProperty = Object.values(page.properties).find(
    (prop: any) => prop.type === "title",
  ) as any;

  if (!titleProperty?.title?.length) {
    throw new Error("Title not found in the Notion page");
  }

  return titleProperty.title.map((item: any) => item.plain_text).join("");
}

function getMultiSelectNames(page: any, propertyName: string): string[] {
  const property = page.properties[propertyName];

  if (property?.type !== "multi_select") {
    return [];
  }

  return property.multi_select.map((item: any) => item.name);
}
