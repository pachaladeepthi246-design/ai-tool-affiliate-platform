import { api, Cookie, APIError } from "encore.dev/api";
import { hashPassword, generateToken } from "./auth";
import { query } from "../db";

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  session?: Cookie<"session">;
}

// Register a new user
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    const { email, name, password } = req;

    try {
      // Check if user already exists
      const existingUserResult = await query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUserResult.rows.length > 0) {
        throw APIError.alreadyExists("User already exists");
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userResult = await query(
        "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
        [email, name, passwordHash, "user"]
      );

      const user = userResult.rows[0];

      // Generate JWT token
      const token = generateToken(user.id);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        session: {
          value: token,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Registration failed");
    }
  }
);