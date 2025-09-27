import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { db } from "../db";

export interface AdvancedSearchRequest {
  query?: Query<string>;
  categories?: Query<string[]>;
  tags?: Query<string[]>;
  priceMin?: Query<number>;
  priceMax?: Query<number>;
  isPremium?: Query<boolean>;
  sortBy?: Query<'relevance' | 'newest' | 'oldest' | 'price_low' | 'price_high' | 'popular' | 'rating'>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
  authorId?: Query<number>;
  page?: Query<number>;
  limit?: Query<number>;
}

export interface SearchResult {
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
  relevanceScore?: number;
}

export interface AdvancedSearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  facets: {
    categories: { name: string; count: number }[];
    tags: { name: string; count: number }[];
    priceRanges: { range: string; count: number }[];
  };
}

// Advanced search with multiple filters and facets
export const advancedSearch = api<AdvancedSearchRequest, AdvancedSearchResponse>(
  { expose: true, method: "GET", path: "/search/advanced" },
  async (req) => {
    const {
      query,
      categories,
      tags,
      priceMin,
      priceMax,
      isPremium,
      sortBy = 'relevance',
      dateFrom,
      dateTo,
      authorId,
      page = 1,
      limit = 20
    } = req;

    const offset = (page - 1) * limit;
    
    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: any[] = [];

    // Text search with relevance scoring
    if (query) {
      whereConditions.push(`
        (
          cards.title ILIKE $${params.length + 1} OR 
          cards.description ILIKE $${params.length + 1} OR
          array_to_string(cards.tags, ' ') ILIKE $${params.length + 1}
        )
      `);
      params.push(`%${query}%`);
    }

    // Category filter
    if (categories && categories.length > 0) {
      whereConditions.push(`c.slug = ANY($${params.length + 1})`);
      params.push(categories);
    }

    // Tags filter
    if (tags && tags.length > 0) {
      whereConditions.push(`cards.tags && $${params.length + 1}`);
      params.push(tags);
    }

    // Price range filter
    if (priceMin !== undefined) {
      whereConditions.push(`cards.price >= $${params.length + 1}`);
      params.push(priceMin);
    }
    if (priceMax !== undefined) {
      whereConditions.push(`cards.price <= $${params.length + 1}`);
      params.push(priceMax);
    }

    // Premium filter
    if (isPremium !== undefined) {
      whereConditions.push(`cards.is_premium = $${params.length + 1}`);
      params.push(isPremium);
    }

    // Date range filter
    if (dateFrom) {
      whereConditions.push(`cards.created_at >= $${params.length + 1}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push(`cards.created_at <= $${params.length + 1}`);
      params.push(dateTo);
    }

    // Only show approved content
    whereConditions.push(`cards.moderation_status = 'approved'`);

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Build ORDER BY clause
    let orderClause = '';
    switch (sortBy) {
      case 'newest':
        orderClause = 'ORDER BY cards.created_at DESC';
        break;
      case 'oldest':
        orderClause = 'ORDER BY cards.created_at ASC';
        break;
      case 'price_low':
        orderClause = 'ORDER BY cards.price ASC';
        break;
      case 'price_high':
        orderClause = 'ORDER BY cards.price DESC';
        break;
      case 'popular':
        orderClause = 'ORDER BY (cards.views_count + cards.likes_count) DESC';
        break;
      case 'relevance':
      default:
        if (query) {
          orderClause = `ORDER BY 
            CASE 
              WHEN cards.title ILIKE $${params.findIndex(p => p === `%${query}%`) + 1} THEN 3
              WHEN cards.description ILIKE $${params.findIndex(p => p === `%${query}%`) + 1} THEN 2
              WHEN array_to_string(cards.tags, ' ') ILIKE $${params.findIndex(p => p === `%${query}%`) + 1} THEN 1
              ELSE 0
            END DESC, cards.views_count DESC`;
        } else {
          orderClause = 'ORDER BY cards.created_at DESC';
        }
        break;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM cards
      LEFT JOIN categories c ON cards.category_id = c.id
      ${whereClause}
    `;
    
    const totalResult = await db.rawQueryRow<{ total: number }>(countQuery, ...params);
    const total = totalResult?.total ?? 0;

    // Get search results
    const searchQuery = `
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
      ${orderClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const results = await db.rawQueryAll<SearchResult>(searchQuery, ...params);

    // Get facets for filtering
    const facets = await getFacets(whereConditions, params.slice(0, -2));

    return {
      results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      facets
    };
  }
);

async function getFacets(whereConditions: string[], params: any[]) {
  const baseWhereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  // Get category facets
  const categoryFacets = await db.rawQueryAll<{ name: string; count: number }>`
    SELECT c.name, COUNT(*) as count
    FROM cards
    LEFT JOIN categories c ON cards.category_id = c.id
    ${baseWhereClause}
    GROUP BY c.name
    ORDER BY count DESC
    LIMIT 10
  `;

  // Get tag facets
  const tagFacets = await db.rawQueryAll<{ name: string; count: number }>`
    SELECT tag as name, COUNT(*) as count
    FROM cards, unnest(cards.tags) as tag
    ${baseWhereClause.replace('WHERE', 'WHERE cards.id IN (SELECT cards.id FROM cards WHERE')} ${baseWhereClause ? ')' : ''}
    GROUP BY tag
    ORDER BY count DESC
    LIMIT 20
  `;

  // Get price range facets
  const priceRangeFacets = await db.rawQueryAll<{ range: string; count: number }>`
    SELECT 
      CASE 
        WHEN price = 0 THEN 'Free'
        WHEN price <= 10 THEN '$0-$10'
        WHEN price <= 25 THEN '$10-$25'
        WHEN price <= 50 THEN '$25-$50'
        WHEN price <= 100 THEN '$50-$100'
        ELSE '$100+'
      END as range,
      COUNT(*) as count
    FROM cards
    ${baseWhereClause}
    GROUP BY range
    ORDER BY 
      CASE range
        WHEN 'Free' THEN 1
        WHEN '$0-$10' THEN 2
        WHEN '$10-$25' THEN 3
        WHEN '$25-$50' THEN 4
        WHEN '$50-$100' THEN 5
        ELSE 6
      END
  `;

  return {
    categories: categoryFacets || [],
    tags: tagFacets || [],
    priceRanges: priceRangeFacets || []
  };
}