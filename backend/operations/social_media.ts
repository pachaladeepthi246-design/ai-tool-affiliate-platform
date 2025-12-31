import { api, APIError } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { db } from "../db";
import { requireRole } from "../rbac/permissions";
import { logAudit } from "../rbac/audit";

export interface SocialMediaAccount {
  id: number;
  platform: string;
  account_name: string;
  is_active: boolean;
  created_at: Date;
}

export interface SocialMediaPost {
  id: number;
  account_id: number;
  card_id?: number;
  content: string;
  media_urls: string[];
  status: string;
  scheduled_at?: Date;
  published_at?: Date;
  error_message?: string;
}

export interface CreatePostRequest {
  accountId: number;
  cardId?: number;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
}

export const createPost = api<CreatePostRequest, SocialMediaPost>(
  { auth: true, expose: true, method: "POST", path: "/operations/social-media/posts" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const account = await db.queryRow<SocialMediaAccount>`
      SELECT * FROM social_media_accounts WHERE id = ${req.accountId}
    `;

    if (!account) {
      throw APIError.notFound("Social media account not found");
    }

    const post = await db.queryRow<SocialMediaPost>`
      INSERT INTO social_media_posts (
        account_id, card_id, content, media_urls,
        status, scheduled_at
      ) VALUES (
        ${req.accountId},
        ${req.cardId ?? null},
        ${req.content},
        ${req.mediaUrls ?? []},
        ${req.scheduledAt ? 'scheduled' : 'draft'},
        ${req.scheduledAt ?? null}
      )
      RETURNING *
    `;

    await logAudit({
      action: 'create_social_post',
      resourceType: 'social_media_posts',
      resourceId: post!.id.toString(),
      newValues: post,
    });

    return post!;
  }
);

export const publishPost = api<{ postId: number }, SocialMediaPost>(
  { auth: true, expose: true, method: "POST", path: "/operations/social-media/posts/:postId/publish" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const post = await db.queryRow<SocialMediaPost>`
      SELECT * FROM social_media_posts WHERE id = ${req.postId}
    `;

    if (!post) {
      throw APIError.notFound("Post not found");
    }

    try {
      const externalPostId = `ext_${Date.now()}`;

      const published = await db.queryRow<SocialMediaPost>`
        UPDATE social_media_posts
        SET 
          status = 'published',
          published_at = CURRENT_TIMESTAMP,
          external_post_id = ${externalPostId}
        WHERE id = ${req.postId}
        RETURNING *
      `;

      await logAudit({
        action: 'publish_social_post',
        resourceType: 'social_media_posts',
        resourceId: req.postId.toString(),
        newValues: published,
      });

      return published!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await db.exec`
        UPDATE social_media_posts
        SET 
          status = 'failed',
          error_message = ${errorMessage}
        WHERE id = ${req.postId}
      `;

      throw error;
    }
  }
);

export const autoPublishJob = api(
  { expose: false, method: "POST", path: "/cron/auto-publish" },
  async () => {
    const scheduledPosts = await db.queryAll<SocialMediaPost>`
      SELECT * FROM social_media_posts
      WHERE status = 'scheduled'
        AND scheduled_at <= CURRENT_TIMESTAMP
      LIMIT 10
    `;

    for (const post of scheduledPosts) {
      try {
        await publishPost({ postId: post.id });
      } catch (error) {
        console.error(`Failed to publish post ${post.id}:`, error);
      }
    }
  }
);

export const autoPublishScheduledPosts = new CronJob("auto-publish-posts", {
  title: "Auto-publish Scheduled Social Media Posts",
  schedule: "*/15 * * * *",
  endpoint: autoPublishJob,
});

export const listPosts = api<void, { posts: SocialMediaPost[] }>(
  { auth: true, expose: true, method: "GET", path: "/operations/social-media/posts" },
  async () => {
    await requireRole('super_admin', 'admin')();

    const posts = await db.queryAll<SocialMediaPost>`
      SELECT * FROM social_media_posts
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return { posts };
  }
);
