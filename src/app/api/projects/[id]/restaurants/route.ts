import { NextResponse } from "next/server";
import {
  getRestaurantsByProject,
  createRestaurant,
} from "@/lib/store";
import { Restaurant } from "@/lib/types";
import { generateId, slugify } from "@/lib/utils";
import { createLogger } from "@/lib/logger";
import { CreateRestaurantSchema } from "@/lib/validation";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:Restaurants");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;
    const restaurants = await getRestaurantsByProject(id);
    return NextResponse.json(restaurants);
  } catch (error) {
    log.error("GET restaurants failed", {}, error);
    return NextResponse.json({ error: "Failed to fetch restaurants" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;

    const raw = await request.json();
    const parsed = CreateRestaurantSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, slug, description, logo_url, website_url } = parsed.data;

    const restaurant: Restaurant = {
      id: generateId(),
      project_id: id,
      name: name.trim(),
      slug: slug?.trim() || slugify(name.trim()),
      description: description?.trim() || null,
      logo_url: logo_url?.trim() || null,
      website_url: website_url?.trim() || null,
      created_at: new Date().toISOString(),
    };

    const created = await createRestaurant(restaurant);
    log.info("Restaurant created", { id: created.id, name: created.name });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    log.error("POST restaurant failed", {}, error);
    return NextResponse.json({ error: "Failed to create restaurant" }, { status: 500 });
  }
}
