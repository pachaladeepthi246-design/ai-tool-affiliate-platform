import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { db } from "../db";

export interface ListCardsRequest {
  page?: Query<number>;
  limit?: Query<number>;
  category?: Query<string>;
  tags?: Query<string>;
  search?: Query<string>;
}

export interface Card {
  id: number;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  tags: string[];
  category: string;
  is_premium: boolean;
  views_count: number;
  likes_count: number;
  created_at: Date;
}

export interface ListCardsResponse {
  cards: Card[];
  total: number;
  page: number;
  totalPages: number;
}

// Get list of cards with pagination and filtering
export const list = api<ListCardsRequest, ListCardsResponse>(
  { expose: true, method: "GET", path: "/cards" },
  async (req) => {
    const page = req.page ?? 1;
    const limit = req.limit ?? 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let params: any[] = [];

    if (req.category) {
      whereConditions.push(`c.slug = $${params.length + 1}`);
      params.push(req.category);
    }

    if (req.search) {
      whereConditions.push(`(cards.title ILIKE $${params.length + 1} OR cards.description ILIKE $${params.length + 1})`);
      params.push(`%${req.search}%`);
    }

    if (req.tags) {
      whereConditions.push(`$${params.length + 1} = ANY(cards.tags)`);
      params.push(req.tags);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM cards
      LEFT JOIN categories c ON cards.category_id = c.id
      ${whereClause}
    `;
    
    const totalResult = await db.rawQueryRow<{ total: number }>(countQuery, ...params);
    const total = totalResult?.total ?? 0;

    // Get cards
    const cardsQuery = `
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
        c.name as category
      FROM cards
      LEFT JOIN categories c ON cards.category_id = c.id
      ${whereClause}
      ORDER BY cards.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const cards = await db.rawQueryAll<Card>(cardsQuery, ...params);

    return {
      cards,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
);
