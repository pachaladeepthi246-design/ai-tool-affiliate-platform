import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { auth } from "../auth/auth";
import { db } from "../db";

export interface RecommendedCard {
  id: number;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  tags: string[];
  category: string;
  isPremium: boolean;
  viewsCount: number;
  likesCount: number;
  createdAt: Date;
  recommendationScore: number;
  recommendationReason: string;
}

export interface RecommendationsRequest {
  limit?: Query<number>;
  type?: Query<'similar' | 'trending' | 'personalized' | 'category_based'>;
}

export interface RecommendationsResponse {
  recommendations: RecommendedCard[];
}

// Get personalized recommendations for user
export const getRecommendations = api<RecommendationsRequest, RecommendationsResponse>(
  { expose: true, method: "GET", path: "/recommendations", auth: true },
  async (req) => {
    const userId = (await auth()).userID;
    const { limit = 10, type = 'personalized' } = req;

    let recommendations: RecommendedCard[];
    
    switch (type) {
      case 'personalized':
        recommendations = await getPersonalizedRecommendations(userId, limit);
        break;
      case 'similar':
        recommendations = await getSimilarRecommendations(userId, limit);
        break;
      case 'trending':
        recommendations = await getTrendingRecommendations(limit);
        break;
      case 'category_based':
        recommendations = await getCategoryBasedRecommendations(userId, limit);
        break;
      default:
        recommendations = await getPersonalizedRecommendations(userId, limit);
        break;
    }

    return { recommendations };
  }
);

async function getPersonalizedRecommendations(userId: string, limit: number): Promise<RecommendedCard[]> {
  // Get user preferences
  const preferences = await db.rawQueryRow<{
    preferred_categories: number[];
    preferred_tags: string[];
    price_range_min?: number;
    price_range_max?: number;
  }>`
    SELECT preferred_categories, preferred_tags, price_range_min, price_range_max
    FROM user_preferences
    WHERE user_id = ${userId}
  `;

  if (!preferences) {
    // Return trending items for new users
    return await getTrendingRecommendations(limit);
  }

  // Get user's interaction history
  const interactedCardIds = await db.rawQueryAll<{ card_id: number }>`
    SELECT DISTINCT card_id
    FROM user_interactions
    WHERE user_id = ${userId}
  `;

  const excludedIds = interactedCardIds.map(item => item.card_id);

  // Build personalized query
  const recommendations = await db.rawQueryAll<RecommendedCard & { score: number }>`
    SELECT 
      cards.id,
      cards.title,
      cards.slug,
      cards.description,
      cards.images,
      cards.price,
      cards.tags,
      cards.is_premium,
      cards.views_count,
      cards.likes_count,
      cards.created_at,
      c.name as category,
      (
        CASE WHEN cards.category_id = ANY(${preferences.preferred_categories || []}) THEN 3 ELSE 0 END +
        CASE WHEN cards.tags && ${preferences.preferred_tags || []} THEN 2 ELSE 0 END +
        CASE 
          WHEN cards.price BETWEEN ${preferences.price_range_min || 0} AND ${preferences.price_range_max || 999999} 
          THEN 1 ELSE 0 
        END +
        (cards.likes_count * 0.1) +
        (cards.views_count * 0.01)
      ) as score
    FROM cards
    JOIN categories c ON cards.category_id = c.id
    WHERE cards.moderation_status = 'approved'
    ${excludedIds.length > 0 ? `AND cards.id NOT IN (${excludedIds.join(',')})` : ''}
    ORDER BY score DESC, cards.created_at DESC
    LIMIT ${limit}
  `;

  return recommendations.map(item => ({
    ...item,
    recommendationScore: item.score,
    recommendationReason: getRecommendationReason(item, preferences)
  }));
}

async function getSimilarRecommendations(userId: string, limit: number): Promise<RecommendedCard[]> {
  // Get user's most recent interactions
  const recentInteractions = await db.rawQueryAll<{
    card_id: number;
    category_id: number;
    tags: string[];
  }>`
    SELECT DISTINCT ON (ui.card_id) ui.card_id, cards.category_id, cards.tags
    FROM user_interactions ui
    JOIN cards ON ui.card_id = cards.id
    WHERE ui.user_id = ${userId}
    AND ui.interaction_type IN ('like', 'bookmark', 'purchase')
    ORDER BY ui.card_id, ui.created_at DESC
    LIMIT 5
  `;

  if (recentInteractions.length === 0) {
    return await getTrendingRecommendations(limit);
  }

  // Extract categories and tags from recent interactions
  const likedCategories = [...new Set(recentInteractions.map(item => item.category_id))];
  const likedTags = [...new Set(recentInteractions.flatMap(item => item.tags))];
  const excludedIds = recentInteractions.map(item => item.card_id);

  const similarCards = await db.rawQueryAll<RecommendedCard & { similarity_score: number }>`
    SELECT 
      cards.*,
      c.name as category,
      (
        CASE WHEN cards.category_id = ANY(${likedCategories}) THEN 5 ELSE 0 END +
        CASE WHEN cards.tags && ${likedTags} THEN 3 ELSE 0 END +
        (cards.likes_count * 0.1)
      ) as similarity_score
    FROM cards
    JOIN categories c ON cards.category_id = c.id
    WHERE cards.moderation_status = 'approved'
    AND cards.id NOT IN (${excludedIds.join(',')})
    AND (
      cards.category_id = ANY(${likedCategories}) OR
      cards.tags && ${likedTags}
    )
    ORDER BY similarity_score DESC, cards.created_at DESC
    LIMIT ${limit}
  `;

  return similarCards.map(item => ({
    ...item,
    recommendationScore: item.similarity_score,
    recommendationReason: "Similar to items you liked"
  }));
}

async function getTrendingRecommendations(limit: number): Promise<RecommendedCard[]> {
  const trending = await db.rawQueryAll<RecommendedCard & { trend_score: number }>`
    SELECT 
      cards.*,
      c.name as category,
      (
        (cards.likes_count * 0.3) +
        (cards.views_count * 0.1) +
        CASE 
          WHEN cards.created_at > NOW() - INTERVAL '7 days' THEN 2
          WHEN cards.created_at > NOW() - INTERVAL '30 days' THEN 1
          ELSE 0
        END
      ) as trend_score
    FROM cards
    JOIN categories c ON cards.category_id = c.id
    WHERE cards.moderation_status = 'approved'
    ORDER BY trend_score DESC, cards.created_at DESC
    LIMIT ${limit}
  `;

  return trending.map(item => ({
    ...item,
    recommendationScore: item.trend_score,
    recommendationReason: "Trending now"
  }));
}

async function getCategoryBasedRecommendations(userId: string, limit: number): Promise<RecommendedCard[]> {
  // Get user's preferred categories
  const preferences = await db.rawQueryRow<{
    preferred_categories: number[];
  }>`
    SELECT preferred_categories
    FROM user_preferences
    WHERE user_id = ${userId}
  `;

  if (!preferences?.preferred_categories?.length) {
    return await getTrendingRecommendations(limit);
  }

  const categoryRecommendations = await db.rawQueryAll<RecommendedCard>`
    SELECT 
      cards.*,
      c.name as category
    FROM cards
    JOIN categories c ON cards.category_id = c.id
    WHERE cards.moderation_status = 'approved'
    AND cards.category_id = ANY(${preferences.preferred_categories})
    ORDER BY cards.likes_count DESC, cards.created_at DESC
    LIMIT ${limit}
  `;

  return categoryRecommendations.map(item => ({
    ...item,
    recommendationScore: item.likesCount + item.viewsCount * 0.1,
    recommendationReason: `Popular in ${item.category}`
  }));
}

function getRecommendationReason(
  item: RecommendedCard & { score: number }, 
  preferences: any
): string {
  const reasons = [];
  
  if (preferences.preferred_categories?.includes(item.id)) {
    reasons.push("matches your interests");
  }
  
  if (preferences.preferred_tags?.some((tag: string) => item.tags.includes(tag))) {
    reasons.push("similar tags");
  }
  
  if (item.likesCount > 100) {
    reasons.push("highly rated");
  }
  
  return reasons.length > 0 ? reasons.join(", ") : "recommended for you";
}