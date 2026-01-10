import { api } from "encore.dev/api";
import { db } from "../db";

export interface CreateAffiliateLinkRequest {
  cardId: number;
  affiliateId: number;
  trackingUrl: string;
  originalUrl: string;
}

export interface AffiliateLink {
  id: number;
  cardId: number;
  affiliateId: number;
  trackingUrl: string;
  originalUrl: string;
  clickCount: number;
  conversionCount: number;
  revenue: number;
  isActive: boolean;
  createdAt: Date;
}

export interface AffiliateLinkStats {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  revenuePerClick: number;
}

// Create new affiliate link
export const createLink = api<CreateAffiliateLinkRequest, AffiliateLink>(
  { expose: true, method: "POST", path: "/affiliates/links", auth: true },
  async (req) => {
    const { cardId, affiliateId, trackingUrl, originalUrl } = req;

    const link = await db.queryRow<AffiliateLink>`
      INSERT INTO affiliate_links (
        card_id, affiliate_id, tracking_url, original_url, created_at
      )
      VALUES (
        ${cardId}, ${affiliateId}, ${trackingUrl}, ${originalUrl}, NOW()
      )
      RETURNING *
    `;

    return link!;
  }
);

export interface GetCardLinksResponse {
  links: AffiliateLink[];
}

// Get affiliate links for a card
export const getCardLinks = api<{ cardId: number }, GetCardLinksResponse>(
  { expose: true, method: "GET", path: "/affiliates/links/card/:cardId", auth: true },
  async ({ cardId }) => {
    const links = await db.queryAll<AffiliateLink>`
      SELECT * FROM affiliate_links
      WHERE card_id = ${cardId}
      ORDER BY created_at DESC
    `;

    return { links };
  }
);

// Get affiliate link statistics
export const getLinkStats = api<{ linkId: number }, AffiliateLinkStats>(
  { expose: true, method: "GET", path: "/affiliates/links/:linkId/stats", auth: true },
  async ({ linkId }) => {
    const stats = await db.queryRow<{
      click_count: number;
      conversion_count: number;
      revenue: number;
    }>`
      SELECT click_count, conversion_count, revenue
      FROM affiliate_links
      WHERE id = ${linkId}
    `;

    if (!stats) {
      throw new Error("Affiliate link not found");
    }

    const conversionRate = stats.click_count > 0 
      ? (stats.conversion_count / stats.click_count) * 100 
      : 0;
    
    const revenuePerClick = stats.click_count > 0 
      ? stats.revenue / stats.click_count 
      : 0;

    return {
      totalClicks: stats.click_count,
      totalConversions: stats.conversion_count,
      totalRevenue: stats.revenue,
      conversionRate,
      revenuePerClick
    };
  }
);

// Update affiliate link status
export const updateLinkStatus = api<{ linkId: number; isActive: boolean }, { success: boolean }>(
  { expose: true, method: "PATCH", path: "/affiliates/links/:linkId/status", auth: true },
  async ({ linkId, isActive }) => {
    await db.exec`
      UPDATE affiliate_links 
      SET is_active = ${isActive}, updated_at = NOW()
      WHERE id = ${linkId}
    `;

    return { success: true };
  }
);