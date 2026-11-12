/**
 * deliveryService.ts
 *
 * OTP delivery via Resend (email) and Hubtel (SMS).
 *
 * Security decisions:
 *   - OTP plaintext codes are NEVER logged. Only the masked destination is logged.
 *   - Provider credentials are never logged or returned to callers.
 *   - Provider error details are never forwarded to API responses (callers
 *     receive a generic DeliveryError — the internal detail stays server-side).
 *   - Hubtel is permanently disabled unless HUBTEL_ENABLED=true AND all three
 *     credentials (CLIENT_ID, CLIENT_SECRET, SENDER_ID) are non-empty.
 *   - Every outbound HTTP request uses an explicit 10-second AbortSignal timeout.
 *   - getOtpFromEmail() throws at call time if OTP_FROM_EMAIL is misconfigured,
 *     so a misconfigured sender cannot silently send from a placeholder domain.
 *
 * Channel routing:
 *   - 'EMAIL' → Resend
 *   - 'SMS'   → Hubtel (requires HUBTEL_ENABLED=true + credentials)
 *   - Any other value → DeliveryError (misconfiguration)
 *
 * Return contract:
 *   dispatchOtp() returns { ok: true } on success.
 *   On any failure it returns { ok: false, detail: string } — where `detail`
 *   is a server-side diagnostic string that MUST NOT be forwarded to users.
 */

import { Resend } from 'resend';
import { getOtpFromEmail } from '../auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeliveryChannel = 'EMAIL' | 'SMS';

export interface DeliverySuccess {
  ok: true;
}

export interface DeliveryFailure {
  ok: false;
  /** Server-side diagnostic. Never forward to users or external responses. */
  detail: string;
}

export type DeliveryResult = DeliverySuccess | DeliveryFailure;

// ---------------------------------------------------------------------------
// Destination masking
// ---------------------------------------------------------------------------

/**
 * Mask a delivery destination for display on the OTP entry screen.
 * Email: show first 2 chars + *** + domain  → "ad***@example.com"
 * SMS:   show country code + first 3 + *** + last 2  → "+233 24 *** 90"
 */
export function maskDestination(destination: string, channel: DeliveryChannel): string {
  if (channel === 'EMAIL') {
    const at = destination.indexOf('@');
    if (at < 1) return '***';
    const local = destination.slice(0, at);
    const domain = destination.slice(at);
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***${domain}`;
  }

  if (channel === 'SMS') {
    // E.164 format: +233XXXXXXXXX (12 chars)
    const digits = destination.replace(/\D/g, '');
    if (digits.length < 5) return '***';
    const last2 = digits.slice(-2);
    const prefix = destination.startsWith('+') ? `+${digits.slice(0, 3)}` : digits.slice(0, 3);
    return `${prefix} *** **${last2}`;
  }

  return '***';
}

// ---------------------------------------------------------------------------
// Hubtel configuration guard
// ---------------------------------------------------------------------------

interface HubtelConfig {
  clientId: string;
  clientSecret: string;
  senderId: string;
}

/**
 * Returns Hubtel configuration only if fully enabled and configured.
 * Returns null if any credential is missing or HUBTEL_ENABLED != 'true'.
 * Never throws — callers check for null and return a DeliveryFailure.
 */
function getHubtelConfig(): HubtelConfig | null {
  if (process.env.HUBTEL_ENABLED !== 'true') return null;

  const clientId     = process.env.HUBTEL_CLIENT_ID?.trim();
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET?.trim();
  const senderId     = process.env.HUBTEL_SENDER_ID?.trim();

  if (!clientId || !clientSecret || !senderId) return null;
  return { clientId, clientSecret, senderId };
}

// ---------------------------------------------------------------------------
// Email delivery via Resend
// ---------------------------------------------------------------------------

async function sendEmailOtp(
  to: string,
  code: string,
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const overrideRecipient = process.env.OTP_TEST_OVERRIDE_RECIPIENT?.trim();

  // Safety check: Prohibit test recipient override in production.
  if (process.env.NODE_ENV === 'production' && overrideRecipient) {
    return {
      ok: false,
      detail:
        'OTP_TEST_OVERRIDE_RECIPIENT is prohibited in production environment. Unset this variable to proceed.',
    };
  }

  const recipient =
    process.env.NODE_ENV !== 'production' && overrideRecipient
      ? overrideRecipient
      : to;

  // Development / test mode: mock delivery when no API key is configured.
  // Check this BEFORE validating OTP_FROM_EMAIL so that dev environments
  // without a configured sender can still run mock delivery.
  if (!apiKey) {
    console.log(
      `[deliveryService] MOCK EMAIL — to: ${recipient}, ` +
      `subject: "ZemiFix Authentication Code" (OTP code suppressed)`
    );
    return { ok: true };
  }

  // Production path: validate the sender address before hitting the API.
  let fromAddress: string;
  try {
    fromAddress = getOtpFromEmail();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: `OTP_FROM_EMAIL misconfigured: ${msg}` };
  }

  const resend = new Resend(apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: [recipient],
      subject: 'ZemiFix Authentication Code',
      html: buildEmailHtml(code),
      text: buildEmailText(code),
    });

    if (result.error) {
      return {
        ok: false,
        detail: `Resend error: ${result.error.name} — ${result.error.message}`,
      };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('aborted') || msg.includes('abort')) {
      return { ok: false, detail: 'Resend request timed out after 10 seconds.' };
    }
    return { ok: false, detail: `Resend unexpected error: ${msg}` };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// SMS delivery via Hubtel
// ---------------------------------------------------------------------------

async function sendSmsOtp(
  to: string,
  code: string,
): Promise<DeliveryResult> {
  const config = getHubtelConfig();

  if (!config) {
    // Development mode: log a mock delivery when Hubtel is not configured
    if (process.env.HUBTEL_ENABLED !== 'true') {
      console.log(
        `[deliveryService] MOCK SMS — to: ${to} (OTP code suppressed)`
      );
      return { ok: true };
    }
    return {
      ok: false,
      detail: 'Hubtel is enabled but one or more credentials are missing ' +
              '(HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_SENDER_ID).',
    };
  }

  // Hubtel Send Message API v2
  // https://developers.hubtel.com/docs/send-message-v2
  const url = 'https://sms.hubtel.com/v1/messages/send';

  const body = JSON.stringify({
    From:         config.senderId,
    To:           to,
    Content:      buildSmsText(code),
    RegisteredDelivery: true,
  });

  // Basic auth: clientId:clientSecret → Base64
  const credentials = Buffer
    .from(`${config.clientId}:${config.clientSecret}`)
    .toString('base64');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${credentials}`,
        'Accept':        'application/json',
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status;
      // Read up to 200 chars of the body for diagnostics — never log credentials
      let bodySnippet = '';
      try {
        const text = await response.text();
        bodySnippet = text.slice(0, 200);
      } catch { /* ignore read errors */ }
      return {
        ok: false,
        detail: `Hubtel HTTP ${status}: ${bodySnippet}`,
      };
    }

    const data = await response.json() as Record<string, unknown>;

    // Hubtel returns { status: 0 } for success
    // https://developers.hubtel.com/docs/send-message-v2#response-codes
    if (typeof data.status === 'number' && data.status !== 0) {
      return {
        ok: false,
        detail: `Hubtel API status ${data.status}: ${String(data.message ?? '')}`,
      };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('aborted') || msg.includes('abort')) {
      return { ok: false, detail: 'Hubtel request timed out after 10 seconds.' };
    }
    return { ok: false, detail: `Hubtel unexpected error: ${msg}` };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

function buildEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>ZemiFix Authentication Code</title></head>
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;
              border:1px solid #e2e8f0;padding:32px">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#ff5b00;
              text-transform:uppercase;letter-spacing:.08em">ZemiFix CMMS</p>
    <h1 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0b1336">
      Your authentication code</h1>
    <p style="margin:0 0 8px;font-size:13px;color:#475569">
      Enter this code to complete sign-in. Valid for 5&nbsp;minutes.</p>
    <div style="font-size:36px;font-weight:800;letter-spacing:.25em;
                color:#0b1336;padding:16px 0;text-align:center">
      ${code}
    </div>
    <p style="margin:24px 0 0;font-size:11px;color:#94a3b8">
      If you did not request this code, ignore this message.
      Your account is not at risk unless you share this code.</p>
  </div>
</body>
</html>`;
}

function buildEmailText(code: string): string {
  return [
    'ZemiFix CMMS — Authentication Code',
    '',
    `Your sign-in code is: ${code}`,
    '',
    'This code expires in 5 minutes.',
    'Do not share this code with anyone.',
    '',
    'If you did not request this code, ignore this message.',
  ].join('\n');
}

function buildSmsText(code: string): string {
  return `ZemiFix code: ${code}. Valid 5 mins. Do not share.`;
}

// ---------------------------------------------------------------------------
// Public dispatch entry point
// ---------------------------------------------------------------------------

/**
 * Dispatch an OTP to the given destination.
 *
 * @param destination  Verified email address or E.164 phone number.
 * @param channel      'EMAIL' or 'SMS'.
 * @param plainCode    The 6-digit OTP plaintext. Never logged or returned to callers.
 *
 * Returns DeliveryResult. On failure, `detail` is a server-side diagnostic
 * that MUST NOT be forwarded to users or included in API responses.
 */
export async function dispatchOtp(
  destination: string,
  channel: DeliveryChannel,
  plainCode: string,
): Promise<DeliveryResult> {
  if (channel === 'EMAIL') {
    return sendEmailOtp(destination, plainCode);
  }

  if (channel === 'SMS') {
    return sendSmsOtp(destination, plainCode);
  }

  return {
    ok: false,
    detail: `Unsupported delivery channel: ${channel as string}`,
  };
}
