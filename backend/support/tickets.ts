import { api, APIError, Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";
import { logAudit } from "../rbac/audit";

export interface SupportTicket {
  id: number;
  user_id?: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category?: string;
  assigned_to?: number;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id?: number;
  user_name: string;
  message: string;
  is_internal: boolean;
  attachments: string[];
  created_at: Date;
}

export interface CreateTicketRequest {
  subject: string;
  description: string;
  priority?: string;
  category?: string;
}

export interface ListTicketsRequest {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  priority?: Query<string>;
}

export interface AddMessageRequest {
  ticketId: number;
  message: string;
  isInternal?: boolean;
  attachments?: string[];
}

export interface UpdateTicketRequest {
  ticketId: number;
  status?: string;
  priority?: string;
  assignedTo?: number;
}

export const createTicket = api<CreateTicketRequest, SupportTicket>(
  { auth: true, expose: true, method: "POST", path: "/support/tickets" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const ticket = await db.queryRow<SupportTicket>`
      INSERT INTO support_tickets (
        user_id, subject, description, priority, category
      ) VALUES (
        ${userId},
        ${req.subject},
        ${req.description},
        ${req.priority ?? 'medium'},
        ${req.category ?? null}
      )
      RETURNING *
    `;

    await logAudit({
      action: 'create_support_ticket',
      resourceType: 'support_tickets',
      resourceId: ticket!.id.toString(),
      newValues: ticket,
    });

    return ticket!;
  }
);

export const listTickets = api<ListTicketsRequest, { tickets: SupportTicket[]; total: number }>(
  { auth: true, expose: true, method: "GET", path: "/support/tickets" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);
    const isStaff = ['super_admin', 'admin', 'staff'].includes(auth.role);

    const page = req.page ?? 1;
    const limit = req.limit ?? 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (!isStaff) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (req.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      params.push(req.status);
    }

    if (req.priority) {
      whereConditions.push(`priority = $${paramIndex++}`);
      params.push(req.priority);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM support_tickets ${whereClause}`;
    const totalResult = await db.rawQueryRow<{ total: number }>(countQuery, ...params);
    const total = totalResult?.total ?? 0;

    const ticketsQuery = `
      SELECT * FROM support_tickets
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const tickets = await db.rawQueryAll<SupportTicket>(ticketsQuery, ...params);

    return { tickets, total };
  }
);

export const getTicket = api<{ ticketId: number }, { ticket: SupportTicket; messages: TicketMessage[] }>(
  { auth: true, expose: true, method: "GET", path: "/support/tickets/:ticketId" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);
    const isStaff = ['super_admin', 'admin', 'staff'].includes(auth.role);

    const ticket = await db.queryRow<SupportTicket>`
      SELECT * FROM support_tickets WHERE id = ${req.ticketId}
    `;

    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }

    if (!isStaff && ticket.user_id !== userId) {
      throw APIError.permissionDenied("You don't have permission to view this ticket");
    }

    const messages = await db.queryAll<TicketMessage>`
      SELECT 
        tm.*,
        COALESCE(u.name, 'System') as user_name
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tm.ticket_id = ${req.ticketId}
        AND (tm.is_internal = false OR ${isStaff})
      ORDER BY tm.created_at ASC
    `;

    return { ticket, messages };
  }
);

export const addMessage = api<AddMessageRequest, TicketMessage>(
  { auth: true, expose: true, method: "POST", path: "/support/tickets/:ticketId/messages" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);
    const isStaff = ['super_admin', 'admin', 'staff'].includes(auth.role);

    const ticket = await db.queryRow<SupportTicket>`
      SELECT * FROM support_tickets WHERE id = ${req.ticketId}
    `;

    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }

    if (!isStaff && ticket.user_id !== userId) {
      throw APIError.permissionDenied("You don't have permission to add messages to this ticket");
    }

    const message = await db.queryRow<TicketMessage>`
      INSERT INTO ticket_messages (
        ticket_id, user_id, message, is_internal, attachments
      ) VALUES (
        ${req.ticketId},
        ${userId},
        ${req.message},
        ${req.isInternal ?? false},
        ${req.attachments ?? []}
      )
      RETURNING *
    `;

    await db.exec`
      UPDATE support_tickets
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${req.ticketId}
    `;

    await logAudit({
      action: 'add_ticket_message',
      resourceType: 'ticket_messages',
      resourceId: message!.id.toString(),
      newValues: message,
    });

    return message!;
  }
);

export const updateTicket = api<UpdateTicketRequest, SupportTicket>(
  { auth: true, expose: true, method: "PATCH", path: "/support/tickets/:ticketId" },
  async (req) => {
    const auth = getAuthData()!;
    const isStaff = ['super_admin', 'admin', 'staff'].includes(auth.role);

    if (!isStaff) {
      throw APIError.permissionDenied("Only staff can update tickets");
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(req.status);
      
      if (req.status === 'resolved' || req.status === 'closed') {
        updates.push('resolved_at = CURRENT_TIMESTAMP');
      }
    }

    if (req.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(req.priority);
    }

    if (req.assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      params.push(req.assignedTo);
    }

    const updateQuery = `
      UPDATE support_tickets
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    params.push(req.ticketId);
    const [ticket] = await db.rawQueryAll<SupportTicket>(updateQuery, ...params);

    await logAudit({
      action: 'update_ticket',
      resourceType: 'support_tickets',
      resourceId: req.ticketId.toString(),
      newValues: ticket,
    });

    return ticket;
  }
);
