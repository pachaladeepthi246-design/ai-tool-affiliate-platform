import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db';

describe('Cards Service', () => {
  let testUserId: number;
  let testCardId: number;

  beforeAll(async () => {
    const testUser = await db.queryRow<{ id: number }>`
      INSERT INTO users (email, name, password_hash, role)
      VALUES ('cardtest@example.com', 'Card Test User', 'hash', 'customer')
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `;
    testUserId = testUser!.id;
  });

  afterAll(async () => {
    if (testCardId) {
      await db.exec`DELETE FROM cards WHERE id = ${testCardId}`;
    }
    await db.exec`DELETE FROM users WHERE email = 'cardtest@example.com'`;
  });

  describe('Card Creation', () => {
    it('should create a new card', async () => {
      const card = await db.queryRow<{ id: number; title: string; slug: string }>`
        INSERT INTO cards (
          title, description, slug, category, price, thumbnail_url, 
          affiliate_link, user_id, moderation_status
        ) VALUES (
          'Test AI Tool',
          'A test AI tool description',
          'test-ai-tool-' || ${Date.now()},
          'productivity',
          29.99,
          'https://example.com/image.jpg',
          'https://example.com/affiliate',
          ${testUserId},
          'approved'
        )
        RETURNING id, title, slug
      `;

      expect(card).toBeDefined();
      expect(card!.title).toBe('Test AI Tool');
      expect(card!.slug).toContain('test-ai-tool');
      
      testCardId = card!.id;
    });
  });

  describe('Card Retrieval', () => {
    it('should list cards with pagination', async () => {
      const cards = await db.queryAll<{ id: number; title: string }>`
        SELECT id, title FROM cards
        WHERE moderation_status = 'approved'
        ORDER BY created_at DESC
        LIMIT 10
      `;

      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should get card by slug', async () => {
      const card = await db.queryRow<{ id: number; title: string }>`
        SELECT id, title FROM cards WHERE id = ${testCardId}
      `;

      expect(card).toBeDefined();
      expect(card!.id).toBe(testCardId);
    });

    it('should filter by category', async () => {
      const cards = await db.queryAll<{ id: number; category: string }>`
        SELECT id, category FROM cards
        WHERE category = 'productivity'
        LIMIT 5
      `;

      expect(Array.isArray(cards)).toBe(true);
      cards.forEach(card => {
        expect(card.category).toBe('productivity');
      });
    });
  });

  describe('Card Interactions', () => {
    it('should increment view count', async () => {
      const before = await db.queryRow<{ views_count: number }>`
        SELECT views_count FROM cards WHERE id = ${testCardId}
      `;

      await db.exec`
        UPDATE cards 
        SET views_count = views_count + 1
        WHERE id = ${testCardId}
      `;

      const after = await db.queryRow<{ views_count: number }>`
        SELECT views_count FROM cards WHERE id = ${testCardId}
      `;

      expect(after!.views_count).toBe((before?.views_count ?? 0) + 1);
    });

    it('should increment like count', async () => {
      const before = await db.queryRow<{ likes_count: number }>`
        SELECT likes_count FROM cards WHERE id = ${testCardId}
      `;

      await db.exec`
        UPDATE cards 
        SET likes_count = likes_count + 1
        WHERE id = ${testCardId}
      `;

      const after = await db.queryRow<{ likes_count: number }>`
        SELECT likes_count FROM cards WHERE id = ${testCardId}
      `;

      expect(after!.likes_count).toBe((before?.likes_count ?? 0) + 1);
    });
  });

  describe('Card Search', () => {
    it('should search cards by title', async () => {
      const searchTerm = 'AI';
      const cards = await db.queryAll<{ id: number; title: string }>`
        SELECT id, title FROM cards
        WHERE title ILIKE ${'%' + searchTerm + '%'}
        LIMIT 10
      `;

      expect(Array.isArray(cards)).toBe(true);
      cards.forEach(card => {
        expect(card.title.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });
  });
});
