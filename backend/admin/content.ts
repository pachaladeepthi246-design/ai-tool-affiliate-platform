import { api, APIError, Query } from "encore.dev/api";
import { db } from "../db";
import { logAudit } from "../rbac/audit";
import { requireRole } from "../rbac/permissions";

export interface ModerationQueueItem {
  id: number;
  card_id: number;
  card_title: string;
  submitted_by: number;
  submitter_name: string;
  status: string;
  auto_moderation_score?: number;
  flags: string[];
  created_at: Date;
}

export interface ModerationQueueRequest {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
}

export interface ModerationQueueResponse {
  items: ModerationQueueItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReviewContentRequest {
  queueId: number;
  status: 'approved' | 'rejected' | 'needs_review';
  reviewNotes?: string;
}

export const getModerationQueue = api<ModerationQueueRequest, ModerationQueueResponse>(
  { auth: true, expose: true, method: "GET", path: "/admin/moderation/queue" },
  async (req) => {
    await requireRole('super_admin', 'admin', 'staff')();

    const page = req.page ?? 1;
    const limit = req.limit ?? 20;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];
    
    if (req.status) {
      whereClause = 'WHERE mq.status = $1';
      params.push(req.status);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM moderation_queue mq 
      ${whereClause}
    `;
    
    const totalResult = await db.rawQueryRow<{ total: number }>(countQuery, ...params);
    const total = totalResult?.total ?? 0;

    const queueQuery = `
      SELECT 
        mq.id, mq.card_id, mq.status, mq.auto_moderation_score,
        mq.flags, mq.created_at,
        c.title as card_title,
        mq.submitted_by,
        u.name as submitter_name
      FROM moderation_queue mq
      JOIN cards c ON mq.card_id = c.id
      LEFT JOIN users u ON mq.submitted_by = u.id
      ${whereClause}
      ORDER BY mq.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const items = await db.rawQueryAll<ModerationQueueItem>(queueQuery, ...params);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
);

export const reviewContent = api<ReviewContentRequest, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/moderation/review/:queueId" },
  async (req) => {
    await requireRole('super_admin', 'admin', 'staff')();

    const auth = await import("~encore/auth").then(m => m.getAuthData());
    const reviewerId = auth ? parseInt(auth.userID) : null;

    const queueItem = await db.queryRow<{ card_id: number; status: string }>`
      SELECT card_id, status FROM moderation_queue WHERE id = ${req.queueId}
    `;

    if (!queueItem) {
      throw APIError.notFound("Moderation queue item not found");
    }

    await db.exec`
      UPDATE moderation_queue
      SET status = ${req.status},
          reviewer_id = ${reviewerId},
          review_notes = ${req.reviewNotes ?? null},
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ${req.queueId}
    `;

    await db.exec`
      UPDATE cards
      SET moderation_status = ${req.status}
      WHERE id = ${queueItem.card_id}
    `;

    await logAudit({
      action: 'review_content',
      resourceType: 'moderation_queue',
      resourceId: req.queueId.toString(),
      oldValues: queueItem,
      newValues: { status: req.status, reviewNotes: req.reviewNotes },
    });

    return { success: true };
  }
);
