import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

export interface AnalyticsDashboard {
  totalClicks: number;
  totalUsers: number;
  totalRevenue: number;
  totalCashbacks: number;
  recentClicks: ClickRecord[];
  topCards: CardStats[];
}

export interface ClickRecord {
  id: number;
  card_title: string;
  user_email: string;
  created_at: Date;
}

export interface CardStats {
  id: number;
  title: string;
  clicks: number;
  revenue: number;
}

// Get analytics dashboard data (admin only)
export const dashboard = api<void, AnalyticsDashboard>(
  { auth: true, expose: true, method: "GET", path: "/analytics/dashboard" },
  async () => {
    const auth = getAuthData()!;
    
    if (auth.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get total clicks
    const clicksResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total FROM clicks
    `;

    // Get total users
    const usersResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total FROM users WHERE role = 'user'
    `;

    // Get total revenue
    const revenueResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(amount), 0) as total FROM purchases WHERE status = 'completed'
    `;

    // Get total cashbacks
    const cashbackResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(amount), 0) as total FROM cashbacks WHERE status = 'approved'
    `;

    // Get recent clicks
    const recentClicks = await db.queryAll<ClickRecord>`
      SELECT 
        c.id,
        cards.title as card_title,
        COALESCE(u.email, 'Anonymous') as user_email,
        c.created_at
      FROM clicks c
      LEFT JOIN cards ON c.card_id = cards.id
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `;

    // Get top cards by clicks
    const topCards = await db.queryAll<CardStats>`
      SELECT 
        cards.id,
        cards.title,
        COUNT(c.id) as clicks,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM cards
      LEFT JOIN clicks c ON cards.id = c.card_id
      LEFT JOIN purchases p ON cards.id = p.card_id AND p.status = 'completed'
      GROUP BY cards.id, cards.title
      ORDER BY clicks DESC
      LIMIT 10
    `;

    return {
      totalClicks: clicksResult?.total ?? 0,
      totalUsers: usersResult?.total ?? 0,
      totalRevenue: revenueResult?.total ?? 0,
      totalCashbacks: cashbackResult?.total ?? 0,
      recentClicks,
      topCards,
    };
  }
);
