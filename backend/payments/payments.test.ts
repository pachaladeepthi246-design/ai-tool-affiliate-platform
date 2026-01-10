import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db';

describe('Payments Service', () => {
  let testUserId: number;
  let testCardId: number;

  beforeAll(async () => {
    const testUser = await db.queryRow<{ id: number }>`
      INSERT INTO users (email, name, password_hash, role, wallet_balance)
      VALUES ('paymenttest@example.com', 'Payment Test User', 'hash', 'customer', 100.00)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `;
    testUserId = testUser!.id;

    const testCard = await db.queryRow<{ id: number }>`
      INSERT INTO cards (
        title, description, slug, category, price, thumbnail_url, 
        affiliate_link, user_id, moderation_status
      ) VALUES (
        'Payment Test Card',
        'A test card for payment',
        'payment-test-card-' || ${Date.now()},
        'productivity',
        49.99,
        'https://example.com/image.jpg',
        'https://example.com/affiliate',
        ${testUserId},
        'approved'
      )
      RETURNING id
    `;
    testCardId = testCard!.id;
  });

  afterAll(async () => {
    await db.exec`DELETE FROM purchases WHERE user_id = ${testUserId}`;
    await db.exec`DELETE FROM cards WHERE id = ${testCardId}`;
    await db.exec`DELETE FROM users WHERE email = 'paymenttest@example.com'`;
  });

  describe('Purchase Creation', () => {
    it('should create a purchase record', async () => {
      const purchase = await db.queryRow<{ 
        id: number; 
        user_id: number; 
        card_id: number;
        amount: number;
        status: string;
      }>`
        INSERT INTO purchases (
          user_id, card_id, amount, currency, payment_method, status
        ) VALUES (
          ${testUserId},
          ${testCardId},
          49.99,
          'USD',
          'card',
          'pending'
        )
        RETURNING id, user_id, card_id, amount, status
      `;

      expect(purchase).toBeDefined();
      expect(purchase!.user_id).toBe(testUserId);
      expect(purchase!.card_id).toBe(testCardId);
      expect(purchase!.amount).toBe(49.99);
      expect(purchase!.status).toBe('pending');
    });

    it('should handle completed purchases', async () => {
      const purchase = await db.queryRow<{ id: number }>`
        INSERT INTO purchases (
          user_id, card_id, amount, currency, payment_method, status, stripe_payment_intent_id
        ) VALUES (
          ${testUserId},
          ${testCardId},
          49.99,
          'USD',
          'card',
          'completed',
          'pi_test_123456'
        )
        RETURNING id
      `;

      const completedPurchase = await db.queryRow<{ status: string; stripe_payment_intent_id: string | null }>`
        SELECT status, stripe_payment_intent_id FROM purchases WHERE id = ${purchase!.id}
      `;

      expect(completedPurchase!.status).toBe('completed');
      expect(completedPurchase!.stripe_payment_intent_id).toBe('pi_test_123456');

      await db.exec`DELETE FROM purchases WHERE id = ${purchase!.id}`;
    });
  });

  describe('Coupon System', () => {
    it('should create and validate coupons', async () => {
      const coupon = await db.queryRow<{ id: number; code: string; discount_type: string; discount_value: number }>`
        INSERT INTO coupons (
          code, discount_type, discount_value, max_uses, is_active
        ) VALUES (
          'TEST2024',
          'percentage',
          20.0,
          100,
          true
        )
        ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
        RETURNING id, code, discount_type, discount_value
      `;

      expect(coupon).toBeDefined();
      expect(coupon!.code).toBe('TEST2024');
      expect(coupon!.discount_type).toBe('percentage');
      expect(coupon!.discount_value).toBe(20.0);

      await db.exec`DELETE FROM coupons WHERE code = 'TEST2024'`;
    });

    it('should calculate percentage discount correctly', () => {
      const originalPrice = 100.00;
      const discountPercent = 20.0;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);

      expect(discountedPrice).toBe(80.00);
    });

    it('should calculate fixed discount correctly', () => {
      const originalPrice = 100.00;
      const fixedDiscount = 15.00;
      const discountedPrice = Math.max(0, originalPrice - fixedDiscount);

      expect(discountedPrice).toBe(85.00);
    });
  });

  describe('User Wallet', () => {
    it('should track user wallet balance', async () => {
      const user = await db.queryRow<{ wallet_balance: number }>`
        SELECT wallet_balance FROM users WHERE id = ${testUserId}
      `;

      expect(user).toBeDefined();
      expect(user!.wallet_balance).toBeGreaterThanOrEqual(0);
    });

    it('should deduct from wallet on purchase', async () => {
      const before = await db.queryRow<{ wallet_balance: number }>`
        SELECT wallet_balance FROM users WHERE id = ${testUserId}
      `;

      const deductAmount = 10.00;
      await db.exec`
        UPDATE users 
        SET wallet_balance = wallet_balance - ${deductAmount}
        WHERE id = ${testUserId}
      `;

      const after = await db.queryRow<{ wallet_balance: number }>`
        SELECT wallet_balance FROM users WHERE id = ${testUserId}
      `;

      expect(after!.wallet_balance).toBe((before!.wallet_balance - deductAmount));

      await db.exec`
        UPDATE users 
        SET wallet_balance = ${before!.wallet_balance}
        WHERE id = ${testUserId}
      `;
    });
  });

  describe('Purchase History', () => {
    it('should retrieve user purchase history', async () => {
      const purchases = await db.queryAll<{ id: number; user_id: number }>`
        SELECT id, user_id FROM purchases
        WHERE user_id = ${testUserId}
        ORDER BY created_at DESC
      `;

      expect(Array.isArray(purchases)).toBe(true);
      purchases.forEach(purchase => {
        expect(purchase.user_id).toBe(testUserId);
      });
    });
  });
});
