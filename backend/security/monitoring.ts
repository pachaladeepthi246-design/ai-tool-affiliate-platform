import { db } from "../db";
import { getAuthData } from "~encore/auth";

export interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export async function logPerformance(metric: PerformanceMetric): Promise<void> {
  const auth = getAuthData();
  
  await db.exec`
    INSERT INTO performance_metrics (
      endpoint, method, response_time, status_code,
      user_id, ip_address, user_agent, error_message
    ) VALUES (
      ${metric.endpoint},
      ${metric.method},
      ${metric.responseTime},
      ${metric.statusCode},
      ${metric.userId ?? (auth ? parseInt(auth.userID) : null)},
      ${metric.ipAddress ?? null},
      ${metric.userAgent ?? null},
      ${metric.errorMessage ?? null}
    )
  `;
}

export interface ErrorLog {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  endpoint?: string;
  method?: string;
  userId?: number;
  requestData?: any;
  environment?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export async function logError(error: ErrorLog): Promise<void> {
  const auth = getAuthData();
  
  await db.exec`
    INSERT INTO error_logs (
      error_type, error_message, stack_trace, endpoint, method,
      user_id, request_data, environment, severity
    ) VALUES (
      ${error.errorType},
      ${error.errorMessage},
      ${error.stackTrace ?? null},
      ${error.endpoint ?? null},
      ${error.method ?? null},
      ${error.userId ?? (auth ? parseInt(auth.userID) : null)},
      ${error.requestData ? JSON.stringify(error.requestData) : null},
      ${error.environment ?? 'production'},
      ${error.severity ?? 'error'}
    )
  `;
}

export function monitorPerformance<T>(
  endpoint: string,
  method: string
) {
  return async (fn: () => Promise<T>): Promise<T> => {
    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      statusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      
      await logPerformance({
        endpoint,
        method,
        responseTime,
        statusCode,
        errorMessage,
      }).catch(() => {});
    }
  };
}
