import { generateRecipe } from "./openai";
import { fetchPendingKeywords, markKeywordDone } from "./sheets";
import {
  getProject,
  updateProject,
  createRecipe,
  createKeywordLog,
  createGenerationLog,
  updateGenerationLog,
  getRecipeByKeyword,
  getBuiltInKeywords,
  updateBuiltInKeyword,
  findOrCreateRestaurant,
  findOrCreateCategory,
} from "./store";
import { publishRecipeToSite } from "./site-publisher";
import { fetchRecipeImage } from "./images";
import { Recipe, KeywordLog, GenerationLog } from "./types";
import { generateId, slugify } from "./utils";
import { createLogger } from "./logger";

const log = createLogger("Generator");

// In-process guard against concurrent runs on the same project.
// Works for persistent Node.js servers and dev mode.
// On stateless serverless, each invocation is isolated — guard is best-effort.
const activeGenerations = new Set<string>();

export async function runGenerationForProject(projectId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  // Concurrent generation guard
  if (activeGenerations.has(projectId)) {
    log.warn("Generation already running for project — skipping duplicate run", { projectId });
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  activeGenerations.add(projectId);

  try {
    return await _runGeneration(projectId);
  } finally {
    activeGenerations.delete(projectId);
  }
}

async function _runGeneration(projectId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const project = await getProject(projectId);
  if (!project) {
    log.error("Project not found", { projectId });
    throw new Error(`Project not found: ${projectId}`);
  }

  log.info("Starting generation run", {
    project: project.name,
    id: projectId,
    recipesPerDay: project.recipes_per_day,
  });

  const genLog: GenerationLog = {
    id: generateId(),
    project_id: projectId,
    started_at: new Date().toISOString(),
    completed_at: null,
    keywords_processed: 0,
    keywords_succeeded: 0,
    keywords_failed: 0,
    status: "running",
  };
  await createGenerationLog(genLog);

  let succeeded = 0;
  let failed = 0;
  let autoPublished = 0;

  // Unified keyword shape for both Google Sheets and built-in queue paths
  type PendingKw = {
    keyword: string;
    restaurant: string | null;
    row?: number;       // Google Sheets path
    builtInId?: string; // Built-in queue path
  };

  try {
    let keywords: PendingKw[];
    let totalPending: number;

    if (!project.sheet_url) {
      // --- Built-in queue path ---
      const all = await getBuiltInKeywords(projectId, "pending");
      totalPending = all.length;
      keywords = all.slice(0, project.recipes_per_day).map((k) => ({
        keyword: k.keyword,
        restaurant: k.restaurant_name,
        builtInId: k.id,
      }));
    } else {
      // --- Google Sheets path ---
      const result = await fetchPendingKeywords(
        project.sheet_url,
        project.sheet_keyword_column,
        project.sheet_restaurant_column,
        project.sheet_status_column,
        project.recipes_per_day
      );
      keywords = result.keywords;
      totalPending = result.totalPending;
    }

    log.info("Fetched pending keywords", {
      project: project.name,
      batch: keywords.length,
      totalPending,
      source: project.sheet_url ? "sheets" : "builtin",
    });

    if (keywords.length === 0) {
      log.info("No pending keywords found", { project: project.name });
      if (project.auto_pause_on_empty) {
        await updateProject(projectId, {
          status: "paused",
          keywords_remaining: 0,
        });
        log.info("Auto-paused project (no keywords)", { project: project.name });
      }
      await updateGenerationLog(genLog.id, {
        completed_at: new Date().toISOString(),
        keywords_processed: 0,
        status: "completed",
      });
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    for (const kw of keywords) {
      log.info("Processing keyword", {
        keyword: kw.keyword,
        restaurant: kw.restaurant,
        source: kw.builtInId ? "builtin" : "sheets",
      });

      try {
        // Skip duplicate keywords — if a recipe for this keyword already exists in the
        // factory DB, mark it done and move on without calling OpenAI.
        const existingRecipe = await getRecipeByKeyword(projectId, kw.keyword);
        if (existingRecipe) {
          log.info("Skipping duplicate keyword — recipe already exists", {
            keyword: kw.keyword,
            existingTitle: existingRecipe.title,
          });
          if (kw.builtInId) {
            await updateBuiltInKeyword(kw.builtInId, { status: "done", processed_at: new Date().toISOString() });
          } else {
            await markKeywordDone(project.sheet_url!, project.sheet_status_column, kw.row!, "done");
          }
          const kwLog: KeywordLog = {
            id: generateId(),
            project_id: projectId,
            keyword: kw.keyword,
            restaurant_name: kw.restaurant || null,
            status: "done",
            error_reason: `Duplicate — recipe "${existingRecipe.title}" already exists`,
            processed_at: new Date().toISOString(),
          };
          await createKeywordLog(kwLog);
          succeeded++;
          continue;
        }

        const generated = await generateRecipe(
          kw.keyword,
          kw.restaurant || null,
          project.niche,
          project.content_tone,
          project.site_category,
          project.target_audience,
          project.prompt_overrides
        );

        // BUG 10 FIX: include variations in word count
        const wordCount =
          generated.intro_content.split(/\s+/).length +
          generated.description.split(/\s+/).length +
          generated.instructions.join(" ").split(/\s+/).length +
          generated.tips.join(" ").split(/\s+/).length +
          generated.faqs.reduce((n, f) => n + f.answer.split(/\s+/).length, 0) +
          generated.variations.join(" ").split(/\s+/).length;

        const publishedAt = new Date().toISOString();

        // Auto-link restaurant: find or create a Restaurant CMS record from the keyword's restaurant name
        let restaurantId: string | null = null;
        if (kw.restaurant) {
          try {
            const restaurant = await findOrCreateRestaurant(projectId, kw.restaurant);
            restaurantId = restaurant.id;
          } catch (rErr) {
            log.warn("Failed to find/create restaurant record", { name: kw.restaurant }, rErr);
          }
        }

        // Auto-link category: find or create a Category record from the AI-generated category
        let categoryId: string | null = null;
        if (generated.category) {
          try {
            const category = await findOrCreateCategory(projectId, generated.category);
            categoryId = category.id;
          } catch (cErr) {
            log.warn("Failed to find/create category record", { name: generated.category }, cErr);
          }
        }

        // Build a unique slug — append short ID suffix if title is duplicated
        let slug = slugify(generated.title);
        let recipe: Recipe = {
          id: generateId(),
          project_id: projectId,
          keyword: kw.keyword,
          restaurant_name: kw.restaurant || null,
          restaurant_id: restaurantId,
          category_id: categoryId,
          title: generated.title,
          slug,
          description: generated.description,
          intro_content: generated.intro_content,
          ingredients: generated.ingredients,
          instructions: generated.instructions,
          prep_time: generated.prep_time,
          cook_time: generated.cook_time,
          total_time: generated.total_time,
          servings: generated.servings,
          difficulty: generated.difficulty,
          nutrition: generated.nutrition,
          tips: generated.tips,
          variations: generated.variations,
          faqs: generated.faqs,
          rating: generated.rating,
          seo_title: generated.seo_title,
          seo_description: generated.seo_description,
          focus_keywords: generated.focus_keywords,
          image_search_term: generated.image_search_term,
          image_url: await fetchRecipeImage(generated.image_search_term),
          word_count: wordCount,
          category: generated.category || null,
          status: "draft",
          created_at: new Date().toISOString(),
          published_at: null,
        };

        // Slug collision fix: if unique constraint fires (code 23505), retry with a suffix
        try {
          await createRecipe(recipe);
        } catch (insertErr) {
          const isUniqueViolation =
            insertErr instanceof Error &&
            (insertErr.message.includes("23505") ||
              insertErr.message.toLowerCase().includes("unique"));
          if (isUniqueViolation) {
            slug = `${slug}-${recipe.id.slice(0, 6)}`;
            recipe = { ...recipe, slug };
            await createRecipe(recipe);
            log.warn("Slug collision resolved with suffix", { title: recipe.title, slug });
          } else {
            throw insertErr;
          }
        }

        log.info("Recipe created as draft", { title: recipe.title, slug: recipe.slug });

        // BUG 3 FIX: auto-publish to site Supabase if credentials are configured.
        // Runs after the factory DB write so a site publish failure never loses the draft.
        if (project.site_supabase_url && project.site_supabase_service_key) {
          try {
            await publishRecipeToSite(projectId, {
              ...recipe,
              status: "published",
              published_at: publishedAt,
            });
            autoPublished++;
            log.info("Recipe auto-published to site", { title: recipe.title });
          } catch (pubErr) {
            log.warn("Auto-publish to site failed — recipe saved as draft in factory DB", {
              title: recipe.title,
            }, pubErr);
          }
        }

        if (kw.builtInId) {
          await updateBuiltInKeyword(kw.builtInId, { status: "done", processed_at: new Date().toISOString() });
        } else {
          await markKeywordDone(
            project.sheet_url!,
            project.sheet_status_column,
            kw.row!,
            "done"
          );
        }

        const kwLog: KeywordLog = {
          id: generateId(),
          project_id: projectId,
          keyword: kw.keyword,
          restaurant_name: kw.restaurant || null,
          status: "done",
          error_reason: null,
          processed_at: new Date().toISOString(),
        };
        await createKeywordLog(kwLog);

        succeeded++;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";

        log.error("Keyword generation failed", {
          keyword: kw.keyword,
        }, error);

        try {
          if (kw.builtInId) {
            await updateBuiltInKeyword(kw.builtInId, { status: "failed", error_reason: errorMsg, processed_at: new Date().toISOString() });
          } else {
            await markKeywordDone(
              project.sheet_url!,
              project.sheet_status_column,
              kw.row!,
              "failed",
              errorMsg
            );
          }
        } catch (markErr) {
          log.error("Failed to mark keyword as failed", {
            keyword: kw.keyword,
          }, markErr);
        }

        const kwLog: KeywordLog = {
          id: generateId(),
          project_id: projectId,
          keyword: kw.keyword,
          restaurant_name: kw.restaurant || null,
          status: "failed",
          error_reason: errorMsg,
          processed_at: new Date().toISOString(),
        };
        await createKeywordLog(kwLog);

        failed++;
      }
    }

    const totalProcessed = succeeded + failed;

    const freshProject = await getProject(projectId);
    const currentFailed = freshProject?.keywords_failed ?? project.keywords_failed;
    const currentPublished = freshProject?.recipes_published ?? project.recipes_published;

    // BUG 4 FIX: subtract the full batch (keywords.length), not just succeeded.
    // Both succeeded AND failed keywords are removed from "pending".
    const remainingInSheet = Math.max(0, totalPending - keywords.length);

    await updateProject(projectId, {
      keywords_remaining: remainingInSheet,
      keywords_failed: currentFailed + failed,
      // recipes_published counter: increment by how many were auto-published to site
      recipes_published: currentPublished + autoPublished,
      last_generation_at: new Date().toISOString(),
    });

    await updateGenerationLog(genLog.id, {
      completed_at: new Date().toISOString(),
      keywords_processed: totalProcessed,
      keywords_succeeded: succeeded,
      keywords_failed: failed,
      status: "completed",
    });

    log.info("Generation run completed", {
      project: project.name,
      processed: totalProcessed,
      succeeded,
      failed,
      autoPublished,
    });

    return { processed: totalProcessed, succeeded, failed };
  } catch (error) {
    log.error("Generation run failed", { project: project.name }, error);

    await updateGenerationLog(genLog.id, {
      completed_at: new Date().toISOString(),
      keywords_processed: succeeded + failed,
      keywords_succeeded: succeeded,
      keywords_failed: failed,
      status: "failed",
    });
    throw error;
  }
}
