import { api, Cookie, APIError } from "encore.dev/api";
import { verifyPassword, generateToken } from "./auth";
import { query } from "../db";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
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

// Login user
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    const { email, password } = req;

    try {
      // Find user
      const userResult = await query(
        "SELECT id, email, name, password_hash, role FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length === 0) {
        throw APIError.invalidArgument("Invalid credentials");
      }

      const user = userResult.rows[0];

      // Verify password
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        throw APIError.invalidArgument("Invalid credentials");
      }

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
      throw APIError.internal("Login failed");
    }
  }
);