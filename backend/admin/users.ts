import { api, APIError, Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";
import { logAudit } from "../rbac/audit";
import { requireRole } from "../rbac/permissions";

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  wallet_balance: number;
  department?: string;
  phone?: string;
  country?: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  last_login?: Date;
  created_at: Date;
}

export interface ListUsersRequest {
  page?: Query<number>;
  limit?: Query<number>;
  role?: Query<string>;
  status?: Query<string>;
  search?: Query<string>;
}

export interface ListUsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UpdateUserRequest {
  userId: number;
  name?: string;
  role?: string;
  status?: string;
  department?: string;
  phone?: string;
  country?: string;
  wallet_balance?: number;
}

export const listUsers = api<ListUsersRequest, ListUsersResponse>(
  { auth: true, expose: true, method: "GET", path: "/admin/users" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const page = req.page ?? 1;
    const limit = req.limit ?? 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (req.role) {
      whereConditions.push(`role = $${paramIndex++}`);
      params.push(req.role);
    }

    if (req.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      params.push(req.status);
    }

    if (req.search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${req.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const totalResult = await db.rawQueryRow<{ total: number }>(countQuery, ...params);
    const total = totalResult?.total ?? 0;

    const usersQuery = `
      SELECT 
        id, email, name, role, status, wallet_balance, department,
        phone, country, email_verified, two_factor_enabled,
        last_login, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const users = await db.rawQueryAll<User>(usersQuery, ...params);

    await logAudit({
      action: 'list_users',
      resourceType: 'users',
    });

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
);

export const updateUser = api<UpdateUserRequest, User>(
  { auth: true, expose: true, method: "PATCH", path: "/admin/users/:userId" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const oldUser = await db.queryRow<User>`
      SELECT * FROM users WHERE id = ${req.userId}
    `;

    if (!oldUser) {
      throw APIError.notFound("User not found");
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(req.name);
    }

    if (req.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      params.push(req.role);
    }

    if (req.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(req.status);
    }

    if (req.department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      params.push(req.department);
    }

    if (req.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(req.phone);
    }

    if (req.country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      params.push(req.country);
    }

    if (req.wallet_balance !== undefined) {
      updates.push(`wallet_balance = $${paramIndex++}`);
      params.push(req.wallet_balance);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateQuery = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    params.push(req.userId);
    const [updatedUser] = await db.rawQueryAll<User>(updateQuery, ...params);

    await logAudit({
      action: 'update_user',
      resourceType: 'users',
      resourceId: req.userId.toString(),
      oldValues: oldUser,
      newValues: updatedUser,
    });

    return updatedUser;
  }
);

export const deleteUser = api<{ userId: number }, { success: boolean }>(
  { auth: true, expose: true, method: "DELETE", path: "/admin/users/:userId" },
  async (req) => {
    await requireRole('super_admin')();

    const user = await db.queryRow<User>`
      SELECT * FROM users WHERE id = ${req.userId}
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    await db.exec`DELETE FROM users WHERE id = ${req.userId}`;

    await logAudit({
      action: 'delete_user',
      resourceType: 'users',
      resourceId: req.userId.toString(),
      oldValues: user,
    });

    return { success: true };
  }
);
