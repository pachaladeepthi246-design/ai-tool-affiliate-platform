import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

export interface BookmarkRequest {
  cardId: number;
}

export interface BookmarkResponse {
  success: boolean;
  bookmarked: boolean;
}

// Bookmark or unbookmark a card
export const bookmark = api<BookmarkRequest, BookmarkResponse>(
  { auth: true, expose: true, method: "POST", path: "/user/bookmark/:cardId" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Check if already bookmarked
    const existingBookmark = await db.queryRow`
      SELECT id FROM bookmarks WHERE user_id = ${userId} AND card_id = ${req.cardId}
    `;

    let bookmarked: boolean;

    if (existingBookmark) {
      // Remove bookmark
      await db.exec`DELETE FROM bookmarks WHERE user_id = ${userId} AND card_id = ${req.cardId}`;
      bookmarked = false;
    } else {
      // Add bookmark
      await db.exec`INSERT INTO bookmarks (user_id, card_id) VALUES (${userId}, ${req.cardId})`;
      bookmarked = true;
    }

    return {
      success: true,
      bookmarked,
    };
  }
);
