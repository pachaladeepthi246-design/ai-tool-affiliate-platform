import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { db } from "../db";

export interface SearchSuggestion {
  type: 'card' | 'category' | 'tag';
  value: string;
  label: string;
  count?: number;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
}

// Get search suggestions for autocomplete
export const getSuggestions = api<{ query: Query<string> }, SearchSuggestionsResponse>(
  { expose: true, method: "GET", path: "/search/suggestions" },
  async ({ query }) => {
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions: SearchSuggestion[] = [];
    
    // Get card title suggestions
    const cardSuggestions = await db.rawQueryAll<{ title: string }>`
      SELECT DISTINCT title
      FROM cards
      WHERE title ILIKE $1 
      AND moderation_status = 'approved'
      ORDER BY views_count DESC
      LIMIT 5
    `;

    cardSuggestions.forEach(card => {
      suggestions.push({
        type: 'card',
        value: card.title,
        label: card.title
      });
    });

    // Get category suggestions
    const categorySuggestions = await db.rawQueryAll<{ name: string; count: number }>`
      SELECT c.name, COUNT(cards.id) as count
      FROM categories c
      LEFT JOIN cards ON c.id = cards.category_id
      WHERE c.name ILIKE $1
      GROUP BY c.name
      ORDER BY count DESC
      LIMIT 3
    `;

    categorySuggestions.forEach(category => {
      suggestions.push({
        type: 'category',
        value: category.name,
        label: `Category: ${category.name}`,
        count: category.count
      });
    });

    // Get tag suggestions
    const tagSuggestions = await db.rawQueryAll<{ tag: string; count: number }>`
      SELECT tag, COUNT(*) as count
      FROM cards, unnest(tags) as tag
      WHERE tag ILIKE $1
      AND moderation_status = 'approved'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 5
    `;

    tagSuggestions.forEach(tag => {
      suggestions.push({
        type: 'tag',
        value: tag.tag,
        label: `Tag: ${tag.tag}`,
        count: tag.count
      });
    });

    return { suggestions: suggestions.slice(0, 10) };
  }
);

export interface PopularSearchesResponse {
  searches: string[];
}

// Get popular search queries
export const getPopularSearches = api<void, PopularSearchesResponse>(
  { expose: true, method: "GET", path: "/search/popular" },
  async () => {
    // This would typically come from a search analytics table
    // For now, return some static popular searches
    const searches = [
      "AI tools",
      "Design templates",
      "Business cards",
      "Social media",
      "Marketing",
      "Productivity",
      "E-commerce",
      "Education"
    ];
    
    return { searches };
  }
);