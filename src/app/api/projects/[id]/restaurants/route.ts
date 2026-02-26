import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import {
  getRestaurantsByProject,
  createRestaurant,
} from "@/lib/store";
import { Restaurant } from "@/lib/types";
import { generateId, slugify } from "@/lib/utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Restaurants");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
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
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json() as Partial<Restaurant>;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const restaurant: Restaurant = {
      id: generateId(),
      project_id: id,
      name: body.name.trim(),
      slug: body.slug?.trim() || slugify(body.name.trim()),
      description: body.description?.trim() || null,
      logo_url: body.logo_url?.trim() || null,
      website_url: body.website_url?.trim() || null,
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
