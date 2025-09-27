import { Topic } from "encore.dev/pubsub";

// Notification events
export interface UserNotificationEvent {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promotion';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface CardInteractionEvent {
  cardId: number;
  userId: string;
  interactionType: 'like' | 'bookmark' | 'purchase' | 'download';
  timestamp: Date;
}

export interface SubscriptionEvent {
  userId: string;
  subscriptionId: number;
  eventType: 'created' | 'renewed' | 'canceled' | 'expired';
  planName: string;
  timestamp: Date;
}

export interface ModerationEvent {
  cardId: number;
  submittedBy: string;
  eventType: 'submitted' | 'approved' | 'rejected';
  reviewerNotes?: string;
  timestamp: Date;
}

// Topic definitions
export const userNotificationTopic = new Topic<UserNotificationEvent>("user-notification", {
  deliveryGuarantee: "at-least-once",
});

export const cardInteractionTopic = new Topic<CardInteractionEvent>("card-interaction", {
  deliveryGuarantee: "at-least-once",
});

export const subscriptionTopic = new Topic<SubscriptionEvent>("subscription-event", {
  deliveryGuarantee: "at-least-once",
});

export const moderationTopic = new Topic<ModerationEvent>("moderation-event", {
  deliveryGuarantee: "at-least-once",
});