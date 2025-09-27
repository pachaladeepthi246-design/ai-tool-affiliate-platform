import { api } from "encore.dev/api";
import { auth } from "../auth/auth";
import { db } from "../db";

export interface TrackInteractionRequest {
  cardId: number;
  interactionType: 'view' | 'like' | 'bookmark' | 'purchase' | 'share' | 'download';
  durationSeconds?: number;
}

// Track user interaction for recommendation engine
export const trackInteraction = api<TrackInteractionRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/recommendations/track", auth: true },
  async (req) => {
    const userId = (await auth()).userID;
    const { cardId, interactionType, durationSeconds } = req;

    // Record the interaction
    await db.rawQuery`
      INSERT INTO user_interactions (
        user_id, card_id, interaction_type, duration_seconds, created_at
      )
      VALUES (
        ${userId}, ${cardId}, ${interactionType}, ${durationSeconds}, NOW()
      )
    `;

    // Update user preferences based on interaction
    await updateUserPreferences(userId, cardId, interactionType);

    return { success: true };
  }
);

async function updateUserPreferences(userId: string, cardId: number, interactionType: string) {
  // Get card details
  const card = await db.rawQueryRow<{
    category_id: number;
    tags: string[];
    price: number;
  }>`
    SELECT category_id, tags, price
    FROM cards
    WHERE id = ${cardId}
  `;

  if (!card) return;

  // Get or create user preferences
  let preferences = await db.rawQueryRow<{
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
    // Create new preferences
    await db.rawQuery`
      INSERT INTO user_preferences (
        user_id, preferred_categories, preferred_tags, price_range_min, price_range_max, created_at
      )
      VALUES (
        ${userId}, ${[card.category_id]}, ${card.tags}, ${card.price}, ${card.price}, NOW()
      )
    `;
    return;
  }

  // Update preferences based on interaction weight
  const interactionWeight = getInteractionWeight(interactionType);
  
  // Update preferred categories
  const updatedCategories = [...(preferences.preferred_categories || [])];
  if (!updatedCategories.includes(card.category_id)) {
    updatedCategories.push(card.category_id);
  }

  // Update preferred tags
  const updatedTags = [...(preferences.preferred_tags || [])];
  card.tags.forEach(tag => {
    if (!updatedTags.includes(tag)) {
      updatedTags.push(tag);
    }
  });

  // Update price range
  const currentMinPrice = preferences.price_range_min || card.price;
  const currentMaxPrice = preferences.price_range_max || card.price;
  const newMinPrice = Math.min(currentMinPrice, card.price);
  const newMaxPrice = Math.max(currentMaxPrice, card.price);

  await db.rawQuery`
    UPDATE user_preferences
    SET 
      preferred_categories = ${updatedCategories},
      preferred_tags = ${updatedTags},
      price_range_min = ${newMinPrice},
      price_range_max = ${newMaxPrice},
      updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

function getInteractionWeight(interactionType: string): number {
  switch (interactionType) {
    case 'view': return 1;
    case 'like': return 2;
    case 'bookmark': return 3;
    case 'share': return 4;
    case 'download': return 5;
    case 'purchase': return 10;
    default: return 1;
  }
}