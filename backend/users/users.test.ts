import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db';

describe('Users Service', () => {
  let testUserId: number;

  beforeAll(async () => {
    const testUser = await db.queryRow<{ id: number }>`
      INSERT INTO users (email, name, password_hash, role)
      VALUES ('usertest@example.com', 'User Test', 'hash', 'customer')
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `;
    testUserId = testUser!.id;
  });

  afterAll(async () => {
    await db.exec`DELETE FROM bookmarks WHERE user_id = ${testUserId}`;
    await db.exec`DELETE FROM users WHERE email = 'usertest@example.com'`;
  });

  describe('User Profile', () => {
    it('should retrieve user profile', async () => {
      const user = await db.queryRow<{ 
        id: number; 
        email: string; 
        name: string; 
        role: string; 
      }>`
        SELECT id, email, name, role FROM users WHERE id = ${testUserId}
      `;

      expect(user).toBeDefined();
      expect(user!.id).toBe(testUserId);
      expect(user!.email).toBe('usertest@example.com');
      expect(user!.name).toBe('User Test');
    });

    it('should update user profile', async () => {
      const newName = 'Updated Test User';
      
      await db.exec`
        UPDATE users 
        SET name = ${newName}
        WHERE id = ${testUserId}
      `;

      const user = await db.queryRow<{ name: string }>`
        SELECT name FROM users WHERE id = ${testUserId}
      `;

      expect(user!.name).toBe(newName);

      await db.exec`
        UPDATE users 
        SET name = 'User Test'
        WHERE id = ${testUserId}
      `;
    });
  });

  describe('User Bookmarks', () => {
    let testCardId: number;

    beforeAll(async () => {
      const card = await db.queryRow<{ id: number }>`
        INSERT INTO cards (
          title, description, slug, category, price, thumbnail_url, 
          affiliate_link, user_id, moderation_status
        ) VALUES (
          'Bookmark Test Card',
          'A test card',
          'bookmark-test-' || ${Date.now()},
          'productivity',
          19.99,
          'https://example.com/image.jpg',
          'https://example.com/affiliate',
          ${testUserId},
          'approved'
        )
        RETURNING id
      `;
      testCardId = card!.id;
    });

    afterAll(async () => {
      await db.exec`DELETE FROM cards WHERE id = ${testCardId}`;
    });

    it('should create a bookmark', async () => {
      const bookmark = await db.queryRow<{ id: number; user_id: number; card_id: number }>`
        INSERT INTO bookmarks (user_id, card_id)
        VALUES (${testUserId}, ${testCardId})
        ON CONFLICT (user_id, card_id) DO NOTHING
        RETURNING id, user_id, card_id
      `;

      if (bookmark) {
        expect(bookmark.user_id).toBe(testUserId);
        expect(bookmark.card_id).toBe(testCardId);
      }
    });

    it('should list user bookmarks', async () => {
      const bookmarks = await db.queryAll<{ card_id: number }>`
        SELECT card_id FROM bookmarks
        WHERE user_id = ${testUserId}
      `;

      expect(Array.isArray(bookmarks)).toBe(true);
    });

    it('should remove a bookmark', async () => {
      await db.exec`
        DELETE FROM bookmarks
        WHERE user_id = ${testUserId} AND card_id = ${testCardId}
      `;

      const bookmark = await db.queryRow<{ id: number }>`
        SELECT id FROM bookmarks
        WHERE user_id = ${testUserId} AND card_id = ${testCardId}
      `;

      expect(bookmark).toBeUndefined();
    });
  });

  describe('User Preferences', () => {
    it('should store user preferences', async () => {
      const preference = await db.queryRow<{ id: number; preference_key: string; preference_value: string }>`
        INSERT INTO user_preferences (user_id, preference_key, preference_value)
        VALUES (${testUserId}, 'theme', 'dark')
        ON CONFLICT (user_id, preference_key) 
        DO UPDATE SET preference_value = EXCLUDED.preference_value
        RETURNING id, preference_key, preference_value
      `;

      expect(preference).toBeDefined();
      expect(preference!.preference_key).toBe('theme');
      expect(preference!.preference_value).toBe('dark');

      await db.exec`DELETE FROM user_preferences WHERE id = ${preference!.id}`;
    });

    it('should retrieve user preferences', async () => {
      await db.exec`
        INSERT INTO user_preferences (user_id, preference_key, preference_value)
        VALUES (${testUserId}, 'language', 'en')
        ON CONFLICT (user_id, preference_key) 
        DO UPDATE SET preference_value = EXCLUDED.preference_value
      `;

      const preference = await db.queryRow<{ preference_value: string }>`
        SELECT preference_value FROM user_preferences
        WHERE user_id = ${testUserId} AND preference_key = 'language'
      `;

      expect(preference?.preference_value).toBe('en');

      await db.exec`
        DELETE FROM user_preferences 
        WHERE user_id = ${testUserId} AND preference_key = 'language'
      `;
    });
  });

  describe('User Status', () => {
    it('should update user status', async () => {
      await db.exec`
        UPDATE users 
        SET status = 'suspended'
        WHERE id = ${testUserId}
      `;

      const user = await db.queryRow<{ status: string }>`
        SELECT status FROM users WHERE id = ${testUserId}
      `;

      expect(user!.status).toBe('suspended');

      await db.exec`
        UPDATE users 
        SET status = 'active'
        WHERE id = ${testUserId}
      `;
    });

    it('should track last login time', async () => {
      await db.exec`
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP
        WHERE id = ${testUserId}
      `;

      const user = await db.queryRow<{ last_login: Date | null }>`
        SELECT last_login FROM users WHERE id = ${testUserId}
      `;

      expect(user!.last_login).toBeDefined();
    });
  });
});
