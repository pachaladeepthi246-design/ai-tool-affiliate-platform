import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

interface RecommendedCard {
  id: number;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  category: string;
  relevance_score: number;
}

export const getRecommendations = api<
  { limit?: number },
  { recommendations: RecommendedCard[] }
>(
  { auth: true, expose: true, method: "GET", path: "/ai/recommendations" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);
    const limit = req.limit ?? 10;

    const userInteractions = await db.queryAll<{
      card_id: number;
      interaction_type: string;
    }>`
      SELECT card_id, interaction_type
      FROM user_interactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const interactedCardIds = userInteractions.map(i => i.card_id);
    
    const viewedCategories = await db.queryAll<{ category_id: number }>`
      SELECT DISTINCT category_id
      FROM cards
      WHERE id = ANY(${interactedCardIds})
        AND category_id IS NOT NULL
    `;

    const categoryIds = viewedCategories.map(c => c.category_id);

    const recommendations = await db.queryAll<RecommendedCard>`
      SELECT 
        c.id,
        c.title,
        c.slug,
        c.description,
        c.images,
        c.price,
        cat.name as category,
        (
          CASE 
            WHEN c.category_id = ANY(${categoryIds}) THEN 0.5
            ELSE 0.0
          END +
          (c.likes_count::float / NULLIF((c.likes_count + c.views_count), 0)) * 0.3 +
          (CASE WHEN c.is_premium THEN 0.1 ELSE 0.0 END) +
          RANDOM() * 0.1
        ) as relevance_score
      FROM cards c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.moderation_status = 'approved'
        AND c.id != ALL(${interactedCardIds.length > 0 ? interactedCardIds : [0]})
      ORDER BY relevance_score DESC
      LIMIT ${limit}
    `;

    return { recommendations };
  }
);

export const trackInteraction = api<
  {
    cardId: number;
    interactionType: 'view' | 'like' | 'bookmark' | 'purchase' | 'share' | 'download';
    durationSeconds?: number;
  },
  { success: boolean }
>(
  { auth: true, expose: true, method: "POST", path: "/ai/track-interaction" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    await db.exec`
      INSERT INTO user_interactions (
        user_id, card_id, interaction_type, duration_seconds
      ) VALUES (
        ${userId},
        ${req.cardId},
        ${req.interactionType},
        ${req.durationSeconds ?? null}
      )
    `;

    return { success: true };
  }
);
