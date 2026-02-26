import { createLogger } from "./logger";

const log = createLogger("Images");

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
  alt: string;
  photographer: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

function getPexelsKey(): string | null {
  return process.env.PEXELS_API_KEY || null;
}

export async function fetchRecipeImage(
  searchTerm: string
): Promise<string | null> {
  const apiKey = getPexelsKey();
  if (!apiKey) {
    log.warn("PEXELS_API_KEY not set — skipping image fetch", { searchTerm });
    return null;
  }

  try {
    const query = encodeURIComponent(searchTerm);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    );

    if (!res.ok) {
      log.error("Pexels API error", {
        status: res.status,
        searchTerm,
      });
      return null;
    }

    const data: PexelsResponse = await res.json();

    if (data.photos.length === 0) {
      log.warn("No images found on Pexels", { searchTerm });
      const fallbackQuery = encodeURIComponent(
        searchTerm.split(" ").slice(0, 3).join(" ") + " food"
      );
      const fallbackRes = await fetch(
        `https://api.pexels.com/v1/search?query=${fallbackQuery}&per_page=3&orientation=landscape`,
        { headers: { Authorization: apiKey } }
      );

      if (fallbackRes.ok) {
        const fallbackData: PexelsResponse = await fallbackRes.json();
        if (fallbackData.photos.length > 0) {
          const photo = fallbackData.photos[0];
          log.info("Image found via fallback search", {
            searchTerm,
            fallbackQuery: decodeURIComponent(fallbackQuery),
            photoId: photo.id,
          });
          return photo.src.large;
        }
      }

      return null;
    }

    const photo = data.photos[0];
    log.info("Image found", {
      searchTerm,
      photoId: photo.id,
      photographer: photo.photographer,
    });

    return photo.src.large;
  } catch (err) {
    log.error("Image fetch failed", {
      searchTerm,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
