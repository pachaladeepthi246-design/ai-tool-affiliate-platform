import { api, APIError, Query } from "encore.dev/api";
import { db } from "../db";
import { requireRole } from "../rbac/permissions";
import { logAudit } from "../rbac/audit";

export interface NotificationCampaign {
  id: number;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  subject?: string;
  content: string;
  template_id?: string;
  target_audience?: any;
  status: string;
  scheduled_at?: Date;
  sent_at?: Date;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: Date;
}

export interface CreateCampaignRequest {
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  subject?: string;
  content: string;
  templateId?: string;
  targetAudience?: any;
  scheduledAt?: Date;
}

export interface SendNotificationRequest {
  userId: number;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  recipient: string;
  subject?: string;
  content: string;
}

export const createCampaign = api<CreateCampaignRequest, NotificationCampaign>(
  { auth: true, expose: true, method: "POST", path: "/communications/campaigns" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const campaign = await db.queryRow<NotificationCampaign>`
      INSERT INTO notification_campaigns (
        name, type, subject, content, template_id,
        target_audience, status, scheduled_at
      ) VALUES (
        ${req.name},
        ${req.type},
        ${req.subject ?? null},
        ${req.content},
        ${req.templateId ?? null},
        ${req.targetAudience ? JSON.stringify(req.targetAudience) : null},
        ${req.scheduledAt ? 'scheduled' : 'draft'},
        ${req.scheduledAt ?? null}
      )
      RETURNING *
    `;

    await logAudit({
      action: 'create_campaign',
      resourceType: 'notification_campaigns',
      resourceId: campaign!.id.toString(),
      newValues: campaign,
    });

    return campaign!;
  }
);

export const listCampaigns = api<
  { page?: Query<number>; limit?: Query<number> },
  { campaigns: NotificationCampaign[]; total: number }
>(
  { auth: true, expose: true, method: "GET", path: "/communications/campaigns" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const page = req.page ?? 1;
    const limit = req.limit ?? 20;
    const offset = (page - 1) * limit;

    const totalResult = await db.queryRow<{ total: number }>`
      SELECT COUNT(*) as total FROM notification_campaigns
    `;

    const campaigns = await db.queryAll<NotificationCampaign>`
      SELECT * FROM notification_campaigns
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      campaigns,
      total: totalResult?.total ?? 0,
    };
  }
);

export const sendNotification = api<SendNotificationRequest, { success: boolean; logId: number }>(
  { expose: false, method: "POST", path: "/communications/send" },
  async (req) => {
    const logEntry = await db.queryRow<{ id: number }>`
      INSERT INTO notification_logs (
        user_id, type, recipient, subject, content, status
      ) VALUES (
        ${req.userId},
        ${req.type},
        ${req.recipient},
        ${req.subject ?? null},
        ${req.content},
        'sent'
      )
      RETURNING id
    `;

    return {
      success: true,
      logId: logEntry!.id,
    };
  }
);

export const sendBulkNotifications = api<
  { campaignId: number },
  { success: boolean; sent: number; failed: number }
>(
  { auth: true, expose: true, method: "POST", path: "/communications/campaigns/:campaignId/send" },
  async (req) => {
    await requireRole('super_admin', 'admin')();

    const campaign = await db.queryRow<NotificationCampaign>`
      SELECT * FROM notification_campaigns WHERE id = ${req.campaignId}
    `;

    if (!campaign) {
      throw APIError.notFound("Campaign not found");
    }

    let users: { id: number; email: string; phone?: string }[] = [];

    if (campaign.target_audience) {
      const audience = campaign.target_audience as any;
      
      let whereConditions: string[] = [];
      if (audience.roles) {
        whereConditions.push(`role = ANY(ARRAY[${audience.roles.map((r: string) => `'${r}'`).join(',')}])`);
      }
      if (audience.status) {
        whereConditions.push(`status = '${audience.status}'`);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      users = await db.rawQueryAll<{ id: number; email: string; phone?: string }>(
        `SELECT id, email, phone FROM users ${whereClause}`
      );
    } else {
      users = await db.queryAll<{ id: number; email: string; phone?: string }>`
        SELECT id, email, phone FROM users
      `;
    }

    let successful = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const recipient = campaign.type === 'email' 
          ? user.email 
          : campaign.type === 'sms' || campaign.type === 'whatsapp'
          ? user.phone ?? ''
          : user.email;

        if (!recipient) {
          failed++;
          continue;
        }

        await sendNotification({
          userId: user.id,
          type: campaign.type,
          recipient,
          subject: campaign.subject,
          content: campaign.content,
        });

        successful++;
      } catch (error) {
        failed++;
      }
    }

    await db.exec`
      UPDATE notification_campaigns
      SET 
        status = 'sent',
        sent_at = CURRENT_TIMESTAMP,
        total_recipients = ${users.length},
        successful_sends = ${successful},
        failed_sends = ${failed}
      WHERE id = ${req.campaignId}
    `;

    await logAudit({
      action: 'send_campaign',
      resourceType: 'notification_campaigns',
      resourceId: req.campaignId.toString(),
      newValues: { successful, failed, total: users.length },
    });

    return { success: true, sent: successful, failed };
  }
);
