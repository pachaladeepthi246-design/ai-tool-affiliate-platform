import { api } from "encore.dev/api";
import { auth } from "../auth/auth";
import { db } from "../db";

export interface UserSubscription {
  id: number;
  userId: number;
  planId: number;
  planType: string;
  status: 'active' | 'canceled' | 'expired';
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  autoRenew: boolean;
  trialEnd?: Date;
  discountApplied: number;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    name: string;
    description: string;
    price: number;
    billingPeriod: string;
    features: Record<string, any>;
    maxDownloads?: number;
  };
}

export interface SubscribeRequest {
  planId: number;
  paymentMethodId?: string;
  trialDays?: number;
  discountCode?: string;
}

export interface SubscriptionUsage {
  downloadsUsed: number;
  maxDownloads: number;
  resetDate: Date;
}

export interface GetUserSubscriptionResponse {
  subscription: UserSubscription | null;
}

// Get user's current subscription
export const getUserSubscription = api<void, GetUserSubscriptionResponse>(
  { expose: true, method: "GET", path: "/subscriptions/current", auth: true },
  async () => {
    const userId = (await auth()).userID;

    const subscription = await db.rawQueryRow<UserSubscription>`
      SELECT 
        s.*,
        sp.name as plan_name,
        sp.description as plan_description,
        sp.price as plan_price,
        sp.billing_period as plan_billing_period,
        sp.features as plan_features,
        sp.max_downloads as plan_max_downloads
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.user_id = ${userId} AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    if (!subscription) {
      return { subscription: null };
    }

    const userSubscription = {
      ...subscription,
      plan: {
        name: (subscription as any).plan_name,
        description: (subscription as any).plan_description,
        price: (subscription as any).plan_price,
        billingPeriod: (subscription as any).plan_billing_period,
        features: (subscription as any).plan_features,
        maxDownloads: (subscription as any).plan_max_downloads,
      }
    };

    return { subscription: userSubscription };
  }
);

// Subscribe to a plan
export const subscribe = api<SubscribeRequest, { subscriptionId: number; clientSecret?: string }>(
  { expose: true, method: "POST", path: "/subscriptions/subscribe", auth: true },
  async (req) => {
    const userId = (await auth()).userID;
    const { planId, paymentMethodId, trialDays, discountCode } = req;

    // Get plan details
    const plan = await db.rawQueryRow<{
      id: number;
      price: number;
      billing_period: string;
    }>`
      SELECT id, price, billing_period
      FROM subscription_plans
      WHERE id = ${planId} AND is_active = true
    `;

    if (!plan) {
      throw new Error("Plan not found");
    }

    // Check for existing active subscription
    const existingSubscription = await db.rawQueryRow<{ id: number }>`
      SELECT id FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active'
    `;

    if (existingSubscription) {
      throw new Error("User already has an active subscription");
    }

    // Calculate trial end date
    const trialEnd = trialDays ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;

    // Apply discount if provided
    let discountAmount = 0;
    if (discountCode) {
      const coupon = await db.rawQueryRow<{
        discount_type: string;
        discount_value: number;
      }>`
        SELECT discount_type, discount_value
        FROM coupons
        WHERE code = ${discountCode} AND active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (usage_limit = 0 OR used_count < usage_limit)
      `;

      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = plan.price * (coupon.discount_value / 100);
        } else {
          discountAmount = coupon.discount_value;
        }
      }
    }

    // Create subscription
    const subscription = await db.rawQueryRow<{ id: number }>`
      INSERT INTO subscriptions (
        user_id, plan_id, plan_type, status, auto_renew, trial_end, 
        discount_applied, created_at, updated_at
      )
      VALUES (
        ${userId}, ${planId}, ${plan.billing_period}, 'active', true, ${trialEnd},
        ${discountAmount}, NOW(), NOW()
      )
      RETURNING id
    `;

    // TODO: Integrate with Stripe for payment processing
    // This would involve creating a Stripe subscription and storing the subscription ID

    return {
      subscriptionId: subscription!.id,
      // clientSecret would be returned from Stripe for frontend payment confirmation
    };
  }
);

// Cancel subscription
export const cancelSubscription = api<{ immediate?: boolean }, { success: boolean }>(
  { expose: true, method: "POST", path: "/subscriptions/cancel", auth: true },
  async ({ immediate = false }) => {
    const userId = (await auth()).userID;

    const subscription = await db.rawQueryRow<{
      id: number;
      stripe_subscription_id?: string;
    }>`
      SELECT id, stripe_subscription_id
      FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active'
    `;

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    if (immediate) {
      // Cancel immediately
      await db.rawQuery`
        UPDATE subscriptions
        SET status = 'canceled', auto_renew = false, updated_at = NOW()
        WHERE id = ${subscription.id}
      `;
    } else {
      // Cancel at period end
      await db.rawQuery`
        UPDATE subscriptions
        SET auto_renew = false, updated_at = NOW()
        WHERE id = ${subscription.id}
      `;
    }

    // TODO: Cancel Stripe subscription if exists

    return { success: true };
  }
);

// Get subscription usage
export const getUsage = api<void, SubscriptionUsage>(
  { expose: true, method: "GET", path: "/subscriptions/usage", auth: true },
  async () => {
    const userId = (await auth()).userID;

    // Get current subscription
    const subscription = await db.rawQueryRow<{
      plan_max_downloads?: number;
      current_period_start?: Date;
      current_period_end?: Date;
    }>`
      SELECT sp.max_downloads as plan_max_downloads, s.current_period_start, s.current_period_end
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.user_id = ${userId} AND s.status = 'active'
    `;

    if (!subscription) {
      return {
        downloadsUsed: 0,
        maxDownloads: 0,
        resetDate: new Date()
      };
    }

    // Count downloads in current period
    const periodStart = subscription.current_period_start || new Date();
    const downloadsUsed = await db.rawQueryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM purchases
      WHERE user_id = ${userId} 
      AND status = 'completed'
      AND created_at >= ${periodStart}
    `;

    return {
      downloadsUsed: downloadsUsed?.count || 0,
      maxDownloads: subscription.plan_max_downloads || 0,
      resetDate: subscription.current_period_end || new Date()
    };
  }
);