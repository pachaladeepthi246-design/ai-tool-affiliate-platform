import { SQLDatabase } from "encore.dev/storage/sqldb";

export const db = new SQLDatabase("guideitsol", {
  migrations: "./migrations",
});

// Helper function for backwards compatibility with the generated code
export async function query(queryStr: string, params: any[] = []) {
  return {
    rows: await db.rawQueryAll(queryStr, ...params)
  };
}