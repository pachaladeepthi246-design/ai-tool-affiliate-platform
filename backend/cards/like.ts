import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

export interface LikeCardRequest {
  cardId: number;
}

export interface LikeCardResponse {
  success: boolean;
  liked: boolean;
  likesCount: number;
}

// Like or unlike a card
export const like = api<LikeCardRequest, LikeCardResponse>(
  { auth: true, expose: true, method: "POST", path: "/cards/:cardId/like" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Check if already liked
    const existingLike = await db.queryRow`
      SELECT id FROM likes WHERE user_id = ${userId} AND card_id = ${req.cardId}
    `;

    let liked: boolean;

    if (existingLike) {
      // Unlike
      await db.exec`DELETE FROM likes WHERE user_id = ${userId} AND card_id = ${req.cardId}`;
      await db.exec`UPDATE cards SET likes_count = likes_count - 1 WHERE id = ${req.cardId}`;
      liked = false;
    } else {
      // Like
      await db.exec`INSERT INTO likes (user_id, card_id) VALUES (${userId}, ${req.cardId})`;
      await db.exec`UPDATE cards SET likes_count = likes_count + 1 WHERE id = ${req.cardId}`;
      liked = true;
    }

    // Get updated likes count
    const card = await db.queryRow<{ likes_count: number }>`
      SELECT likes_count FROM cards WHERE id = ${req.cardId}
    `;

    return {
      success: true,
      liked,
      likesCount: card?.likes_count ?? 0,
    };
  }
);
