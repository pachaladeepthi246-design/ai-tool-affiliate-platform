import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

interface Permission {
  role: string;
  resource: string;
  action: string;
}

const permissionCache = new Map<string, Permission[]>();

async function loadPermissions(role: string): Promise<Permission[]> {
  if (permissionCache.has(role)) {
    return permissionCache.get(role)!;
  }

  const permissions = await db.queryAll<Permission>`
    SELECT role, resource, action 
    FROM role_permissions 
    WHERE role = ${role} OR role = '*'
  `;

  permissionCache.set(role, permissions);
  return permissions;
}

export async function checkPermission(
  role: string,
  resource: string,
  action: string
): Promise<boolean> {
  if (role === 'super_admin') {
    return true;
  }

  const permissions = await loadPermissions(role);
  
  return permissions.some(p => 
    (p.resource === resource || p.resource === '*') &&
    (p.action === action || p.action === '*')
  );
}

export function requirePermission(resource: string, action: string) {
  return async () => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }

    const hasPermission = await checkPermission(auth.role, resource, action);
    if (!hasPermission) {
      throw APIError.permissionDenied(`You don't have permission to ${action} ${resource}`);
    }
  };
}

export function requireRole(...allowedRoles: string[]) {
  return async () => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }

    if (!allowedRoles.includes(auth.role)) {
      throw APIError.permissionDenied(`Role ${auth.role} is not authorized for this operation`);
    }
  };
}
