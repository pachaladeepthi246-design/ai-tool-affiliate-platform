import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

export interface CreateCardRequest {
  title: string;
  description: string;
  preview_content?: string;
  full_content?: string;
  images: string[];
  affiliate_url?: string;
  price: number;
  tags: string[];
  category_id: number;
  is_premium: boolean;
  download_url?: string;
}

export interface CreateCardResponse {
  id: number;
  slug: string;
}

// Create a new card (admin only)
export const create = api<CreateCardRequest, CreateCardResponse>(
  { auth: true, expose: true, method: "POST", path: "/admin/cards" },
  async (req) => {
    const auth = getAuthData()!;
    
    if (auth.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Generate slug from title
    const slug = req.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const result = await db.queryRow<{ id: number }>`
      INSERT INTO cards (
        title, slug, description, preview_content, full_content,
        images, affiliate_url, price, tags, category_id, is_premium, download_url
      )
      VALUES (
        ${req.title}, ${slug}, ${req.description}, ${req.preview_content}, ${req.full_content},
        ${req.images}, ${req.affiliate_url}, ${req.price}, ${req.tags}, ${req.category_id}, 
        ${req.is_premium}, ${req.download_url}
      )
      RETURNING id
    `;

    return {
      id: result!.id,
      slug,
    };
  }
);
