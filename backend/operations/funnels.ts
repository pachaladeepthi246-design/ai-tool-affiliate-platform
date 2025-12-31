import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";
import { requireRole } from "../rbac/permissions";

export interface AnalyticsFunnel {
  id: number;
  name: string;
  steps: any;
  is_active: boolean;
  created_at: Date;
}

export interface FunnelEvent {
  id: number;
  funnel_id: number;
  user_id?: number;
  session_id: string;
  step_index: number;
  step_name: string;
  metadata?: any;
  created_at: Date;
}

export interface CreateFunnelRequest {
  name: string;
  steps: { name: string; description?: string }[];
}

export interface FunnelAnalytics {
  funnel: AnalyticsFunnel;
  totalSessions: number;
  stepConversions: {
    step_index: number;
    step_name: string;
    total_entries: number;
    unique_users: number;
    conversion_rate: number;
  }[];
}

export const createFunnel = api<CreateFunnelRequest, AnalyticsFunnel>(
  { auth: true, expose: true, method: "POST", path: "/operations/funnels" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const funnel = await db.queryRow<AnalyticsFunnel>`
      INSERT INTO analytics_funnels (name, steps, is_active)
      VALUES (${req.name}, ${JSON.stringify(req.steps)}, true)
      RETURNING *
    `;

    return funnel!;
  }
);

export const trackFunnelEvent = api<
  {
    funnelId: number;
    sessionId: string;
    stepIndex: number;
    stepName: string;
    metadata?: any;
  },
  { success: boolean }
>(
  { expose: true, method: "POST", path: "/operations/funnels/:funnelId/track" },
  async (req) => {
    const auth = getAuthData();
    const userId = auth ? parseInt(auth.userID) : null;

    await db.exec`
      INSERT INTO funnel_events (
        funnel_id, user_id, session_id, step_index, step_name, metadata
      ) VALUES (
        ${req.funnelId},
        ${userId},
        ${req.sessionId},
        ${req.stepIndex},
        ${req.stepName},
        ${req.metadata ? JSON.stringify(req.metadata) : null}
      )
    `;

    return { success: true };
  }
);

export const getFunnelAnalytics = api<{ funnelId: number }, FunnelAnalytics>(
  { auth: true, expose: true, method: "GET", path: "/operations/funnels/:funnelId/analytics" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const funnel = await db.queryRow<AnalyticsFunnel>`
      SELECT * FROM analytics_funnels WHERE id = ${req.funnelId}
    `;

    if (!funnel) {
      throw APIError.notFound("Funnel not found");
    }

    const totalSessionsResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(DISTINCT session_id) as total
      FROM funnel_events
      WHERE funnel_id = ${req.funnelId}
    `;

    const stepConversions = await db.queryAll<{
      step_index: number;
      step_name: string;
      total_entries: number;
      unique_users: number;
      conversion_rate: number;
    }>`
      WITH step_stats AS (
        SELECT 
          step_index,
          step_name,
          COUNT(*) as total_entries,
          COUNT(DISTINCT user_id) as unique_users
        FROM funnel_events
        WHERE funnel_id = ${req.funnelId}
        GROUP BY step_index, step_name
      ),
      first_step AS (
        SELECT COUNT(DISTINCT session_id) as total_sessions
        FROM funnel_events
        WHERE funnel_id = ${req.funnelId} AND step_index = 0
      )
      SELECT 
        s.step_index,
        s.step_name,
        s.total_entries,
        s.unique_users,
        CASE 
          WHEN f.total_sessions > 0 THEN (s.total_entries::float / f.total_sessions * 100)
          ELSE 0
        END as conversion_rate
      FROM step_stats s
      CROSS JOIN first_step f
      ORDER BY s.step_index
    `;

    return {
      funnel,
      totalSessions: totalSessionsResult?.total ?? 0,
      stepConversions,
    };
  }
);

export const listFunnels = api<void, { funnels: AnalyticsFunnel[] }>(
  { auth: true, expose: true, method: "GET", path: "/operations/funnels" },
  async () => {
    await requireRole('super_admin', 'admin')();

    const funnels = await db.queryAll<AnalyticsFunnel>`
      SELECT * FROM analytics_funnels
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    return { funnels };
  }
);
