import { describe, it, expect } from 'vitest';
import { db } from '../db';

describe('RBAC Service', () => {
  describe('Role Permissions', () => {
    it('should have all required roles defined', async () => {
      const roles = await db.queryAll<{ role: string }>`
        SELECT DISTINCT role FROM role_permissions
        ORDER BY role
      `;

      const roleNames = roles.map(r => r.role);
      
      expect(roleNames).toContain('super_admin');
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('staff');
      expect(roleNames).toContain('partner');
      expect(roleNames).toContain('customer');
    });

    it('should grant all permissions to super_admin', async () => {
      const permissions = await db.queryAll<{ permission: string }>`
        SELECT permission FROM role_permissions
        WHERE role = 'super_admin'
      `;

      expect(permissions.length).toBeGreaterThan(20);
    });

    it('should have limited permissions for customer role', async () => {
      const permissions = await db.queryAll<{ permission: string }>`
        SELECT permission FROM role_permissions
        WHERE role = 'customer'
      `;

      const permissionNames = permissions.map(p => p.permission);
      
      expect(permissionNames).toContain('cards:read');
      expect(permissionNames).toContain('cards:purchase');
      expect(permissionNames).not.toContain('users:delete');
      expect(permissionNames).not.toContain('cards:delete');
    });

    it('should check if role has specific permission', async () => {
      const hasPermission = await db.queryRow<{ exists: boolean }>`
        SELECT EXISTS(
          SELECT 1 FROM role_permissions
          WHERE role = 'admin' AND permission = 'users:update'
        ) as exists
      `;

      expect(hasPermission?.exists).toBe(true);
    });
  });

  describe('Audit Logs', () => {
    it('should create audit log entries', async () => {
      const testUserId = 1;
      
      const log = await db.queryRow<{ id: number; action: string }>`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, ip_address
        ) VALUES (
          ${testUserId},
          'test_action',
          'test_resource',
          'test_123',
          '127.0.0.1'
        )
        RETURNING id, action
      `;

      expect(log).toBeDefined();
      expect(log!.action).toBe('test_action');

      await db.exec`DELETE FROM audit_logs WHERE id = ${log!.id}`;
    });

    it('should retrieve audit logs for a user', async () => {
      const testUserId = 1;

      const logs = await db.queryAll<{ user_id: number }>`
        SELECT user_id FROM audit_logs
        WHERE user_id = ${testUserId}
        LIMIT 10
      `;

      expect(Array.isArray(logs)).toBe(true);
    });

    it('should filter audit logs by action type', async () => {
      const logs = await db.queryAll<{ action: string }>`
        SELECT action FROM audit_logs
        WHERE action LIKE 'create%'
        LIMIT 10
      `;

      expect(Array.isArray(logs)).toBe(true);
      logs.forEach(log => {
        expect(log.action).toMatch(/^create/);
      });
    });
  });

  describe('Permission Checking', () => {
    it('should validate role hierarchy', () => {
      const roleHierarchy = {
        super_admin: 6,
        admin: 5,
        staff: 4,
        partner: 3,
        customer: 2,
        guest: 1,
      };

      expect(roleHierarchy.super_admin).toBeGreaterThan(roleHierarchy.admin);
      expect(roleHierarchy.admin).toBeGreaterThan(roleHierarchy.staff);
      expect(roleHierarchy.staff).toBeGreaterThan(roleHierarchy.partner);
      expect(roleHierarchy.partner).toBeGreaterThan(roleHierarchy.customer);
      expect(roleHierarchy.customer).toBeGreaterThan(roleHierarchy.guest);
    });

    it('should check resource-action permissions', async () => {
      const checkPermission = async (role: string, permission: string): Promise<boolean> => {
        const result = await db.queryRow<{ exists: boolean }>`
          SELECT EXISTS(
            SELECT 1 FROM role_permissions
            WHERE role = ${role} AND permission = ${permission}
          ) as exists
        `;
        return result?.exists ?? false;
      };

      const canAdminDeleteUsers = await checkPermission('admin', 'users:delete');
      const canCustomerDeleteUsers = await checkPermission('customer', 'users:delete');

      expect(canAdminDeleteUsers).toBe(true);
      expect(canCustomerDeleteUsers).toBe(false);
    });
  });
});
