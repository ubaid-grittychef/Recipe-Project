import { NextResponse } from "next/server";
import {
  getRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "@/lib/store";
import { slugify } from "@/lib/utils";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:Restaurant");

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  try {
    const { id, rid } = await params;
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;
    const restaurant = await getRestaurant(rid);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const body = await request.json() as {
      name?: string;
      slug?: string;
      description?: string | null;
      logo_url?: string | null;
      website_url?: string | null;
    };

    const updates: Parameters<typeof updateRestaurant>[1] = {};
    if (body.name !== undefined) {
      updates.name = body.name.trim();
      // Auto-regenerate slug if name changed and no explicit slug provided
      updates.slug = body.slug?.trim() || slugify(body.name.trim());
    }
    if (body.slug !== undefined) updates.slug = body.slug.trim() || slugify(restaurant.name);
    if ("description" in body) updates.description = body.description?.trim() || null;
    if ("logo_url" in body) updates.logo_url = body.logo_url?.trim() || null;
    if ("website_url" in body) updates.website_url = body.website_url?.trim() || null;

    const updated = await updateRestaurant(rid, updates);
    if (!updated) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }
    log.info("Restaurant updated", { id: rid });
    return NextResponse.json(updated);
  } catch (error) {
    log.error("PUT restaurant failed", {}, error);
    return NextResponse.json({ error: "Failed to update restaurant" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  try {
    const { id, rid } = await params;
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;
    const restaurant = await getRestaurant(rid);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    await deleteRestaurant(rid);
    log.info("Restaurant deleted", { id: rid });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("DELETE restaurant failed", {}, error);
    return NextResponse.json({ error: "Failed to delete restaurant" }, { status: 500 });
  }
}
