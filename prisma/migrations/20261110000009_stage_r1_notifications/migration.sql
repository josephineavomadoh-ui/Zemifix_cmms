CREATE TYPE "NotificationRealm" AS ENUM ('STAFF', 'CUSTOMER');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');
CREATE TYPE "NotificationAttemptStatus" AS ENUM ('STARTED', 'SENT', 'FAILED');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "realm" "NotificationRealm" NOT NULL,
  "recipientUserId" UUID,
  "recipientContactId" UUID,
  "customerId" UUID,
  "siteId" UUID,
  "branchId" UUID,
  "departmentId" UUID,
  "eventType" VARCHAR(60) NOT NULL,
  "idempotencyKey" VARCHAR(200) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" TEXT NOT NULL,
  "emailSubject" VARCHAR(180) NOT NULL,
  "emailBody" TEXT NOT NULL,
  "link" VARCHAR(500),
  "data" JSONB NOT NULL DEFAULT '{}',
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMPTZ,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  CONSTRAINT "notifications_realm_recipient_check" CHECK (
    ("realm" = 'STAFF' AND "recipientUserId" IS NOT NULL AND "recipientContactId" IS NULL)
    OR ("realm" = 'CUSTOMER' AND "recipientContactId" IS NOT NULL AND "recipientUserId" IS NULL)
  ),
  CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "notifications_recipientContactId_fkey" FOREIGN KEY ("recipientContactId") REFERENCES "customer_contacts"("id") ON DELETE CASCADE
);
CREATE INDEX "notifications_recipientUserId_readAt_createdAt_idx" ON "notifications"("recipientUserId", "readAt", "createdAt" DESC);
CREATE INDEX "notifications_recipientContactId_readAt_createdAt_idx" ON "notifications"("recipientContactId", "readAt", "createdAt" DESC);
CREATE INDEX "notifications_customerId_siteId_idx" ON "notifications"("customerId", "siteId");

CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recipientUserId" UUID,
  "recipientContactId" UUID,
  "eventType" VARCHAR(60) NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_preferences_realm_recipient_check" CHECK (
    ("recipientUserId" IS NOT NULL AND "recipientContactId" IS NULL)
    OR ("recipientContactId" IS NOT NULL AND "recipientUserId" IS NULL)
  ),
  CONSTRAINT "notification_preferences_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "notification_preferences_recipientContactId_fkey" FOREIGN KEY ("recipientContactId") REFERENCES "customer_contacts"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "notification_preferences_recipientUserId_eventType_key" ON "notification_preferences"("recipientUserId", "eventType");
CREATE UNIQUE INDEX "notification_preferences_recipientContactId_eventType_key" ON "notification_preferences"("recipientContactId", "eventType");

CREATE TABLE "notification_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "realm" "NotificationRealm" NOT NULL,
  "eventType" VARCHAR(60) NOT NULL,
  "titleTemplate" VARCHAR(180) NOT NULL,
  "bodyTemplate" TEXT NOT NULL,
  "emailSubject" VARCHAR(180) NOT NULL,
  "emailBody" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_templates_realm_eventType_key" UNIQUE ("realm", "eventType")
);

CREATE TABLE "notification_email_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "notificationId" UUID NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMPTZ,
  "sentAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "providerMessageId" VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_email_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_email_deliveries_notificationId_key" UNIQUE ("notificationId"),
  CONSTRAINT "notification_email_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE,
  CONSTRAINT "notification_email_deliveries_attemptCount_check" CHECK ("attemptCount" >= 0),
  CONSTRAINT "notification_email_deliveries_maxAttempts_check" CHECK ("maxAttempts" > 0)
);
CREATE INDEX "notification_email_deliveries_status_nextAttemptAt_idx" ON "notification_email_deliveries"("status", "nextAttemptAt");

CREATE TABLE "notification_delivery_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "deliveryId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "status" "NotificationAttemptStatus" NOT NULL DEFAULT 'STARTED',
  "attemptedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ,
  "error" TEXT,
  "providerMessageId" VARCHAR(255),
  CONSTRAINT "notification_delivery_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_delivery_attempts_deliveryId_attemptNumber_key" UNIQUE ("deliveryId", "attemptNumber"),
  CONSTRAINT "notification_delivery_attempts_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "notification_email_deliveries"("id") ON DELETE CASCADE
);
CREATE INDEX "notification_delivery_attempts_deliveryId_attemptedAt_idx" ON "notification_delivery_attempts"("deliveryId", "attemptedAt");

INSERT INTO "notification_templates" ("realm", "eventType", "titleTemplate", "bodyTemplate", "emailSubject", "emailBody") VALUES
('STAFF', 'WORK_ORDER_ASSIGNED', 'Work order assigned', '{{workOrderNumber}}: {{title}} was assigned to you.', 'Work order assigned: {{workOrderNumber}}', '{{workOrderNumber}}: {{title}} was assigned to you.'),
('STAFF', 'WORK_ORDER_REASSIGNED', 'Work order reassigned', '{{workOrderNumber}} was reassigned to another technician.', 'Work order reassigned: {{workOrderNumber}}', '{{workOrderNumber}} was reassigned to another technician.'),
('STAFF', 'WORK_ORDER_STATUS_CHANGED', 'Work order status changed', '{{workOrderNumber}} changed from {{fromStatus}} to {{toStatus}}.', 'Work order update: {{workOrderNumber}}', '{{workOrderNumber}} changed from {{fromStatus}} to {{toStatus}}.'),
('STAFF', 'WORK_REQUEST_NEW', 'New work request', '{{requestNumber}}: {{title}} was submitted.', 'New work request: {{requestNumber}}', '{{requestNumber}}: {{title}} was submitted.'),
('STAFF', 'WORK_REQUEST_DECIDED', 'Work request decision', '{{requestNumber}} was {{decision}}.', 'Work request update: {{requestNumber}}', '{{requestNumber}} was {{decision}}.'),
('STAFF', 'APPROVAL_REQUESTED', 'Approval requested', '{{entityType}} requires your approval.', 'Approval requested', '{{entityType}} requires your approval.'),
('STAFF', 'APPROVAL_DECIDED', 'Approval decision recorded', 'Your {{entityType}} request was {{decision}}.', 'Approval decision: {{entityType}}', 'Your {{entityType}} request was {{decision}}.'),
('STAFF', 'SLA_WARNING', 'SLA target approaching', '{{workOrderNumber}} is approaching its {{targetType}} target.', 'SLA warning: {{workOrderNumber}}', '{{workOrderNumber}} is approaching its {{targetType}} target.'),
('STAFF', 'SLA_BREACH', 'SLA target breached', '{{workOrderNumber}} has breached its {{targetType}} target.', 'SLA breach: {{workOrderNumber}}', '{{workOrderNumber}} has breached its {{targetType}} target.'),
('STAFF', 'LOW_STOCK', 'Stock below reorder level', '{{partNumber}} at {{storeName}} is at or below its reorder level.', 'Low stock alert: {{partNumber}}', '{{partNumber}} at {{storeName}} is at or below its reorder level.'),
('STAFF', 'PURCHASE_ORDER_ISSUED', 'Purchase order issued', '{{poNumber}} was issued.', 'Purchase order issued: {{poNumber}}', '{{poNumber}} was issued.'),
('STAFF', 'GOODS_RECEIVED', 'Goods received', '{{grnNumber}} was posted for {{poNumber}}.', 'Goods received: {{grnNumber}}', '{{grnNumber}} was posted for {{poNumber}}.'),
('STAFF', 'INVOICE_APPROVAL_REQUESTED', 'Invoice approval requested', 'An invoice is ready for approval.', 'Invoice approval requested', 'An invoice is ready for approval.'),
('STAFF', 'INVOICE_APPROVED', 'Invoice approved', '{{invoiceNumber}} was approved.', 'Invoice approved: {{invoiceNumber}}', '{{invoiceNumber}} was approved.'),
('STAFF', 'INVOICE_ISSUED', 'Invoice issued', '{{invoiceNumber}} was issued.', 'Invoice issued: {{invoiceNumber}}', '{{invoiceNumber}} was issued.'),
('STAFF', 'INVOICE_SENT', 'Invoice sent', '{{invoiceNumber}} was sent to the customer.', 'Invoice sent: {{invoiceNumber}}', '{{invoiceNumber}} was sent to the customer.'),
('STAFF', 'PAYMENT_RECORDED', 'Customer payment recorded', 'A payment was recorded for {{customerName}}.', 'Payment recorded', 'A customer payment was recorded for {{customerName}}.'),
('STAFF', 'PAYMENT_ALLOCATED', 'Payment allocated', 'A payment was allocated to {{invoiceNumber}}.', 'Payment allocation recorded', 'A payment was allocated to {{invoiceNumber}}.'),
('STAFF', 'CREDIT_NOTE_ISSUED', 'Credit note issued', '{{creditNoteNumber}} was issued.', 'Credit note issued: {{creditNoteNumber}}', '{{creditNoteNumber}} was issued.'),
('STAFF', 'PM_REMINDER', 'Preventive maintenance due', '{{workOrderNumber}} is scheduled for {{plannedStart}}.', 'Preventive maintenance reminder', '{{workOrderNumber}} is scheduled for {{plannedStart}}.'),
('STAFF', 'CUSTOMER_QUOTE_DECISION', 'Customer quote decision', '{{quoteNumber}} was {{decision}} by the customer.', 'Customer quote update: {{quoteNumber}}', '{{quoteNumber}} was {{decision}} by the customer.'),
('CUSTOMER', 'PORTAL_QUOTE_DECISION', 'Quote decision received', 'Your decision for {{quoteNumber}} has been recorded.', 'Quote decision received', 'Your decision for {{quoteNumber}} has been recorded.'),
('CUSTOMER', 'CUSTOMER_WORK_ORDER_STATUS', 'Work order update', 'Work order {{workOrderNumber}} status is now {{status}}.', 'Work order update: {{workOrderNumber}}', 'Work order {{workOrderNumber}} status is now {{status}}.'),
('CUSTOMER', 'CUSTOMER_INVOICE_ISSUED', 'Invoice available', 'A new invoice is available in your customer portal.', 'Invoice available', 'A new invoice is available in your customer portal.'),
('CUSTOMER', 'CUSTOMER_PAYMENT_RECORDED', 'Payment recorded', 'Your payment has been recorded.', 'Payment recorded', 'Your payment has been recorded.'),
('CUSTOMER', 'CUSTOMER_PAYMENT_ALLOCATED', 'Payment allocation updated', 'A payment has been allocated to an invoice in your account.', 'Payment allocation updated', 'A payment has been allocated to an invoice in your account.'),
('CUSTOMER', 'CUSTOMER_CREDIT_NOTE_ISSUED', 'Credit note available', 'A credit note is available in your customer portal.', 'Credit note available', 'A credit note is available in your customer portal.'),
('CUSTOMER', 'CUSTOMER_WORK_REQUEST_DECISION', 'Work request update', 'Your work request decision has been recorded.', 'Work request update', 'Your work request decision has been recorded.');
