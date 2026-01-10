import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { hashPassword, verifyPassword, generateToken } from './auth';

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(50);
    });

    it('should verify correct passwords', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashed = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hashed);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT tokens', () => {
      const userId = '123';

      const token = generateToken(userId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('Database Integration', () => {
    it('should connect to database', async () => {
      const result = await db.queryRow<{ count: number }>`SELECT 1 as count`;
      expect(result?.count).toBe(1);
    });
  });
});
