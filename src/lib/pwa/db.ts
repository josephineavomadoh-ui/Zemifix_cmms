/**
 * Client-Side IndexedDB Storage Manager for Offline Technician PWA
 */

export interface CachedWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  asset?: any;
  location?: any;
  tasks?: any[];
  checklists?: any[];
  cachedAt: number;
}

export interface QueuedOfflineMutation {
  idempotencyKey: string;
  actionType: string; // WORK_ORDER_STATUS_SHIFT | CHECKLIST_UPDATE | LABOR_LOG | MATERIAL_ISSUE_REQUEST | METER_READING
  entityType: string;
  entityId: string;
  payload: any;
  timestamp: number;
  status: 'QUEUED' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  errorMessage?: string;
}

const DB_NAME = 'ZemiFixTechnicianPwaDB';
const DB_VERSION = 1;

export function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in current environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('cachedWorkOrders')) {
        db.createObjectStore('cachedWorkOrders', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('syncOutbox')) {
        const outbox = db.createObjectStore('syncOutbox', { keyPath: 'idempotencyKey' });
        outbox.createIndex('status', 'status', { unique: false });
        outbox.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export async function cacheWorkOrdersLocally(workOrders: CachedWorkOrder[]): Promise<void> {
  const db = await openIndexedDb();
  const tx = db.transaction('cachedWorkOrders', 'readwrite');
  const store = tx.objectStore('cachedWorkOrders');

  for (const wo of workOrders) {
    store.put({ ...wo, cachedAt: Date.now() });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedWorkOrdersLocally(): Promise<CachedWorkOrder[]> {
  const db = await openIndexedDb();
  const tx = db.transaction('cachedWorkOrders', 'readonly');
  const store = tx.objectStore('cachedWorkOrders');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as CachedWorkOrder[]);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineMutation(mutation: QueuedOfflineMutation): Promise<void> {
  const db = await openIndexedDb();
  const tx = db.transaction('syncOutbox', 'readwrite');
  const store = tx.objectStore('syncOutbox');

  store.put(mutation);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedOutboxMutations(): Promise<QueuedOfflineMutation[]> {
  const db = await openIndexedDb();
  const tx = db.transaction('syncOutbox', 'readonly');
  const store = tx.objectStore('syncOutbox');
  const index = store.index('status');
  const request = index.getAll('QUEUED');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as QueuedOfflineMutation[]);
    request.onerror = () => reject(request.error);
  });
}

export async function clearOfflineCache(): Promise<void> {
  const db = await openIndexedDb();
  const tx = db.transaction(['cachedWorkOrders', 'syncOutbox'], 'readwrite');
  tx.objectStore('cachedWorkOrders').clear();
  tx.objectStore('syncOutbox').clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
