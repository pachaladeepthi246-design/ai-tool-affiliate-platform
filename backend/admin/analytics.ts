import { api, Query } from "encore.dev/api";
import { db } from "../db";
import { requireRole } from "../rbac/permissions";

export interface RevenueStats {
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  revenueByMonth: { month: string; revenue: number }[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  usersByRole: { role: string; count: number }[];
}

export interface ContentStats {
  totalCards: number;
  publishedCards: number;
  pendingCards: number;
  totalViews: number;
  totalLikes: number;
  topCards: {
    id: number;
    title: string;
    views: number;
    likes: number;
    revenue: number;
  }[];
}

export interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalCommissions: number;
  topAffiliates: {
    id: number;
    name: string;
    clicks: number;
    conversions: number;
    revenue: number;
  }[];
}

export interface AdminDashboardStats {
  revenue: RevenueStats;
  users: UserStats;
  content: ContentStats;
  affiliates: AffiliateStats;
}

export const getRevenueStats = api<void, RevenueStats>(
  { auth: true, expose: true, method: "GET", path: "/admin/analytics/revenue" },
  async () => {
    await requireRole('super_admin', 'admin')();

    const totalRevenueResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM purchases 
      WHERE status = 'completed'
    `;

    const todayRevenueResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM purchases 
      WHERE status = 'completed' 
        AND created_at >= CURRENT_DATE
    `;

    const monthRevenueResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM purchases 
      WHERE status = 'completed' 
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;

    const yearRevenueResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM purchases 
      WHERE status = 'completed' 
        AND created_at >= DATE_TRUNC('year', CURRENT_DATE)
    `;

    const revenueByMonth = await db.queryAll<{ month: string; revenue: number }>`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as revenue
      FROM purchases
      WHERE status = 'completed'
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;

    return {
      totalRevenue: totalRevenueResult?.total ?? 0,
      todayRevenue: todayRevenueResult?.total ?? 0,
      monthRevenue: monthRevenueResult?.total ?? 0,
      yearRevenue: yearRevenueResult?.total ?? 0,
      revenueByMonth,
    };
  }
);

export const getUserStats = api<void, UserStats>(
  { auth: true, expose: true, method: "GET", path: "/admin/analytics/users" },
  async () => {
    await requireRole('super_admin', 'admin')();

    const totalUsersResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total FROM users
    `;

    const activeUsersResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total 
      FROM users 
      WHERE status = 'active'
    `;

    const newUsersTodayResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total 
      FROM users 
      WHERE created_at >= CURRENT_DATE
    `;

    const newUsersMonthResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total 
      FROM users 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;

    const usersByRole = await db.queryAll<{ role: string; count: number }>`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `;

    return {
      totalUsers: totalUsersResult?.total ?? 0,
      activeUsers: activeUsersResult?.total ?? 0,
      newUsersToday: newUsersTodayResult?.total ?? 0,
      newUsersThisMonth: newUsersMonthResult?.total ?? 0,
      usersByRole,
    };
  }
);

export const getContentStats = api<void, ContentStats>(
  { auth: true, expose: true, method: "GET", path: "/admin/analytics/content" },
  async () => {
    await requireRole('super_admin', 'admin')();

    const totalCardsResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total FROM cards
    `;

    const publishedCardsResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total 
      FROM cards 
      WHERE moderation_status = 'approved'
    `;

    const pendingCardsResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total 
      FROM cards 
      WHERE moderation_status = 'pending'
    `;

    const totalViewsResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(views_count), 0) as total FROM cards
    `;

    const totalLikesResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(likes_count), 0) as total FROM cards
    `;

    const topCards = await db.queryAll<{
      id: number;
      title: string;
      views: number;
      likes: number;
      revenue: number;
    }>`
      SELECT 
        c.id,
        c.title,
        c.views_count as views,
        c.likes_count as likes,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM cards c
      LEFT JOIN purchases p ON c.id = p.card_id AND p.status = 'completed'
      GROUP BY c.id, c.title, c.views_count, c.likes_count
      ORDER BY views DESC
      LIMIT 10
    `;

    return {
      totalCards: totalCardsResult?.total ?? 0,
      publishedCards: publishedCardsResult?.total ?? 0,
      pendingCards: pendingCardsResult?.total ?? 0,
      totalViews: totalViewsResult?.total ?? 0,
      totalLikes: totalLikesResult?.total ?? 0,
      topCards,
    };
  }
);

export const getAffiliateStats = api<void, AffiliateStats>(
  { auth: true, expose: true, method: "GET", path: "/admin/analytics/affiliates" },
  async () => {
    await requireRole('super_admin', 'admin')();

    const totalClicksResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total FROM clicks
    `;

    const totalConversionsResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total 
      FROM clicks 
      WHERE conversion_value > 0
    `;

    const totalCommissionsResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM commissions 
      WHERE status IN ('approved', 'paid')
    `;

    const conversionRate = totalClicksResult && totalClicksResult.total > 0
      ? ((totalConversionsResult?.total ?? 0) / totalClicksResult.total) * 100
      : 0;

    const topAffiliates = await db.queryAll<{
      id: number;
      name: string;
      clicks: number;
      conversions: number;
      revenue: number;
    }>`
      SELECT 
        a.id,
        a.name,
        COUNT(DISTINCT c.id) as clicks,
        COUNT(DISTINCT CASE WHEN c.conversion_value > 0 THEN c.id END) as conversions,
        COALESCE(SUM(c.conversion_value), 0) as revenue
      FROM affiliates a
      LEFT JOIN clicks c ON a.id = c.affiliate_id
      GROUP BY a.id, a.name
      ORDER BY revenue DESC
      LIMIT 10
    `;

    return {
      totalClicks: totalClicksResult?.total ?? 0,
      totalConversions: totalConversionsResult?.total ?? 0,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      totalCommissions: totalCommissionsResult?.total ?? 0,
      topAffiliates,
    };
  }
);

export const getDashboardStats = api<void, AdminDashboardStats>(
  { auth: true, expose: true, method: "GET", path: "/admin/analytics/dashboard" },
  async () => {
    await requireRole('super_admin', 'admin')();

    const [revenue, users, content, affiliates] = await Promise.all([
      getRevenueStats(),
      getUserStats(),
      getContentStats(),
      getAffiliateStats(),
    ]);

    return {
      revenue,
      users,
      content,
      affiliates,
    };
  }
);
