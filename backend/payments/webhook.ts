import { api } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { db } from "../db";

const stripeSecretKey = secret("StripeSecretKey");
const stripeWebhookSecret = secret("StripeWebhookSecret");
const stripe = new Stripe(stripeSecretKey());

export interface WebhookRequest {
  signature: Header<"stripe-signature">;
  body: string;
}

export interface WebhookResponse {
  received: boolean;
}

// Handle Stripe webhooks
export const webhook = api<WebhookRequest, WebhookResponse>(
  { expose: true, method: "POST", path: "/payments/webhook" },
  async (req) => {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.signature,
        stripeWebhookSecret()
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
);

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { userId, cardId, subscriptionType, couponCode } = paymentIntent.metadata;

  if (!userId) return;

  const userIdNum = parseInt(userId);
  let couponId: number | null = null;

  // Process coupon usage and cashback
  if (couponCode) {
    const coupon = await db.queryRow<{
      id: number;
      cashback_percentage: number;
    }>`
      SELECT id, cashback_percentage 
      FROM coupons 
      WHERE code = ${couponCode}
    `;

    if (coupon) {
      couponId = coupon.id;
      
      // Update coupon usage
      await db.exec`
        UPDATE coupons SET used_count = used_count + 1 WHERE id = ${coupon.id}
      `;

      // Create cashback if applicable
      if (coupon.cashback_percentage > 0) {
        const cashbackAmount = (paymentIntent.amount / 100) * (coupon.cashback_percentage / 100);
        
        const purchase = await db.queryRow<{ id: number }>`
          INSERT INTO purchases (user_id, card_id, amount, status, stripe_payment_id, coupon_id)
          VALUES (${userIdNum}, ${cardId ? parseInt(cardId) : null}, ${paymentIntent.amount / 100}, 'completed', ${paymentIntent.id}, ${couponId})
          RETURNING id
        `;

        await db.exec`
          INSERT INTO cashbacks (user_id, amount, purchase_id, status)
          VALUES (${userIdNum}, ${cashbackAmount}, ${purchase!.id}, 'pending')
        `;
      }
    }
  }

  if (cardId) {
    // Record card purchase
    await db.exec`
      INSERT INTO purchases (user_id, card_id, amount, status, stripe_payment_id, coupon_id)
      VALUES (${userIdNum}, ${parseInt(cardId)}, ${paymentIntent.amount / 100}, 'completed', ${paymentIntent.id}, ${couponId})
    `;
  } else if (subscriptionType) {
    // Record subscription
    const periodEnd = new Date();
    if (subscriptionType === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    await db.exec`
      INSERT INTO subscriptions (user_id, plan_type, status, current_period_start, current_period_end)
      VALUES (${userIdNum}, ${subscriptionType}, 'active', NOW(), ${periodEnd})
    `;
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { userId, cardId } = paymentIntent.metadata;

  if (userId && cardId) {
    await db.exec`
      INSERT INTO purchases (user_id, card_id, amount, status, stripe_payment_id)
      VALUES (${parseInt(userId)}, ${parseInt(cardId)}, ${paymentIntent.amount / 100}, 'failed', ${paymentIntent.id})
    `;
  }
}
