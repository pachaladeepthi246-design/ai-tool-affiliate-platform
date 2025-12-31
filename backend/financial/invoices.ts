import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";
import { logAudit } from "../rbac/audit";

export interface Invoice {
  id: number;
  user_id: number;
  invoice_number: string;
  purchase_id?: number;
  subscription_id?: number;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  issued_at: Date;
  due_at?: Date;
  paid_at?: Date;
  pdf_url?: string;
  notes?: string;
}

export interface Refund {
  id: number;
  purchase_id?: number;
  invoice_id?: number;
  amount: number;
  reason?: string;
  status: string;
  stripe_refund_id?: string;
  created_at: Date;
  processed_at?: Date;
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

export const createInvoice = api<
  {
    userId: number;
    purchaseId?: number;
    subscriptionId?: number;
    amount: number;
    tax?: number;
  },
  Invoice
>(
  { expose: false, method: "POST", path: "/financial/invoices" },
  async (req) => {
    const tax = req.tax ?? req.amount * 0.1;
    const total = req.amount + tax;

    const invoice = await db.queryRow<Invoice>`
      INSERT INTO invoices (
        user_id, invoice_number, purchase_id, subscription_id,
        amount, tax, total, currency, status, paid_at
      ) VALUES (
        ${req.userId},
        ${generateInvoiceNumber()},
        ${req.purchaseId ?? null},
        ${req.subscriptionId ?? null},
        ${req.amount},
        ${tax},
        ${total},
        'USD',
        'paid',
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    await logAudit({
      action: 'create_invoice',
      resourceType: 'invoices',
      resourceId: invoice!.id.toString(),
      newValues: invoice,
    });

    return invoice!;
  }
);

export const getInvoice = api<{ invoiceId: number }, Invoice>(
  { auth: true, expose: true, method: "GET", path: "/financial/invoices/:invoiceId" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);
    const isAdmin = ['super_admin', 'admin'].includes(auth.role);

    const invoice = await db.queryRow<Invoice>`
      SELECT * FROM invoices WHERE id = ${req.invoiceId}
    `;

    if (!invoice) {
      throw APIError.notFound("Invoice not found");
    }

    if (!isAdmin && invoice.user_id !== userId) {
      throw APIError.permissionDenied("You don't have permission to view this invoice");
    }

    return invoice;
  }
);

export const listInvoices = api<void, { invoices: Invoice[] }>(
  { auth: true, expose: true, method: "GET", path: "/financial/invoices" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const invoices = await db.queryAll<Invoice>`
      SELECT * FROM invoices
      WHERE user_id = ${userId}
      ORDER BY issued_at DESC
    `;

    return { invoices };
  }
);

export const requestRefund = api<
  { purchaseId: number; reason: string },
  Refund
>(
  { auth: true, expose: true, method: "POST", path: "/financial/refunds" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const purchase = await db.queryRow<{ id: number; user_id: number; amount: number }>`
      SELECT id, user_id, amount FROM purchases WHERE id = ${req.purchaseId}
    `;

    if (!purchase) {
      throw APIError.notFound("Purchase not found");
    }

    if (purchase.user_id !== userId) {
      throw APIError.permissionDenied("You can only request refunds for your own purchases");
    }

    const existingRefund = await db.queryRow<{ id: number }>`
      SELECT id FROM refunds WHERE purchase_id = ${req.purchaseId}
    `;

    if (existingRefund) {
      throw APIError.alreadyExists("Refund already requested for this purchase");
    }

    const refund = await db.queryRow<Refund>`
      INSERT INTO refunds (
        purchase_id, amount, reason, status, requested_by
      ) VALUES (
        ${req.purchaseId},
        ${purchase.amount},
        ${req.reason},
        'pending',
        ${userId}
      )
      RETURNING *
    `;

    await logAudit({
      action: 'request_refund',
      resourceType: 'refunds',
      resourceId: refund!.id.toString(),
      newValues: refund,
    });

    return refund!;
  }
);

export const processRefund = api<
  { refundId: number; approved: boolean },
  Refund
>(
  { auth: true, expose: true, method: "POST", path: "/financial/refunds/:refundId/process" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);
    
    await requireRole('super_admin', 'admin')();

    const refund = await db.queryRow<Refund>`
      UPDATE refunds
      SET 
        status = ${req.approved ? 'approved' : 'rejected'},
        approved_by = ${userId},
        processed_at = CURRENT_TIMESTAMP
      WHERE id = ${req.refundId}
      RETURNING *
    `;

    if (!refund) {
      throw APIError.notFound("Refund not found");
    }

    if (req.approved && refund.purchase_id) {
      await db.exec`
        UPDATE purchases
        SET status = 'refunded'
        WHERE id = ${refund.purchase_id}
      `;
    }

    await logAudit({
      action: 'process_refund',
      resourceType: 'refunds',
      resourceId: req.refundId.toString(),
      newValues: refund,
    });

    return refund;
  }
);

async function requireRole(...roles: string[]) {
  const auth = getAuthData();
  if (!auth) {
    throw APIError.unauthenticated("Authentication required");
  }
  if (!roles.includes(auth.role)) {
    throw APIError.permissionDenied("Insufficient permissions");
  }
}
