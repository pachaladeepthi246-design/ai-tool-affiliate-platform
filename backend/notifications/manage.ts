import { api } from "encore.dev/api";
import { auth } from "../auth/auth";
import { Subscription } from "encore.dev/pubsub";
import { db } from "../db";
import { 
  userNotificationTopic, 
  cardInteractionTopic, 
  subscriptionTopic, 
  moderationTopic,
  type UserNotificationEvent,
  type CardInteractionEvent,
  type SubscriptionEvent,
  type ModerationEvent
} from "./topics";

export interface Notification {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promotion';
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  newCards: boolean;
  priceDrops: boolean;
  subscriptionUpdates: boolean;
  promotions: boolean;
}

// Get user notifications
export const getUserNotifications = api<{ page?: number; limit?: number }, { notifications: Notification[], total: number }>(
  { expose: true, method: "GET", path: "/notifications", auth: true },
  async ({ page = 1, limit = 20 }) => {
    const userId = (await auth()).userID;
    const offset = (page - 1) * limit;

    const notifications = await db.rawQueryAll<Notification>`
      SELECT * FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await db.rawQueryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${userId}
    `;

    return {
      notifications,
      total: total?.count || 0
    };
  }
);

// Mark notification as read
export const markAsRead = api<{ notificationId: number }, { success: boolean }>(
  { expose: true, method: "PATCH", path: "/notifications/:notificationId/read", auth: true },
  async ({ notificationId }) => {
    const userId = (await auth()).userID;

    await db.rawQuery`
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE id = ${notificationId} AND user_id = ${userId}
    `;

    return { success: true };
  }
);

// Mark all notifications as read
export const markAllAsRead = api<void, { success: boolean }>(
  { expose: true, method: "PATCH", path: "/notifications/read-all", auth: true },
  async () => {
    const userId = (await auth()).userID;

    await db.rawQuery`
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE user_id = ${userId} AND is_read = false
    `;

    return { success: true };
  }
);

// Get unread notification count
export const getUnreadCount = api<void, { count: number }>(
  { expose: true, method: "GET", path: "/notifications/unread-count", auth: true },
  async () => {
    const userId = (await auth()).userID;

    const result = await db.rawQueryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${userId} AND is_read = false
    `;

    return { count: result?.count || 0 };
  }
);

// Send notification to user
export const sendNotification = api<UserNotificationEvent, { success: boolean }>(
  { expose: true, method: "POST", path: "/notifications/send", auth: true },
  async (event) => {
    await userNotificationTopic.publish(event);
    return { success: true };
  }
);

// Get/Update notification preferences
export const getPreferences = api<void, NotificationPreferences>(
  { expose: true, method: "GET", path: "/notifications/preferences", auth: true },
  async () => {
    const userId = (await auth()).userID;

    const preferences = await db.rawQueryRow<{ notification_settings: Record<string, any> }>`
      SELECT notification_settings
      FROM user_preferences
      WHERE user_id = ${userId}
    `;

    const settings = preferences?.notification_settings || {};
    
    return {
      emailNotifications: settings.emailNotifications ?? true,
      pushNotifications: settings.pushNotifications ?? true,
      newCards: settings.newCards ?? true,
      priceDrops: settings.priceDrops ?? true,
      subscriptionUpdates: settings.subscriptionUpdates ?? true,
      promotions: settings.promotions ?? false
    };
  }
);

export const updatePreferences = api<NotificationPreferences, { success: boolean }>(
  { expose: true, method: "PUT", path: "/notifications/preferences", auth: true },
  async (preferences) => {
    const userId = (await auth()).userID;

    await db.rawQuery`
      INSERT INTO user_preferences (user_id, notification_settings, created_at)
      VALUES (${userId}, ${JSON.stringify(preferences)}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET 
        notification_settings = ${JSON.stringify(preferences)},
        updated_at = NOW()
    `;

    return { success: true };
  }
);

// Subscription handlers for notification events
new Subscription(userNotificationTopic, "store-notification", {
  handler: async (event: UserNotificationEvent) => {
    await db.rawQuery`
      INSERT INTO notifications (
        user_id, title, message, type, action_url, metadata, created_at
      )
      VALUES (
        ${event.userId}, ${event.title}, ${event.message}, ${event.type},
        ${event.actionUrl}, ${JSON.stringify(event.metadata || {})}, NOW()
      )
    `;
  }
});

new Subscription(cardInteractionTopic, "card-interaction-notifications", {
  handler: async (event: CardInteractionEvent) => {
    // Notify card creator about interactions
    const card = await db.rawQueryRow<{ title: string }>`
      SELECT title FROM cards WHERE id = ${event.cardId}
    `;

    if (card) {
      let message = "";
      switch (event.interactionType) {
        case 'like':
          message = `Your card "${card.title}" received a new like!`;
          break;
        case 'bookmark':
          message = `Your card "${card.title}" was bookmarked!`;
          break;
        case 'purchase':
          message = `Your card "${card.title}" was purchased!`;
          break;
        case 'download':
          message = `Your card "${card.title}" was downloaded!`;
          break;
      }

      // Find card creator and send notification
      // This would need additional logic to identify the card creator
    }
  }
});

new Subscription(subscriptionTopic, "subscription-notifications", {
  handler: async (event: SubscriptionEvent) => {
    let title = "";
    let message = "";
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';

    switch (event.eventType) {
      case 'created':
        title = "Subscription Activated";
        message = `Welcome to ${event.planName}! Your subscription is now active.`;
        type = 'success';
        break;
      case 'renewed':
        title = "Subscription Renewed";
        message = `Your ${event.planName} subscription has been renewed successfully.`;
        type = 'success';
        break;
      case 'canceled':
        title = "Subscription Canceled";
        message = `Your ${event.planName} subscription has been canceled.`;
        type = 'warning';
        break;
      case 'expired':
        title = "Subscription Expired";
        message = `Your ${event.planName} subscription has expired. Renew to continue enjoying premium features.`;
        type = 'error';
        break;
    }

    await userNotificationTopic.publish({
      userId: event.userId,
      title,
      message,
      type,
      actionUrl: '/dashboard/subscription'
    });
  }
});

new Subscription(moderationTopic, "moderation-notifications", {
  handler: async (event: ModerationEvent) => {
    const card = await db.rawQueryRow<{ title: string }>`
      SELECT title FROM cards WHERE id = ${event.cardId}
    `;

    if (!card) return;

    let title = "";
    let message = "";
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';

    switch (event.eventType) {
      case 'submitted':
        title = "Content Submitted for Review";
        message = `Your card "${card.title}" has been submitted for moderation review.`;
        type = 'info';
        break;
      case 'approved':
        title = "Content Approved";
        message = `Great news! Your card "${card.title}" has been approved and is now live.`;
        type = 'success';
        break;
      case 'rejected':
        title = "Content Requires Changes";
        message = `Your card "${card.title}" needs some adjustments before it can go live.`;
        type = 'warning';
        break;
    }

    await userNotificationTopic.publish({
      userId: event.submittedBy,
      title,
      message,
      type,
      actionUrl: `/cards/${card.title}`,
      metadata: {
        cardId: event.cardId,
        reviewerNotes: event.reviewerNotes
      }
    });
  }
});