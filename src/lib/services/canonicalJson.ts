import crypto from 'crypto';

/**
 * Recursive canonical JSON stringifier.
 * Guarantees 100% deterministic byte serialization without floating-point conversion.
 * Handles Prisma Decimals, BigInts, Dates, Arrays, and sorted Object keys.
 */
export function canonicalizeJson(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      throw new Error('CANONICAL_JSON_ERROR: Non-finite numbers (NaN, Infinity) are prohibited.');
    }
    return JSON.stringify(val);
  }

  if (typeof val === 'string') return JSON.stringify(val);
  if (typeof val === 'bigint') return JSON.stringify(val.toString());
  if (val instanceof Date) return JSON.stringify(val.toISOString());

  // Decimal / Object check
  if (typeof val === 'object') {
    // Prisma Decimal check (preserves string precision without converting to JS float)
    if ('s' in val && 'e' in val && 'd' in val) {
      return JSON.stringify((val as any).toString());
    }
    if ('toFixed' in val && typeof (val as any).toFixed === 'function') {
      return JSON.stringify((val as any).toString());
    }

    if (Array.isArray(val)) {
      const items = val.map((item) => (item === undefined ? 'null' : canonicalizeJson(item)));
      return '[' + items.join(',') + ']';
    }

    // Sorted Object Keys
    const keys = Object.keys(val as Record<string, unknown>).sort();
    const pairs: string[] = [];
    for (const k of keys) {
      const v = (val as Record<string, unknown>)[k];
      if (v !== undefined) {
        pairs.push(`${JSON.stringify(k)}:${canonicalizeJson(v)}`);
      }
    }
    return '{' + pairs.join(',') + '}';
  }

  throw new Error(`CANONICAL_JSON_ERROR: Unsupported value type "${typeof val}".`);
}

export function computePayloadHash(payload: Record<string, unknown>, secret: string): string {
  const canonicalString = canonicalizeJson(payload);
  return crypto.createHmac('sha256', secret).update(canonicalString).digest('hex');
}
