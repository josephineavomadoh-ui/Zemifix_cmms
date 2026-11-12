import { getQueuedOutboxMutations, openIndexedDb, QueuedOfflineMutation } from './db';

/**
 * Flushes client-side IndexedDB sync outbox queue to server batch API
 */
export async function flushOfflineSyncQueue(): Promise<{
  success: boolean;
  syncedCount: number;
  conflictCount: number;
  failedCount: number;
}> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: false, syncedCount: 0, conflictCount: 0, failedCount: 0 };
  }

  try {
    const queuedMutations = await getQueuedOutboxMutations();
    if (queuedMutations.length === 0) {
      return { success: true, syncedCount: 0, conflictCount: 0, failedCount: 0 };
    }

    const payload = {
      mutations: queuedMutations.map((m) => ({
        idempotencyKey: m.idempotencyKey,
        actionType: m.actionType,
        entityType: m.entityType,
        entityId: m.entityId,
        payload: m.payload,
      })),
    };

    const res = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync batch');

    // Update local IndexedDB outbox items based on server results
    const db = await openIndexedDb();
    const tx = db.transaction('syncOutbox', 'readwrite');
    const store = tx.objectStore('syncOutbox');

    for (const resultItem of data.results ?? []) {
      const itemKey = resultItem.idempotencyKey;
      if (resultItem.status === 'SYNCED') {
        store.delete(itemKey); // Remove synced item from client outbox
      } else if (resultItem.status === 'CONFLICT') {
        const getReq = store.get(itemKey);
        getReq.onsuccess = () => {
          if (getReq.result) {
            store.put({
              ...getReq.result,
              status: 'CONFLICT',
              errorMessage: resultItem.reason ?? 'Conflict detected',
            });
          }
        };
      }
    }

    return {
      success: true,
      syncedCount: data.syncedCount ?? 0,
      conflictCount: data.conflictCount ?? 0,
      failedCount: data.failedCount ?? 0,
    };
  } catch (err) {
    console.error('Offline sync flush failed:', err);
    return { success: false, syncedCount: 0, conflictCount: 0, failedCount: 0 };
  }
}
