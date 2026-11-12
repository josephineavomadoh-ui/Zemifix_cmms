// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

describe('notification PostgreSQL persistence migration', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE users (id UUID PRIMARY KEY);
      CREATE TABLE customer_contacts (id UUID PRIMARY KEY);
    `);
    const migrationPath = path.resolve(
      process.cwd(),
      'prisma/migrations/20261110000009_stage_r1_notifications/migration.sql'
    );
    await db.exec(await readFile(migrationPath, 'utf8'));
    await db.exec(`
      INSERT INTO users (id) VALUES ('00000000-0000-4000-8000-000000000001');
      INSERT INTO customer_contacts (id) VALUES ('00000000-0000-4000-8000-000000000002');
    `);
  }, 60_000);

  afterAll(async () => {
    await db.close();
  }, 60_000);

  it('persists an idempotent staff notification and keeps delivery attempts', async () => {
    const inserted = await db.query<{ id: string }>(`
      INSERT INTO notifications (
        "realm", "recipientUserId", "eventType", "idempotencyKey", "title", "body",
        "emailSubject", "emailBody"
      ) VALUES (
        'STAFF', '00000000-0000-4000-8000-000000000001',
        'WORK_ORDER_ASSIGNED', 'work-order:1:staff:1', 'Assigned', 'Work order assigned',
        'Assigned', 'Work order assigned'
      )
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING id
    `);
    expect(inserted.rows).toHaveLength(1);

    const duplicate = await db.query(`
      INSERT INTO notifications (
        "realm", "recipientUserId", "eventType", "idempotencyKey", "title", "body",
        "emailSubject", "emailBody"
      ) VALUES (
        'STAFF', '00000000-0000-4000-8000-000000000001',
        'WORK_ORDER_ASSIGNED', 'work-order:1:staff:1', 'Duplicate', 'Duplicate',
        'Duplicate', 'Duplicate'
      )
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING id
    `);
    expect(duplicate.rows).toHaveLength(0);

    const notificationId = inserted.rows[0].id;
    const delivery = await db.query<{ id: string }>(`
      INSERT INTO notification_email_deliveries ("notificationId")
      VALUES ($1) RETURNING id
    `, [notificationId]);
    await db.query(`
      INSERT INTO notification_delivery_attempts ("deliveryId", "attemptNumber", status, error, "completedAt")
      VALUES ($1, 1, 'FAILED', 'provider unavailable', NOW())
    `, [delivery.rows[0].id]);

    const persisted = await db.query<{ notification_count: number; attempt_count: number; error: string }>(`
      SELECT
        (SELECT COUNT(*)::int FROM notifications WHERE "idempotencyKey" = 'work-order:1:staff:1') AS notification_count,
        (SELECT COUNT(*)::int FROM notification_delivery_attempts WHERE "deliveryId" = $1) AS attempt_count,
        (SELECT error FROM notification_delivery_attempts WHERE "deliveryId" = $1 AND "attemptNumber" = 1) AS error
    `, [delivery.rows[0].id]);
    expect(persisted.rows[0]).toEqual({
      notification_count: 1,
      attempt_count: 1,
      error: 'provider unavailable',
    });
  });

  it('enforces separate staff and customer recipient realms', async () => {
    await expect(db.query(`
      INSERT INTO notifications (
        "realm", "recipientUserId", "recipientContactId", "eventType", "idempotencyKey",
        "title", "body", "emailSubject", "emailBody"
      ) VALUES (
        'STAFF', '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002', 'WORK_ORDER_ASSIGNED',
        'invalid-realm:1', 'Invalid', 'Invalid', 'Invalid', 'Invalid'
      )
    `)).rejects.toThrow();

    const portal = await db.query<{ id: string }>(`
      INSERT INTO notifications (
        "realm", "recipientContactId", "customerId", "eventType", "idempotencyKey",
        "title", "body", "emailSubject", "emailBody"
      ) VALUES (
        'CUSTOMER', '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000003', 'PORTAL_QUOTE_DECISION',
        'portal:quote:1', 'Decision received', 'Your decision was recorded',
        'Decision received', 'Your decision was recorded'
      )
      RETURNING id
    `);
    expect(portal.rows).toHaveLength(1);
    const ownerOnly = await db.query<{ id: string }>(`
      SELECT id FROM notifications
       WHERE "recipientUserId" = '00000000-0000-4000-8000-000000000001'
         AND "realm" = 'STAFF'
    `);
    expect(ownerOnly.rows).toHaveLength(1);
  });
});
