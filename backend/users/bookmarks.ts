import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

export interface GetBookmarksRequest {
  page?: Query<number>;
  limit?: Query<number>;
}

export interface BookmarkedCard {
  id: number;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  category: string;
  bookmarked_at: Date;
}

export interface GetBookmarksResponse {
  bookmarks: BookmarkedCard[];
  total: number;
  page: number;
  totalPages: number;
}

// Get user's bookmarked cards
export const bookmarks = api<GetBookmarksRequest, GetBookmarksResponse>(
  { auth: true, expose: true, method: "GET", path: "/user/bookmarks" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);
    const page = req.page ?? 1;
    const limit = req.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get total count
    const totalResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total
      FROM bookmarks b
      WHERE b.user_id = ${userId}
    `;
    const total = totalResult?.total ?? 0;

    // Get bookmarked cards
    const bookmarks = await db.queryAll<BookmarkedCard>`
      SELECT 
        c.id,
        c.title,
        c.slug,
        c.description,
        c.images,
        c.price,
        cat.name as category,
        b.created_at as bookmarked_at
      FROM bookmarks b
      JOIN cards c ON b.card_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE b.user_id = ${userId}
      ORDER BY b.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      bookmarks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
);
