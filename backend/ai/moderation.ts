import { api } from "encore.dev/api";
import { db } from "../db";

interface ModerationResult {
  score: number;
  flags: string[];
  approved: boolean;
  reason?: string;
}

export async function moderateContent(
  content: string,
  title?: string,
  images?: string[]
): Promise<ModerationResult> {
  const flags: string[] = [];
  let score = 1.0;

  const bannedWords = [
    'spam', 'scam', 'fraud', 'hack', 'illegal', 'piracy', 'crack',
    'adult', 'nsfw', 'xxx', 'porn', 'casino', 'gambling'
  ];

  const contentLower = content.toLowerCase();
  const titleLower = title?.toLowerCase() || '';

  bannedWords.forEach(word => {
    if (contentLower.includes(word) || titleLower.includes(word)) {
      flags.push(`Contains banned word: ${word}`);
      score -= 0.2;
    }
  });

  if (content.match(/https?:\/\//g)?.length ?? 0 > 5) {
    flags.push('Too many external links');
    score -= 0.15;
  }

  if (content.length < 50) {
    flags.push('Content too short');
    score -= 0.1;
  }

  if (content.match(/[A-Z]{10,}/)) {
    flags.push('Excessive capitalization');
    score -= 0.1;
  }

  if (content.match(/(.)\1{5,}/)) {
    flags.push('Repeated characters');
    score -= 0.1;
  }

  const approved = score > 0.6 && flags.length < 3;

  return {
    score: Math.max(0, Math.min(1, score)),
    flags,
    approved,
    reason: approved ? undefined : 'Content flagged by automated moderation',
  };
}

export const autoModerateCard = api<
  { cardId: number },
  { approved: boolean; score: number; flags: string[] }
>(
  { expose: false, method: "POST", path: "/ai/moderate/card/:cardId" },
  async (req) => {
    const card = await db.queryRow<{
      title: string;
      description: string;
      full_content: string;
      images: string[];
    }>`
      SELECT title, description, full_content, images
      FROM cards
      WHERE id = ${req.cardId}
    `;

    if (!card) {
      throw new Error("Card not found");
    }

    const content = `${card.description || ''} ${card.full_content || ''}`;
    const result = await moderateContent(content, card.title, card.images);

    await db.exec`
      UPDATE cards
      SET 
        moderation_status = ${result.approved ? 'approved' : 'needs_review'},
        auto_moderation_score = ${result.score}
      WHERE id = ${req.cardId}
    `;

    if (!result.approved) {
      const existingQueue = await db.queryRow<{ id: number }>`
        SELECT id FROM moderation_queue WHERE card_id = ${req.cardId}
      `;

      if (!existingQueue) {
        await db.exec`
          INSERT INTO moderation_queue (
            card_id, status, auto_moderation_score, flags
          ) VALUES (
            ${req.cardId},
            'needs_review',
            ${result.score},
            ${result.flags}
          )
        `;
      }
    }

    return {
      approved: result.approved,
      score: result.score,
      flags: result.flags,
    };
  }
);
