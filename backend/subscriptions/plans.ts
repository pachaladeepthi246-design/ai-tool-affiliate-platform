import { api } from "encore.dev/api";
import { db } from "../db";

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  features: Record<string, any>;
  maxDownloads?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CreatePlanRequest {
  name: string;
  description: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  features: Record<string, any>;
  maxDownloads?: number;
}

export interface GetPlansResponse {
  plans: SubscriptionPlan[];
}

// Get all active subscription plans
export const getPlans = api<void, GetPlansResponse>(
  { expose: true, method: "GET", path: "/subscriptions/plans" },
  async () => {
    const plans = await db.rawQueryAll<SubscriptionPlan>`
      SELECT * FROM subscription_plans
      WHERE is_active = true
      ORDER BY price ASC
    `;

    return { plans };
  }
);

// Create new subscription plan (admin only)
export const createPlan = api<CreatePlanRequest, SubscriptionPlan>(
  { expose: true, method: "POST", path: "/subscriptions/plans", auth: true },
  async (req) => {
    const { name, description, price, billingPeriod, features, maxDownloads } = req;

    const plan = await db.rawQueryRow<SubscriptionPlan>`
      INSERT INTO subscription_plans (
        name, description, price, billing_period, features, max_downloads, created_at
      )
      VALUES (
        ${name}, ${description}, ${price}, ${billingPeriod}, 
        ${JSON.stringify(features)}, ${maxDownloads}, NOW()
      )
      RETURNING *
    `;

    return plan!;
  }
);

// Update subscription plan
export const updatePlan = api<{ planId: number } & Partial<CreatePlanRequest>, SubscriptionPlan>(
  { expose: true, method: "PATCH", path: "/subscriptions/plans/:planId", auth: true },
  async ({ planId, ...updates }) => {
    const updateFields = [];
    const params = [planId];

    if (updates.name) {
      updateFields.push(`name = $${params.length + 1}`);
      params.push(updates.name);
    }
    if (updates.description) {
      updateFields.push(`description = $${params.length + 1}`);
      params.push(updates.description);
    }
    if (updates.price !== undefined) {
      updateFields.push(`price = $${params.length + 1}`);
      params.push(updates.price);
    }
    if (updates.features) {
      updateFields.push(`features = $${params.length + 1}`);
      params.push(JSON.stringify(updates.features));
    }
    if (updates.maxDownloads !== undefined) {
      updateFields.push(`max_downloads = $${params.length + 1}`);
      params.push(updates.maxDownloads);
    }

    if (updateFields.length === 0) {
      throw new Error("No fields to update");
    }

    const query = `
      UPDATE subscription_plans 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const plan = await db.rawQueryRow<SubscriptionPlan>(query, ...params);
    return plan!;
  }
);