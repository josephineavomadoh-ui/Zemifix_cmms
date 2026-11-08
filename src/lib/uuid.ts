/**
 * ZemiFix CMMS — RFC 9562 Compliant UUIDv7 Generator
 * Provides monotonically increasing time-ordered UUIDs for database primary keys
 * preventing B-tree index fragmentation on high-throughput ledger tables.
 */
import { uuidv7 } from 'uuidv7';

export function generateUuidV7(): string {
  return uuidv7();
}

export function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
