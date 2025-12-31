import { api, APIError } from "encore.dev/api";
import { db } from "../db";

export interface SEOMetadata {
  id: number;
  entity_type: string;
  entity_id: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_card?: string;
  canonical_url?: string;
  schema_markup?: any;
  sitemap_priority?: number;
  sitemap_changefreq?: string;
  robots_index: boolean;
  robots_follow: boolean;
}

export interface SaveSEOMetadataRequest {
  entityType: string;
  entityId: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  canonicalUrl?: string;
  schemaMarkup?: any;
  sitemapPriority?: number;
  sitemapChangefreq?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
}

export const saveSEOMetadata = api<SaveSEOMetadataRequest, SEOMetadata>(
  { auth: true, expose: true, method: "POST", path: "/seo/metadata" },
  async (req) => {
    const existing = await db.queryRow<SEOMetadata>`
      SELECT * FROM seo_metadata 
      WHERE entity_type = ${req.entityType} AND entity_id = ${req.entityId}
    `;

    if (existing) {
      const updated = await db.queryRow<SEOMetadata>`
        UPDATE seo_metadata SET
          meta_title = ${req.metaTitle ?? existing.meta_title},
          meta_description = ${req.metaDescription ?? existing.meta_description},
          meta_keywords = ${req.metaKeywords ?? existing.meta_keywords},
          og_title = ${req.ogTitle ?? existing.og_title},
          og_description = ${req.ogDescription ?? existing.og_description},
          og_image = ${req.ogImage ?? existing.og_image},
          twitter_card = ${req.twitterCard ?? existing.twitter_card},
          canonical_url = ${req.canonicalUrl ?? existing.canonical_url},
          schema_markup = ${req.schemaMarkup ? JSON.stringify(req.schemaMarkup) : existing.schema_markup},
          sitemap_priority = ${req.sitemapPriority ?? existing.sitemap_priority},
          sitemap_changefreq = ${req.sitemapChangefreq ?? existing.sitemap_changefreq},
          robots_index = ${req.robotsIndex ?? existing.robots_index},
          robots_follow = ${req.robotsFollow ?? existing.robots_follow},
          updated_at = CURRENT_TIMESTAMP
        WHERE entity_type = ${req.entityType} AND entity_id = ${req.entityId}
        RETURNING *
      `;
      return updated!;
    }

    const created = await db.queryRow<SEOMetadata>`
      INSERT INTO seo_metadata (
        entity_type, entity_id, meta_title, meta_description, meta_keywords,
        og_title, og_description, og_image, twitter_card, canonical_url,
        schema_markup, sitemap_priority, sitemap_changefreq,
        robots_index, robots_follow
      ) VALUES (
        ${req.entityType},
        ${req.entityId},
        ${req.metaTitle ?? null},
        ${req.metaDescription ?? null},
        ${req.metaKeywords ?? null},
        ${req.ogTitle ?? null},
        ${req.ogDescription ?? null},
        ${req.ogImage ?? null},
        ${req.twitterCard ?? 'summary_large_image'},
        ${req.canonicalUrl ?? null},
        ${req.schemaMarkup ? JSON.stringify(req.schemaMarkup) : null},
        ${req.sitemapPriority ?? 0.5},
        ${req.sitemapChangefreq ?? 'weekly'},
        ${req.robotsIndex ?? true},
        ${req.robotsFollow ?? true}
      )
      RETURNING *
    `;

    return created!;
  }
);

export const getSEOMetadata = api<{ entityType: string; entityId: number }, SEOMetadata>(
  { expose: true, method: "GET", path: "/seo/metadata/:entityType/:entityId" },
  async (req) => {
    const metadata = await db.queryRow<SEOMetadata>`
      SELECT * FROM seo_metadata 
      WHERE entity_type = ${req.entityType} AND entity_id = ${req.entityId}
    `;

    if (!metadata) {
      throw APIError.notFound("SEO metadata not found");
    }

    return metadata;
  }
);
