import { api } from "encore.dev/api";
import { db } from "../db";

export interface ValidateCouponRequest {
  code: string;
}

export interface ValidateCouponResponse {
  valid: boolean;
  coupon?: {
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    cashback_percentage: number;
  };
  error?: string;
}

// Validate a coupon code
export const validate = api<ValidateCouponRequest, ValidateCouponResponse>(
  { expose: true, method: "POST", path: "/coupons/validate" },
  async (req) => {
    const coupon = await db.queryRow<{
      id: number;
      code: string;
      discount_type: string;
      discount_value: number;
      usage_limit: number;
      used_count: number;
      cashback_percentage: number;
      active: boolean;
      expires_at: Date | null;
    }>`
      SELECT id, code, discount_type, discount_value, usage_limit, used_count, 
             cashback_percentage, active, expires_at
      FROM coupons 
      WHERE code = ${req.code}
    `;

    if (!coupon) {
      return {
        valid: false,
        error: "Coupon not found",
      };
    }

    if (!coupon.active) {
      return {
        valid: false,
        error: "Coupon is not active",
      };
    }

    if (coupon.expires_at && new Date() > coupon.expires_at) {
      return {
        valid: false,
        error: "Coupon has expired",
      };
    }

    if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
      return {
        valid: false,
        error: "Coupon usage limit reached",
      };
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        cashback_percentage: coupon.cashback_percentage,
      },
    };
  }
);
