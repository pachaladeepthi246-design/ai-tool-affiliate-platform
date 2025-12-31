import { api } from "encore.dev/api";
import { db } from "../db";

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

export const generateSitemap = api<void, { sitemap: string }>(
  { expose: true, method: "GET", path: "/seo/sitemap.xml" },
  async () => {
    const cards = await db.queryAll<{
      slug: string;
      updated_at: Date;
      sitemap_priority: number;
      sitemap_changefreq: string;
    }>`
      SELECT 
        c.slug,
        c.updated_at,
        COALESCE(s.sitemap_priority, 0.7) as sitemap_priority,
        COALESCE(s.sitemap_changefreq, 'weekly') as sitemap_changefreq
      FROM cards c
      LEFT JOIN seo_metadata s ON s.entity_type = 'card' AND s.entity_id = c.id
      WHERE c.moderation_status = 'approved'
    `;

    const categories = await db.queryAll<{
      slug: string;
      sitemap_priority: number;
      sitemap_changefreq: string;
    }>`
      SELECT 
        slug,
        COALESCE(s.sitemap_priority, 0.6) as sitemap_priority,
        COALESCE(s.sitemap_changefreq, 'monthly') as sitemap_changefreq
      FROM categories c
      LEFT JOIN seo_metadata s ON s.entity_type = 'category' AND s.entity_id = c.id
    `;

    const entries: SitemapEntry[] = [
      {
        loc: '/',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 1.0,
      },
    ];

    cards.forEach(card => {
      entries.push({
        loc: `/cards/${card.slug}`,
        lastmod: card.updated_at.toISOString(),
        changefreq: card.sitemap_changefreq,
        priority: card.sitemap_priority,
      });
    });

    categories.forEach(category => {
      entries.push({
        loc: `/category/${category.slug}`,
        lastmod: new Date().toISOString(),
        changefreq: category.sitemap_changefreq,
        priority: category.sitemap_priority,
      });
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return { sitemap };
  }
);

export const generateRobotsTxt = api<void, { robots: string }>(
  { expose: true, method: "GET", path: "/seo/robots.txt" },
  async () => {
    const robots = `User-agent: *
Allow: /

Sitemap: /seo/sitemap.xml

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /`;

    return { robots };
  }
);
