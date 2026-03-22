import { NextResponse } from "next/server";
import { getRestaurant, updateRestaurant } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";
import OpenAI from "openai";

const log = createLogger("API:RestaurantBio");

/**
 * POST /api/projects/[id]/restaurants/[rid]/generate-bio
 *
 * Uses OpenAI to generate a short SEO-friendly description for the restaurant
 * based on its name and the project's niche, then saves and returns it.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const { id, rid } = await params;

  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  const { project } = auth;

  const restaurant = await getRestaurant(rid);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const client = new OpenAI({ apiKey });

  const prompt = `Write a 2-3 sentence SEO-friendly description for the restaurant "${restaurant.name}" for a ${project.niche} recipe website targeting ${project.target_audience || "food lovers"}.

Focus on: what ${restaurant.name} is known for, their signature dishes or cuisine style, and why fans love recreating their recipes at home.
Keep it factual, engaging, and under 200 characters. Return only the description text, no quotes, no labels, no preamble.`;

  try {
    log.info("Generating AI bio for restaurant", { projectId: id, restaurantId: rid, name: restaurant.name });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 200,
    });

    const bio = response.choices[0]?.message?.content?.trim();
    if (!bio) {
      return NextResponse.json({ error: "No response from OpenAI" }, { status: 500 });
    }

    const updated = await updateRestaurant(rid, { description: bio });

    log.info("Restaurant bio generated and saved", { rid, name: restaurant.name });
    return NextResponse.json({ description: bio, restaurant: updated });
  } catch (error) {
    log.error("Failed to generate restaurant bio", { rid }, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate bio" },
      { status: 500 }
    );
  }
}
