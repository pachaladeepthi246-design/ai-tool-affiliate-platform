import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";
import { logAudit } from "../rbac/audit";

export interface ReferralCode {
  id: number;
  code: string;
  uses: number;
  max_uses: number;
  commission_rate: number;
  is_active: boolean;
  expires_at?: Date;
  created_at: Date;
}

export interface Referral {
  id: number;
  referrer_id: number;
  referred_id: number;
  referral_code: string;
  commission_earned: number;
  status: string;
  created_at: Date;
  completed_at?: Date;
}

export interface CreateReferralCodeRequest {
  commissionRate?: number;
  maxUses?: number;
  expiresAt?: Date;
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  referralCode: ReferralCode;
  recentReferrals: Referral[];
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const createReferralCode = api<CreateReferralCodeRequest, ReferralCode>(
  { auth: true, expose: true, method: "POST", path: "/referrals/create-code" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const existingCode = await db.queryRow<ReferralCode>`
      SELECT * FROM referral_codes 
      WHERE user_id = ${userId} AND is_active = true
    `;

    if (existingCode) {
      return existingCode;
    }

    const code = generateReferralCode();

    const referralCode = await db.queryRow<ReferralCode>`
      INSERT INTO referral_codes (
        user_id, code, commission_rate, max_uses, expires_at
      ) VALUES (
        ${userId},
        ${code},
        ${req.commissionRate ?? 5.0},
        ${req.maxUses ?? 0},
        ${req.expiresAt ?? null}
      )
      RETURNING *
    `;

    await logAudit({
      action: 'create_referral_code',
      resourceType: 'referral_codes',
      newValues: referralCode,
    });

    return referralCode!;
  }
);

export const getReferralStats = api<void, ReferralStats>(
  { auth: true, expose: true, method: "GET", path: "/referrals/stats" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const referralCode = await db.queryRow<ReferralCode>`
      SELECT * FROM referral_codes 
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!referralCode) {
      throw APIError.notFound("No active referral code found");
    }

    const totalReferralsResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total 
      FROM referrals 
      WHERE referrer_id = ${userId}
    `;

    const completedReferralsResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total 
      FROM referrals 
      WHERE referrer_id = ${userId} AND status = 'completed'
    `;

    const totalCommissionsResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(commission_earned), 0) as total 
      FROM referrals 
      WHERE referrer_id = ${userId} AND status = 'completed'
    `;

    const pendingCommissionsResult = await db.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(commission_earned), 0) as total 
      FROM referrals 
      WHERE referrer_id = ${userId} AND status = 'pending'
    `;

    const recentReferrals = await db.queryAll<Referral>`
      SELECT 
        r.*,
        rc.code as referral_code
      FROM referrals r
      LEFT JOIN referral_codes rc ON r.referral_code_id = rc.id
      WHERE r.referrer_id = ${userId}
      ORDER BY r.created_at DESC
      LIMIT 10
    `;

    return {
      totalReferrals: totalReferralsResult?.total ?? 0,
      completedReferrals: completedReferralsResult?.total ?? 0,
      totalCommissions: totalCommissionsResult?.total ?? 0,
      pendingCommissions: pendingCommissionsResult?.total ?? 0,
      referralCode,
      recentReferrals,
    };
  }
);

export const applyReferralCode = api<{ code: string }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/referrals/apply/:code" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const existingReferral = await db.queryRow<{ id: number }>`
      SELECT id FROM referrals WHERE referred_id = ${userId}
    `;

    if (existingReferral) {
      throw APIError.alreadyExists("User already referred by someone");
    }

    const referralCode = await db.queryRow<ReferralCode>`
      SELECT * FROM referral_codes 
      WHERE code = ${req.code} 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND (max_uses = 0 OR uses < max_uses)
    `;

    if (!referralCode) {
      throw APIError.notFound("Invalid or expired referral code");
    }

    if (referralCode.id === userId) {
      throw APIError.invalidArgument("Cannot use your own referral code");
    }

    await db.exec`
      INSERT INTO referrals (
        referrer_id, referred_id, referral_code_id, status
      ) VALUES (
        ${referralCode.id},
        ${userId},
        ${referralCode.id},
        'pending'
      )
    `;

    await db.exec`
      UPDATE referral_codes
      SET uses = uses + 1
      WHERE id = ${referralCode.id}
    `;

    await logAudit({
      action: 'apply_referral_code',
      resourceType: 'referrals',
      newValues: { code: req.code, userId },
    });

    return {
      success: true,
      message: 'Referral code applied successfully',
    };
  }
);
