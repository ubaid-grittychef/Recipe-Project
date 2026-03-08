import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:AiFillProject");

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { name, niche } = body as { name?: string; niche?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Site name is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 });
  }

  const client = new OpenAI({ apiKey });

  const prompt = `You are helping configure a recipe website called "${name.trim()}".
${niche ? `The site niche is: ${niche}` : ""}

Generate professional marketing copy and configuration for this site. Return ONLY valid JSON with these exact fields:
{
  "niche": "1-2 sentence description of what the site covers (e.g. Popular restaurant copycat recipes for home cooks who love dining out)",
  "restaurant_category": "The type of restaurants or cuisine this site focuses on (e.g. Fast food chains, Italian restaurants, Asian cuisine)",
  "tagline": "A short catchy tagline, max 10 words (e.g. Restaurant-quality recipes made easy at home)",
  "meta_description": "SEO meta description, 140-160 characters exactly, describing the site for Google",
  "author_name": "A realistic chef/food blogger persona name suitable for the niche (e.g. Chef Sarah Mitchell)",
  "target_audience": "Who visits this site, 1 sentence (e.g. Home cooks aged 25-45 who love dining out and want to recreate restaurant dishes)",
  "site_category": "2-4 keyword phrase for the site category (e.g. restaurant copycat recipes)"
}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(raw);

    log.info("AI fill generated", { name, fields: Object.keys(data) });
    return NextResponse.json(data);
  } catch (err) {
    log.error("AI fill failed", { name }, err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
