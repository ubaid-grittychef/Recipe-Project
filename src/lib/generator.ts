import { generateRecipe } from "./openai";
import { fetchPendingKeywords, markKeywordDone } from "./sheets";
import {
  getProject,
  updateProject,
  createRecipe,
  createKeywordLog,
  createGenerationLog,
  updateGenerationLog,
} from "./store";
import { publishRecipeToSite } from "./site-publisher";
import { fetchRecipeImage } from "./images";
import { Recipe, KeywordLog, GenerationLog } from "./types";
import { generateId, slugify } from "./utils";
import { createLogger } from "./logger";

const log = createLogger("Generator");

export async function runGenerationForProject(projectId: string): Promise<{
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

  try {
    const { keywords, totalPending } = await fetchPendingKeywords(
      project.sheet_url,
      project.sheet_keyword_column,
      project.sheet_restaurant_column,
      project.sheet_status_column,
      project.recipes_per_day
    );

    log.info("Fetched pending keywords", {
      project: project.name,
      batch: keywords.length,
      totalPending,
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
        row: kw.row,
      });

      try {
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

        const recipe: Recipe = {
          id: generateId(),
          project_id: projectId,
          keyword: kw.keyword,
          restaurant_name: kw.restaurant || null,
          title: generated.title,
          slug: slugify(generated.title),
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

        await createRecipe(recipe);
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
            log.info("Recipe auto-published to site", { title: recipe.title });
          } catch (pubErr) {
            log.warn("Auto-publish to site failed — recipe saved as draft in factory DB", {
              title: recipe.title,
            }, pubErr);
          }
        }

        await markKeywordDone(
          project.sheet_url,
          project.sheet_status_column,
          kw.row,
          "done"
        );

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
          row: kw.row,
        }, error);

        try {
          await markKeywordDone(
            project.sheet_url,
            project.sheet_status_column,
            kw.row,
            "failed",
            errorMsg
          );
        } catch (sheetErr) {
          log.error("Failed to mark keyword as failed in sheet", {
            keyword: kw.keyword,
          }, sheetErr);
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

    // BUG 4 FIX: subtract the full batch (keywords.length), not just succeeded.
    // Both succeeded AND failed keywords are removed from "pending" in the sheet.
    const remainingInSheet = Math.max(0, totalPending - keywords.length);

    await updateProject(projectId, {
      keywords_remaining: remainingInSheet,
      keywords_failed: currentFailed + failed,
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
