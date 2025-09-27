import { api } from "encore.dev/api";
import { db } from "../db";

export interface TrackConversionRequest {
  clickId: number;
  conversionValue: number;
  orderId?: string;
}

export interface TrackConversionResponse {
  success: boolean;
  commissionId?: number;
}

// Track conversion and calculate commission
export const trackConversion = api<TrackConversionRequest, TrackConversionResponse>(
  { expose: true, method: "POST", path: "/affiliates/track-conversion" },
  async (req) => {
    const { clickId, conversionValue, orderId } = req;

    // Get click details with affiliate info
    const clickInfo = await db.rawQueryRow<{
      affiliate_id: number;
      card_id: number;
      payout_percentage: number;
    }>`
      SELECT c.affiliate_id, c.card_id, a.payout_percentage
      FROM clicks c
      JOIN affiliates a ON c.affiliate_id = a.id
      WHERE c.id = ${clickId}
    `;

    if (!clickInfo) {
      throw new Error("Click not found");
    }

    // Update click with conversion value
    await db.rawQuery`
      UPDATE clicks 
      SET conversion_value = ${conversionValue}
      WHERE id = ${clickId}
    `;

    // Update affiliate link conversion count
    await db.rawQuery`
      UPDATE affiliate_links 
      SET conversion_count = conversion_count + 1, 
          revenue = revenue + ${conversionValue},
          updated_at = NOW()
      WHERE card_id = ${clickInfo.card_id} AND affiliate_id = ${clickInfo.affiliate_id}
    `;

    // Calculate commission
    const commissionAmount = conversionValue * (clickInfo.payout_percentage / 100);

    // Create commission record
    const commission = await db.rawQueryRow<{ id: number }>`
      INSERT INTO commissions (
        affiliate_id, card_id, click_id, amount, status, created_at
      )
      VALUES (
        ${clickInfo.affiliate_id}, ${clickInfo.card_id}, ${clickId}, 
        ${commissionAmount}, 'pending', NOW()
      )
      RETURNING id
    `;

    return {
      success: true,
      commissionId: commission!.id
    };
  }
);