# Stage R1 Notifications

## Database

The notification schema is introduced by the additive migration
`20261110000009_stage_r1_notifications`. Apply it through the normal migration
deployment process (`npx prisma migrate deploy`); do not use `prisma db push` or
reset an environment. Regenerate the Prisma client after schema changes with
`npx prisma generate`.

The migration installs default staff and customer templates. Administrators can
edit or disable templates through `GET` and `PUT /api/notifications/templates`.
Template variables use `{{variableName}}` placeholders. Message content is
plain text and is escaped by the React notification centre when rendered.

## Email delivery worker

Set `RESEND_API_KEY` and `NOTIFICATIONS_EMAIL_FROM` to enable the Resend adapter.
The adapter implements `NotificationEmailProvider`, so another provider can be
added without changing business services. Email jobs and attempt records are
created in the business transaction; sending occurs later in the worker.

Set `NOTIFICATION_WORKER_SECRET` to a random secret of at least 32 characters.
An external scheduler should call `POST /api/internal/notifications/process`
with `Authorization: Bearer <secret>`. The worker evaluates active SLA targets,
creates reminders for preventive work orders scheduled in the next 24 hours,
and processes pending email. Delivery retries use
exponential backoff, a 15-minute worker lease, a five-attempt limit, and the
delivery ID as the Resend idempotency key.

## API surfaces

- Staff center: `GET /api/notifications`; `PATCH /api/notifications/:id/read`;
  `POST /api/notifications/read-all`; and `GET`/`PUT
  /api/notifications/preferences`.
- Customer portal center: the matching endpoints under
  `/api/portal/notifications`.
- Preferences and read operations are bound to the authenticated staff user or
  portal contact. Portal notifications are additionally bound to the contact's
  customer account.

Staff and customer templates, recipients, and APIs use separate realms. Customer
messages avoid internal notes and financial amounts; financial updates are
limited to active contacts with financial access and, when applicable, a grant
for the invoice site.
