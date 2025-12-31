import { api } from "encore.dev/api";
import { db } from "../db";

export interface HealthCheckResponse {
  status: string;
  timestamp: Date;
  services: {
    database: string;
    api: string;
  };
  version: string;
}

export const healthCheck = api<void, HealthCheckResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    let dbStatus = 'healthy';
    
    try {
      await db.queryRow`SELECT 1 as test`;
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    return {
      status: dbStatus === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date(),
      services: {
        database: dbStatus,
        api: 'healthy',
      },
      version: '2.0.0',
    };
  }
);

export const readinessCheck = api<void, { ready: boolean }>(
  { expose: true, method: "GET", path: "/ready" },
  async () => {
    try {
      await db.queryRow`SELECT 1 as test`;
      return { ready: true };
    } catch (error) {
      return { ready: false };
    }
  }
);

export const livenessCheck = api<void, { alive: boolean }>(
  { expose: true, method: "GET", path: "/live" },
  async () => {
    return { alive: true };
  }
);
