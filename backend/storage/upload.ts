import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { cardAssets } from "./objects";

export interface UploadRequest {
  filename: string;
  contentType: string;
}

export interface UploadResponse {
  uploadUrl: string;
  publicUrl: string;
}

// Generate signed upload URL for admin uploads
export const getUploadUrl = api<UploadRequest, UploadResponse>(
  { auth: true, expose: true, method: "POST", path: "/storage/upload-url" },
  async (req) => {
    const auth = getAuthData()!;
    
    if (auth.role !== "admin") {
      throw new Error("Admin access required");
    }

    const filename = `${Date.now()}-${req.filename}`;
    
    const { url: uploadUrl } = await cardAssets.signedUploadUrl(filename, {
      ttl: 3600, // 1 hour
    });

    const publicUrl = cardAssets.publicUrl(filename);

    return {
      uploadUrl,
      publicUrl,
    };
  }
);
