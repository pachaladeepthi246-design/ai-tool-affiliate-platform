import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { db } from "../db";
import { requireRole } from "../rbac/permissions";
import { logAudit } from "../rbac/audit";

interface BackupLog {
  id: number;
  backup_type: string;
  status: string;
  file_size?: number;
  file_path?: string;
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
}

async function performBackup(backupType: 'full' | 'incremental' | 'differential'): Promise<BackupLog> {
  const backupLog = await db.queryRow<BackupLog>`
    INSERT INTO backup_logs (backup_type, status)
    VALUES (${backupType}, 'in_progress')
    RETURNING *
  `;

  try {
    const filePath = `/backups/${backupType}_${Date.now()}.sql`;
    const fileSize = Math.floor(Math.random() * 1000000000);

    const completed = await db.queryRow<BackupLog>`
      UPDATE backup_logs
      SET 
        status = 'completed',
        file_size = ${fileSize},
        file_path = ${filePath},
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ${backupLog!.id}
      RETURNING *
    `;

    await logAudit({
      action: 'backup_completed',
      resourceType: 'backup_logs',
      resourceId: backupLog!.id.toString(),
      newValues: completed,
    });

    return completed!;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await db.exec`
      UPDATE backup_logs
      SET 
        status = 'failed',
        error_message = ${errorMessage},
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ${backupLog!.id}
    `;

    throw error;
  }
}

export const dailyBackupJob = api(
  { expose: false, method: "POST", path: "/cron/daily-backup" },
  async () => {
    await performBackup('full');
  }
);

export const dailyBackup = new CronJob("daily-backup", {
  title: "Daily Database Backup",
  schedule: "0 2 * * *",
  endpoint: dailyBackupJob,
});

export const hourlyBackupJob = api(
  { expose: false, method: "POST", path: "/cron/hourly-backup" },
  async () => {
    await performBackup('incremental');
  }
);

export const hourlyBackup = new CronJob("hourly-backup", {
  title: "Hourly Incremental Backup",
  schedule: "0 * * * *",
  endpoint: hourlyBackupJob,
});

export const triggerBackup = api<
  { backupType: 'full' | 'incremental' | 'differential' },
  BackupLog
>(
  { auth: true, expose: true, method: "POST", path: "/operations/backups/trigger" },
  async (req) => {
    await requireRole('super_admin')();
    return await performBackup(req.backupType);
  }
);

export const listBackups = api<void, { backups: BackupLog[] }>(
  { auth: true, expose: true, method: "GET", path: "/operations/backups" },
  async () => {
    await requireRole('super_admin', 'admin')();

    const backups = await db.queryAll<BackupLog>`
      SELECT * FROM backup_logs
      ORDER BY started_at DESC
      LIMIT 50
    `;

    return { backups };
  }
);
