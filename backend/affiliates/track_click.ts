import { api } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { db } from "../db";

export interface TrackClickRequest {
  cardId: number;
  affiliateId: number;
  sessionId?: string;
  referrer?: Header<"Referer">;
  userAgent?: Header<"User-Agent">;
  ipAddress?: string;
}

export interface TrackClickResponse {
  clickId: number;
  redirectUrl: string;
}

// Track affiliate click and return redirect URL
export const trackClick = api<TrackClickRequest, TrackClickResponse>(
  { expose: true, method: "POST", path: "/affiliates/track-click" },
  async (req) => {
    const { cardId, affiliateId, sessionId, referrer, userAgent, ipAddress } = req;

    // Get the affiliate link details
    const affiliateLink = await db.rawQueryRow<{
      id: number;
      tracking_url: string;
      original_url: string;
    }>`
      SELECT id, tracking_url, original_url
      FROM affiliate_links
      WHERE card_id = ${cardId} AND affiliate_id = ${affiliateId} AND is_active = true
    `;

    if (!affiliateLink) {
      throw new Error("Affiliate link not found");
    }

    // Determine device type from user agent
    const deviceType = getUserDeviceType(userAgent || "");

    // Record the click
    const click = await db.rawQueryRow<{ id: number }>`
      INSERT INTO clicks (
        card_id, affiliate_id, ip_address, user_agent, referrer, 
        session_id, device_type, created_at
      )
      VALUES (
        ${cardId}, ${affiliateId}, ${ipAddress}, ${userAgent}, ${referrer},
        ${sessionId}, ${deviceType}, NOW()
      )
      RETURNING id
    `;

    // Update click count on affiliate link
    await db.rawQuery`
      UPDATE affiliate_links 
      SET click_count = click_count + 1, updated_at = NOW()
      WHERE id = ${affiliateLink.id}
    `;

    return {
      clickId: click!.id,
      redirectUrl: affiliateLink.tracking_url
    };
  }
);

function getUserDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}