import { db } from "../db";
import { getAuthData } from "~encore/auth";

export interface AuditLogEntry {
  userId?: number;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  errorMessage?: string;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const auth = getAuthData();
  
  await db.exec`
    INSERT INTO audit_logs (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address, user_agent,
      status, error_message
    ) VALUES (
      ${entry.userId ?? (auth ? parseInt(auth.userID) : null)},
      ${entry.action},
      ${entry.resourceType ?? null},
      ${entry.resourceId ?? null},
      ${entry.oldValues ? JSON.stringify(entry.oldValues) : null},
      ${entry.newValues ? JSON.stringify(entry.newValues) : null},
      ${entry.ipAddress ?? null},
      ${entry.userAgent ?? null},
      ${entry.status ?? 'success'},
      ${entry.errorMessage ?? null}
    )
  `;
}

export function withAudit<T>(
  action: string,
  resourceType: string,
  resourceId?: string
) {
  return async (fn: () => Promise<T>, oldValues?: any): Promise<T> => {
    try {
      const result = await fn();
      
      await logAudit({
        action,
        resourceType,
        resourceId,
        oldValues,
        newValues: result,
        status: 'success',
      });
      
      return result;
    } catch (error) {
      await logAudit({
        action,
        resourceType,
        resourceId,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  };
}
