import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  wallet_balance: number;
  created_at: Date;
}

// Get user profile
export const profile = api<void, UserProfile>(
  { auth: true, expose: true, method: "GET", path: "/user/profile" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const user = await db.queryRow<UserProfile>`
      SELECT id, email, name, role, wallet_balance, created_at
      FROM users 
      WHERE id = ${userId}
    `;

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
);
