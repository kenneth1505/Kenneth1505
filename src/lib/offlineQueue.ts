// Helper to manage offline operations queue for KEINSHOP
export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  timestamp: string;
  resource: string; // 'inventory' | 'special_order' | 'accounting' | 'clients'
  action: string;   // 'create' | 'update' | 'delete' | 'restore'
}

const DB_NAME = 'KeinshopOfflineDB';
const STORE_NAME = 'requests_queue';
const DB_VERSION = 1;

function getIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    } catch (e) {
      resolve(null);
    }
  });
}

export async function enqueueRequest(req: Omit<OfflineRequest, 'id' | 'timestamp'>): Promise<OfflineRequest> {
  const offlineReq: OfflineRequest = {
    ...req,
    id: `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString()
  };

  const db = await getIDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const addRequest = store.add(offlineReq);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
      return offlineReq;
    } catch (e) {
      console.warn("IndexedDB write failed, falling back to LocalStorage:", e);
    }
  }

  // Fallback to localStorage
  try {
    const queue = JSON.parse(localStorage.getItem('keinshop_offline_queue') || '[]');
    queue.push(offlineReq);
    localStorage.setItem('keinshop_offline_queue', JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to store in localStorage fallback:", e);
  }
  return offlineReq;
}

export async function getQueuedRequests(): Promise<OfflineRequest[]> {
  const db = await getIDB();
  if (db) {
    try {
      return await new Promise<OfflineRequest[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });
    } catch (e) {
      console.warn("IndexedDB read failed, falling back to LocalStorage:", e);
    }
  }

  // Fallback to localStorage
  try {
    return JSON.parse(localStorage.getItem('keinshop_offline_queue') || '[]');
  } catch (e) {
    return [];
  }
}

export async function dequeueRequest(id: string): Promise<void> {
  const db = await getIDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const deleteRequest = store.delete(id);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
      return;
    } catch (e) {
      console.warn("IndexedDB delete failed, falling back to LocalStorage:", e);
    }
  }

  // Fallback to localStorage
  try {
    let queue = JSON.parse(localStorage.getItem('keinshop_offline_queue') || '[]');
    queue = queue.filter((item: OfflineRequest) => item.id !== id);
    localStorage.setItem('keinshop_offline_queue', JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to delete from localStorage:", e);
  }
}

export async function clearQueue(): Promise<void> {
  const db = await getIDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });
    } catch (e) {
      console.warn("IndexedDB clear failed, falling back to LocalStorage:", e);
    }
  }
  localStorage.removeItem('keinshop_offline_queue');
}
