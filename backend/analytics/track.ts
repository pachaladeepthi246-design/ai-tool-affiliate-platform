import { api } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

export interface TrackClickRequest {
  cardId: number;
  affiliateId?: number;
  referrer?: Header<"Referer">;
  userAgent?: Header<"User-Agent">;
}

export interface TrackClickResponse {
  success: boolean;
}

// Track affiliate click
export const trackClick = api<TrackClickRequest, TrackClickResponse>(
  { expose: true, method: "POST", path: "/analytics/track-click" },
  async (req) => {
    const auth = getAuthData();
    const userId = auth ? parseInt(auth.userID) : null;

    await db.exec`
      INSERT INTO clicks (card_id, user_id, affiliate_id, user_agent, referrer)
      VALUES (${req.cardId}, ${userId}, ${req.affiliateId}, ${req.userAgent}, ${req.referrer})
    `;

    return { success: true };
  }
);
