import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { db } from "../db";

const stripeSecretKey = secret("StripeSecretKey");
const stripe = new Stripe(stripeSecretKey());

export interface CheckoutRequest {
  cardId?: number;
  subscriptionType?: 'monthly' | 'yearly';
  couponCode?: string;
}

export interface CheckoutResponse {
  clientSecret: string;
  amount: number;
  currency: string;
}

// Create payment intent for checkout
export const checkout = api<CheckoutRequest, CheckoutResponse>(
  { auth: true, expose: true, method: "POST", path: "/payments/checkout" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    let amount = 0;
    let description = "";

    if (req.cardId) {
      // Single card purchase
      const card = await db.queryRow<{ title: string; price: number }>`
        SELECT title, price FROM cards WHERE id = ${req.cardId}
      `;
      
      if (!card) {
        throw new Error("Card not found");
      }

      amount = card.price * 100; // Convert to cents
      description = `Purchase: ${card.title}`;
    } else if (req.subscriptionType) {
      // Subscription purchase
      amount = req.subscriptionType === 'monthly' ? 999 : 9999; // $9.99 or $99.99
      description = `Subscription: ${req.subscriptionType}`;
    }

    // Apply coupon if provided
    if (req.couponCode) {
      const coupon = await db.queryRow<{
        id: number;
        discount_type: string;
        discount_value: number;
        usage_limit: number;
        used_count: number;
        active: boolean;
        expires_at: Date;
      }>`
        SELECT id, discount_type, discount_value, usage_limit, used_count, active, expires_at
        FROM coupons 
        WHERE code = ${req.couponCode} AND active = true
      `;

      if (coupon && (coupon.usage_limit === 0 || coupon.used_count < coupon.usage_limit)) {
        if (!coupon.expires_at || new Date() < coupon.expires_at) {
          if (coupon.discount_type === 'percentage') {
            amount = Math.round(amount * (1 - coupon.discount_value / 100));
          } else {
            amount = Math.max(0, amount - (coupon.discount_value * 100));
          }
        }
      }
    }

    // Get or create Stripe customer
    const user = await db.queryRow<{ stripe_customer_id: string; email: string; name: string }>`
      SELECT stripe_customer_id, email, name FROM users WHERE id = ${userId}
    `;

    let customerId = user?.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user!.email,
        name: user!.name,
      });
      
      customerId = customer.id;
      await db.exec`
        UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${userId}
      `;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      description,
      metadata: {
        userId: userId.toString(),
        cardId: req.cardId?.toString() || '',
        subscriptionType: req.subscriptionType || '',
        couponCode: req.couponCode || '',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      amount: amount / 100, // Convert back to dollars
      currency: 'usd',
    };
  }
);
