import { api, APIError } from "encore.dev/api";
import { db } from "../db";

export interface GetCardRequest {
  slug: string;
}

export interface CardDetails {
  id: number;
  title: string;
  slug: string;
  description: string;
  preview_content: string;
  full_content: string;
  images: string[];
  affiliate_url: string;
  price: number;
  tags: string[];
  category: string;
  is_premium: boolean;
  download_url: string;
  views_count: number;
  likes_count: number;
  created_at: Date;
}

// Get card details by slug
export const get = api<GetCardRequest, CardDetails>(
  { expose: true, method: "GET", path: "/cards/:slug" },
  async (req) => {
    // Increment view count
    await db.exec`
      UPDATE cards SET views_count = views_count + 1 WHERE slug = ${req.slug}
    `;

    const card = await db.queryRow<CardDetails>`
      SELECT 
        cards.id,
        cards.title,
        cards.slug,
        cards.description,
        cards.preview_content,
        cards.full_content,
        cards.images,
        cards.affiliate_url,
        cards.price,
        cards.tags,
        cards.is_premium,
        cards.download_url,
        cards.views_count,
        cards.likes_count,
        cards.created_at,
        c.name as category
      FROM cards
      LEFT JOIN categories c ON cards.category_id = c.id
      WHERE cards.slug = ${req.slug}
    `;

    if (!card) {
      throw APIError.notFound("Card not found");
    }

    return card;
  }
);
