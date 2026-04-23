import { Client } from "npm:@notionhq/client@2.2.15";
import { getEnvVar } from "../runtime/env.ts";

export async function getRandomMovieFromNotion(): Promise<{
  id: string;
  title: string;
}> {
  const notion = new Client({ auth: getEnvVar("NOTION_API_KEY") });
  const databaseId = getEnvVar("NOTION_DATABASE_ID")!;

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

    const randomPage = pages[Math.floor(Math.random() * pages.length)] as any;

    // Find the title property (it might be named 'Name' or 'Title', we assume the property type is 'title')
    const titleProperty = Object.values(randomPage.properties).find(
      (prop: any) => prop.type === "title",
    ) as any;

    if (!titleProperty?.title?.length) {
      throw new Error("Title not found in the Notion page");
    }

    return {
      id: randomPage.id,
      title: titleProperty.title[0].plain_text,
    };
  } catch (error) {
    console.error("Error fetching data from Notion:", error);
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
