import { api } from "encore.dev/api";
import { auth } from "../auth/auth";
import { db } from "../db";
import { moderationTopic } from "../notifications/topics";

export interface ModerationItem {
  id: number;
  cardId: number;
  submittedBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  reviewerId?: string;
  reviewNotes?: string;
  autoModerationScore?: number;
  flags: string[];
  createdAt: Date;
  reviewedAt?: Date;
  card: {
    title: string;
    description: string;
    images: string[];
    tags: string[];
  };
}

export interface ReviewAction {
  cardId: number;
  action: 'approve' | 'reject' | 'needs_review';
  notes?: string;
}

export interface AutoModerationResult {
  score: number;
  flags: string[];
  recommendation: 'approve' | 'reject' | 'review';
}

// Submit content for moderation
export const submitForModeration = api<{ cardId: number }, { moderationId: number }>(
  { expose: true, method: "POST", path: "/moderation/submit", auth: true },
  async ({ cardId }) => {
    const userId = (await auth()).userID;

    // Check if card exists and user owns it
    const card = await db.rawQueryRow<{ id: number }>`
      SELECT id FROM cards 
      WHERE id = ${cardId}
    `;

    if (!card) {
      throw new Error("Card not found");
    }

    // Run auto-moderation
    const autoResult = await runAutoModeration(cardId);

    // Create moderation queue entry
    const moderation = await db.rawQueryRow<{ id: number }>`
      INSERT INTO moderation_queue (
        card_id, submitted_by, status, auto_moderation_score, flags, created_at
      )
      VALUES (
        ${cardId}, ${userId}, 
        ${autoResult.recommendation === 'approve' ? 'approved' : 'pending'}, 
        ${autoResult.score}, ${autoResult.flags}, NOW()
      )
      RETURNING id
    `;

    // Update card moderation status
    const newStatus = autoResult.recommendation === 'approve' ? 'approved' : 'pending';
    await db.rawQuery`
      UPDATE cards 
      SET moderation_status = ${newStatus}, auto_moderation_score = ${autoResult.score}
      WHERE id = ${cardId}
    `;

    // Send notification
    await moderationTopic.publish({
      cardId,
      submittedBy: userId,
      eventType: 'submitted',
      timestamp: new Date()
    });

    return { moderationId: moderation!.id };
  }
);

// Get moderation queue (admin only)
export const getModerationQueue = api<{ 
  status?: 'pending' | 'approved' | 'rejected' | 'needs_review';
  page?: number;
  limit?: number;
}, { items: ModerationItem[], total: number }>(
  { expose: true, method: "GET", path: "/moderation/queue", auth: true },
  async ({ status, page = 1, limit = 20 }) => {
    // TODO: Add admin role check
    const offset = (page - 1) * limit;

    let whereClause = "";
    const params: any[] = [];

    if (status) {
      whereClause = "WHERE mq.status = $1";
      params.push(status);
    }

    const items = await db.rawQueryAll<ModerationItem>`
      SELECT 
        mq.*,
        cards.title as card_title,
        cards.description as card_description,
        cards.images as card_images,
        cards.tags as card_tags
      FROM moderation_queue mq
      JOIN cards ON mq.card_id = cards.id
      ${whereClause}
      ORDER BY mq.created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await db.rawQueryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM moderation_queue mq
      ${whereClause}
    `;

    return {
      items: items.map(item => ({
        ...item,
        card: {
          title: (item as any).card_title,
          description: (item as any).card_description,
          images: (item as any).card_images,
          tags: (item as any).card_tags,
        }
      })),
      total: total?.count || 0
    };
  }
);

// Review content (admin only)
export const reviewContent = api<ReviewAction, { success: boolean }>(
  { expose: true, method: "POST", path: "/moderation/review", auth: true },
  async ({ cardId, action, notes }) => {
    const reviewerId = (await authHandler()).userID;
    // TODO: Add admin role check

    // Get moderation item
    const moderationItem = await db.rawQueryRow<{
      id: number;
      submitted_by: string;
    }>`
      SELECT id, submitted_by
      FROM moderation_queue
      WHERE card_id = ${cardId}
    `;

    if (!moderationItem) {
      throw new Error("Moderation item not found");
    }

    // Update moderation status
    await db.rawQuery`
      UPDATE moderation_queue
      SET 
        status = ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_review'},
        reviewer_id = ${reviewerId},
        review_notes = ${notes},
        reviewed_at = NOW()
      WHERE card_id = ${cardId}
    `;

    // Update card status
    const cardStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_review';
    await db.rawQuery`
      UPDATE cards
      SET moderation_status = ${cardStatus}
      WHERE id = ${cardId}
    `;

    // Send notification
    await moderationTopic.publish({
      cardId,
      submittedBy: moderationItem.submitted_by,
      eventType: action === 'approve' ? 'approved' : 'rejected',
      reviewerNotes: notes,
      timestamp: new Date()
    });

    return { success: true };
  }
);

// Get moderation statistics
export const getModerationStats = api<void, {
  pending: number;
  approved: number;
  rejected: number;
  needsReview: number;
  avgProcessingTime: number;
}>(
  { expose: true, method: "GET", path: "/moderation/stats", auth: true },
  async () => {
    const stats = await db.rawQueryRow<{
      pending: number;
      approved: number;
      rejected: number;
      needs_review: number;
    }>`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'needs_review' THEN 1 END) as needs_review
      FROM moderation_queue
    `;

    const avgTime = await db.rawQueryRow<{ avg_hours: number }>`
      SELECT 
        COALESCE(AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600), 0) as avg_hours
      FROM moderation_queue
      WHERE reviewed_at IS NOT NULL
    `;

    return {
      pending: stats?.pending || 0,
      approved: stats?.approved || 0,
      rejected: stats?.rejected || 0,
      needsReview: stats?.needs_review || 0,
      avgProcessingTime: avgTime?.avg_hours || 0
    };
  }
);

async function runAutoModeration(cardId: number): Promise<AutoModerationResult> {
  const card = await db.rawQueryRow<{
    title: string;
    description: string;
    tags: string[];
  }>`
    SELECT title, description, tags
    FROM cards
    WHERE id = ${cardId}
  `;

  if (!card) {
    throw new Error("Card not found");
  }

  let score = 100; // Start with perfect score
  const flags: string[] = [];

  // Check for inappropriate content (basic keyword filtering)
  const inappropriateKeywords = ['spam', 'fake', 'scam', 'illegal', 'adult', 'nsfw'];
  const content = `${card.title} ${card.description} ${card.tags.join(' ')}`.toLowerCase();

  inappropriateKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      score -= 30;
      flags.push(`inappropriate_content_${keyword}`);
    }
  });

  // Check title length
  if (card.title.length < 10) {
    score -= 10;
    flags.push('title_too_short');
  }

  if (card.title.length > 100) {
    score -= 5;
    flags.push('title_too_long');
  }

  // Check description length
  if (card.description.length < 50) {
    score -= 15;
    flags.push('description_too_short');
  }

  // Check for excessive capitalization
  const upperCaseRatio = (card.title.match(/[A-Z]/g) || []).length / card.title.length;
  if (upperCaseRatio > 0.5) {
    score -= 20;
    flags.push('excessive_caps');
  }

  // Check for too many tags
  if (card.tags.length > 10) {
    score -= 10;
    flags.push('too_many_tags');
  }

  // Determine recommendation
  let recommendation: 'approve' | 'reject' | 'review';
  if (score >= 80) {
    recommendation = 'approve';
  } else if (score < 40) {
    recommendation = 'reject';
  } else {
    recommendation = 'review';
  }

  return {
    score: Math.max(0, score),
    flags,
    recommendation
  };
}