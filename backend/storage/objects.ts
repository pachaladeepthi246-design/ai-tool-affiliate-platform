import { Bucket } from "encore.dev/storage/objects";

// Bucket for storing card images and downloadable files
export const cardAssets = new Bucket("card-assets", {
  public: true,
});

// Bucket for user uploaded content
export const userUploads = new Bucket("user-uploads", {
  public: false,
});
