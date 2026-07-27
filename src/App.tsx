import React, { useState } from 'react';
import { 
  Home, 
  Package, 
  BookOpen, 
  ShoppingBag, 
  Users, 
  DollarSign, 
  Calendar, 
  BarChart, 
  Sparkles, 
  Settings,
  History,
  Undo,
  Key,
  RefreshCw
} from 'lucide-react';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import Catalogo from './components/Catalogo';
import PedidosEspeciales from './components/PedidosEspeciales';
import ClientesAgenda from './components/ClientesAgenda';
import GestionContable from './components/GestionContable';
import CalendarioContenido from './components/CalendarioContenido';
import ReportesKPI from './components/ReportesKPI';
import AsesoresIA from './components/AsesoresIA';
import Configuracion from './components/Configuracion';
import PublicCatalog from './components/PublicCatalog';
import PublicTracking from './components/PublicTracking';
import AuthGate from './components/AuthGate';
import ApiKeysManagement from './components/ApiKeysManagement';

import { 
  INITIAL_PRODUCTS, 
  INITIAL_CLIENTS, 
  INITIAL_SPECIAL_ORDERS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_PUBLICATIONS, 
  INITIAL_RECOMMENDATIONS, 
  INITIAL_AUDIT_LOGS 
} from './data';

import { Product, Client, SpecialOrder, Transaction, Publication, AIRecommendation, AuditLog, UserRole } from './types';
import { enqueueRequest, getQueuedRequests, dequeueRequest, clearQueue } from './lib/offlineQueue';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db as firestoreDb } from './lib/firebase';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("keinshop_local_db", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbGet = async (key: string): Promise<any> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("kv", "readonly");
      const store = transaction.objectStore("kv");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB get error:", e);
    return null;
  }
};

const idbSet = async (key: string, val: any): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("kv", "readwrite");
      const store = transaction.objectStore("kv");
      const request = store.put(val, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB set error:", e);
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    console.warn(`[Storage Warning] Failed to write key "${key}" to localStorage:`, e);
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.number === 0x8007000E) {
      console.warn("[Storage Warning] LocalStorage quota exceeded. Relying on IndexedDB backup store.");
    }
  }
  try {
    idbSet(key, value).catch(idbErr => console.error("idbSet failed:", idbErr));
  } catch (idbErr) {
    console.error("idbSet synchronous catch failed:", idbErr);
  }
};

// Firestore Synchronization Helpers
let isClientQuotaExceeded = false;

const handleClientFirestoreError = (action: string, err: any) => {
  const errMsg = err?.message || String(err || "");
  const errCode = err?.code || "";
  if (errMsg.includes("resource-exhausted") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota limit exceeded") || errCode === "resource-exhausted" || errCode === "8") {
    if (!isClientQuotaExceeded) {
      isClientQuotaExceeded = true;
      console.warn("[Firestore Client Sync] Free daily write quota reached for Firestore project. App will rely on backend SQLite and local state persistence.");
    }
  } else {
    console.error(`[Firestore Sync] Error during ${action}:`, err);
  }
};

const syncItemToFirestore = async (collectionName: string, id: string, data: any) => {
  if (isClientQuotaExceeded || !firestoreDb) return;
  try {
    const docRef = doc(firestoreDb, collectionName, id);
    // Serialize nested complex structures into _raw to avoid schema issues, as done in backend SQLite -> Firestore sync
    const firestoreData = {
      ...data,
      _raw: JSON.stringify(data),
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, firestoreData);
    console.log(`[Firestore Sync] Successfully saved ${id} to ${collectionName}`);
  } catch (err) {
    handleClientFirestoreError(`saving ${id} to ${collectionName}`, err);
  }
};

const deleteItemFromFirestore = async (collectionName: string, id: string) => {
  if (isClientQuotaExceeded || !firestoreDb) return;
  try {
    const docRef = doc(firestoreDb, collectionName, id);
    await deleteDoc(docRef);
    console.log(`[Firestore Sync] Successfully deleted ${id} from ${collectionName}`);
  } catch (err) {
    handleClientFirestoreError(`deleting ${id} from ${collectionName}`, err);
  }
};

const syncCollectionFromFirestore = async <T extends { id?: string; sku?: string }>(
  collectionName: string,
  localItems: T[],
  idField: 'id' | 'sku' = 'id'
): Promise<T[]> => {
  try {
    console.log(`[Firestore Sync] Fetching collection '${collectionName}'...`);
    const q = collection(firestoreDb, collectionName);
    const querySnapshot = await getDocs(q);
    const firestoreItems: T[] = [];
    querySnapshot.forEach((docSnap) => {
      const docData = docSnap.data();
      if (docData) {
        let parsed: T | null = null;
        if (docData._raw) {
          try {
            parsed = JSON.parse(docData._raw) as T;
          } catch (e) {
            console.error(`Error parsing _raw in ${collectionName}:`, e);
          }
        }
        if (!parsed) {
          parsed = {
            ...docData,
            [idField]: docSnap.id
          } as unknown as T;
        }
        if (parsed) {
          firestoreItems.push(parsed);
        }
      }
    });

    const firestoreKeys = new Set(firestoreItems.map(item => idField === 'sku' ? item.sku : item.id).filter(Boolean) as string[]);

    const mergedMap = new Map<string, T>();
    
    // Always keep all local items in the merged set so local additions are never deleted
    localItems.forEach(item => {
      const key = idField === 'sku' ? item.sku : item.id;
      if (key) {
        mergedMap.set(key, item);
      }
    });

    firestoreItems.forEach(item => {
      const key = idField === 'sku' ? item.sku : item.id;
      if (key) {
        const existing = mergedMap.get(key);
        if (!existing) {
          mergedMap.set(key, item);
        } else {
          const localTime = (existing as any).updated_at || (existing as any).updatedAt || '';
          const firestoreTime = (item as any).updated_at || (item as any).updatedAt || '';
          if (!localTime || firestoreTime >= localTime) {
            mergedMap.set(key, item);
          }
        }
      }
    });

    return Array.from(mergedMap.values());
  } catch (err) {
    console.error(`[Firestore Sync] Error fetching collection '${collectionName}':`, err);
    return localItems;
  }
};

export default function App() {
  
  // App Loading state
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Auth state variables
  const [jwtToken, setJwtToken] = useState<string | null>(() => localStorage.getItem('keinshop_jwt_token'));
  const [jwtUser, setJwtUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('keinshop_user_info');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [onlineAdmins, setOnlineAdmins] = useState<string[]>([]);

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');

  // Core States
  const [role, setRole] = useState<UserRole>('Admin');
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('keinshop_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((item: any) => item.is_demo !== true && item.isdemo !== true) : [];
      } catch (e) {
        console.error("Error parsing saved products:", e);
      }
    }
    return [];
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('keinshop_clients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((item: any) => item.is_demo !== true && item.isdemo !== true) : [];
      } catch (e) {
        console.error("Error parsing saved clients:", e);
      }
    }
    return [];
  });
  const [orders, setOrders] = useState<SpecialOrder[]>(() => {
    const saved = localStorage.getItem('keinshop_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((item: any) => item.is_demo !== true && item.isdemo !== true) : [];
      } catch (e) {
        console.error("Error parsing saved orders:", e);
      }
    }
    return [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('keinshop_transactions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((t: any) => t.is_demo !== true && t.isdemo !== true) : [];
      } catch (e) {
        console.error("Error parsing saved transactions:", e);
      }
    }
    return [];
  });
  const [publications, setPublications] = useState<Publication[]>(() => {
    const saved = localStorage.getItem('keinshop_publications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((p: any) => p.is_demo !== true && p.isdemo !== true) : [];
      } catch (e) {
        console.error("Error parsing saved publications:", e);
      }
    }
    return [];
  });
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Previous state refs for incremental Firestore synchronization
  const prevProductsRef = React.useRef<Product[]>(products);
  const prevClientsRef = React.useRef<Client[]>(clients);
  const prevOrdersRef = React.useRef<SpecialOrder[]>(orders);
  const prevTransactionsRef = React.useRef<Transaction[]>(transactions);
  const prevPublicationsRef = React.useRef<Publication[]>(publications);

  // Network and offline/conflict state variables
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [showSyncToast, setShowSyncToast] = useState(false);
  const [syncToastMsg, setSyncToastMsg] = useState('');
  const [activeConflict, setActiveConflict] = useState<{
    resource: string;
    id: string;
    currentVersion: number;
    incomingVersion: number;
    currentData: any;
    incomingData: any;
    onResolve: (resolvedData: any) => void;
    onCancel: () => void;
  } | null>(null);

  const updatePendingCount = async () => {
    const queued = await getQueuedRequests();
    setPendingQueueCount(queued.length);
  };

  const fetchServerAuditLogs = async () => {
    try {
      const token = jwtToken || localStorage.getItem('keinshop_jwt_token');
      if (!token) return;

      const headers: any = {
        'Content-Type': 'application/json'
      };
      headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/admin/audit-logs', {
        headers
      });
      if (response.ok) {
        const logs = await response.json();
        const mappedLogs = logs.map((log: any) => {
          let moduleName = "Auditoría";
          const target = (log.target_type || "").toLowerCase();
          if (target === "accounting" || target === "transaction" || target === "entries") {
            moduleName = "Contabilidad";
          } else if (target === "inventory" || target === "product") {
            moduleName = "Inventario";
          } else if (target === "special_order" || target === "order") {
            moduleName = "Pedidos";
          } else if (target === "clients" || target === "client") {
            moduleName = "Clientes";
          } else if (target === "audit_logs" || target === "audit_log") {
            moduleName = "Auditoría";
          }

          let actionStr = log.action || "Acción";
          if (log.metadata && log.metadata.action_performed) {
            actionStr = log.metadata.action_performed;
          } else if (log.metadata && log.metadata.description) {
            actionStr = `${log.action}: ${log.metadata.description}`;
          } else if (log.action === "DELETE") {
            actionStr = `[BORRADO] Se eliminó el elemento ${log.target_id}`;
          } else if (log.action === "CREATE") {
            actionStr = `[CREACIÓN] Se creó el elemento ${log.target_id}`;
          } else if (log.action === "EDIT") {
            actionStr = `[EDICIÓN] Se modificó el elemento ${log.target_id}`;
          }

          let logUser = "Administrador";
          if (log.metadata && log.metadata.usuario) {
            logUser = log.metadata.usuario;
          } else if (log.metadata && log.metadata.user_email) {
            logUser = log.metadata.user_email;
          } else if (log.user_id) {
            logUser = log.user_id;
          }

          return {
            id: log.id || `LOG-0${Date.now()}`,
            timestamp: log.created_at || new Date().toISOString(),
            user: logUser,
            action: actionStr,
            module: moduleName
          };
        });
        setAuditLogs(mappedLogs);
      }
    } catch (error) {
      console.error("Error loading server audit logs:", error);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'configuracion' && role === 'Admin') {
      fetchServerAuditLogs();
    }
  }, [activeTab, role]);

  const triggerSyncToast = (msg: string) => {
    setSyncToastMsg(msg);
    setShowSyncToast(true);
    setTimeout(() => setShowSyncToast(false), 4000);
  };

  const mergeServerAndLocalList = <T extends { id?: string; sku?: string; updated_at?: string; updatedAt?: string; deleted_at?: string; status?: string }>(
    serverList: T[],
    localList: T[],
    idField: 'id' | 'sku' = 'id'
  ): T[] => {
    const map = new Map<string, T>();

    (serverList || []).forEach(item => {
      if (!item) return;
      const key = idField === 'sku' ? item.sku : item.id;
      if (key && !item.deleted_at && item.status !== 'deleted' && (item.status as string) !== 'inactive_deleted' && (item as any).is_demo !== true && (item as any).isdemo !== true) {
        map.set(key, item);
      }
    });

    (localList || []).forEach(item => {
      if (!item) return;
      const key = idField === 'sku' ? item.sku : item.id;
      if (key && !item.deleted_at && item.status !== 'deleted' && (item.status as string) !== 'inactive_deleted' && (item as any).is_demo !== true && (item as any).isdemo !== true) {
        const existing = map.get(key);
        if (!existing) {
          if ((item as any).pending_sync === true) {
            map.set(key, item);
          }
        } else {
          const localTime = item.updated_at || item.updatedAt || '';
          const serverTime = existing.updated_at || existing.updatedAt || '';
          if ((item as any).pending_sync === true || (localTime && localTime >= serverTime)) {
            map.set(key, { ...existing, ...item });
          }
        }
      }
    });

    return Array.from(map.values());
  };

  const syncAllData = async () => {
    try {
      const fetchSafe = async (url: string) => {
        try {
          const res = await fetch(url);
          return res.ok ? res : null;
        } catch (e) {
          console.error(`[Sync] Safe fetch error for ${url}:`, e);
          return null;
        }
      };

      const [ordersRes, txsRes, clientsRes, productsRes, publicationsRes] = await Promise.all([
        fetchSafe('/api/special-orders'),
        fetchSafe('/api/accounting/entries'),
        fetchSafe('/api/clients'),
        fetchSafe('/api/inventory'),
        fetchSafe('/api/publications')
      ]);

      if (ordersRes) {
        const serverOrders = await ordersRes.json();
        const savedStr = localStorage.getItem('keinshop_orders');
        let localItems: SpecialOrder[] = [];
        if (savedStr) {
          try {
            localItems = JSON.parse(savedStr).filter((item: any) => item.is_demo !== true && item.isdemo !== true);
          } catch (e) {}
        }
        
        const mergedOrders = mergeServerAndLocalList(serverOrders, localItems, 'id');
        setOrders(mergedOrders);
        safeSetItem('keinshop_orders', JSON.stringify(mergedOrders));

        const pendingLocalItems = mergedOrders.filter(item => 
          item.id && 
          !item.deleted_at && 
          item.status !== 'deleted' &&
          (item as any).pending_sync === true
        );

        if (pendingLocalItems.length > 0) {
          console.log(`[Sync] Uploading ${pendingLocalItems.length} offline/local orders to server...`);
          for (const item of pendingLocalItems) {
            try {
              const formData = new FormData();
              Object.entries(item).forEach(([key, val]) => {
                if (key === 'photos') {
                  formData.append("photos", JSON.stringify(val || []));
                } else if (key === 'items') {
                  formData.append("items", JSON.stringify(val || []));
                } else {
                  formData.append(key, String(val ?? ''));
                }
              });
              await fetch('/api/admin/special-orders', { method: 'POST', body: formData });
            } catch (err) { console.error(`[Sync] Failed to upload order ${item.id}:`, err); }
          }
          const updatedRes = await fetch('/api/special-orders');
          if (updatedRes.ok) {
            const freshServerOrders = await updatedRes.json();
            const reMerged = mergeServerAndLocalList(freshServerOrders, mergedOrders, 'id');
            setOrders(reMerged);
            safeSetItem('keinshop_orders', JSON.stringify(reMerged));
          }
        }
      }

      if (txsRes) {
        const serverTxs = await txsRes.json();
        const savedStr = localStorage.getItem('keinshop_transactions');
        let localItems: Transaction[] = [];
        if (savedStr) {
          try {
            localItems = JSON.parse(savedStr).filter((item: any) => item.is_demo !== true && item.isdemo !== true);
          } catch (e) {}
        }

        const mergedTxs = mergeServerAndLocalList(serverTxs, localItems, 'id');
        setTransactions(mergedTxs);
        safeSetItem('keinshop_transactions', JSON.stringify(mergedTxs));

        const pendingLocalItems = mergedTxs.filter(item => 
          item.id && 
          !item.deleted_at && 
          (item as any).pending_sync === true
        );

        if (pendingLocalItems.length > 0) {
          console.log(`[Sync] Uploading ${pendingLocalItems.length} offline/local transactions to server...`);
          for (const item of pendingLocalItems) {
            try {
              await fetch('/api/accounting/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
            } catch (err) { console.error(`[Sync] Failed to upload transaction ${item.id}:`, err); }
          }
          const updatedRes = await fetch('/api/accounting/entries');
          if (updatedRes.ok) {
            const freshServerTxs = await updatedRes.json();
            const reMerged = mergeServerAndLocalList(freshServerTxs, mergedTxs, 'id');
            setTransactions(reMerged);
            safeSetItem('keinshop_transactions', JSON.stringify(reMerged));
          }
        }
      }

      if (clientsRes) {
        const serverClients = await clientsRes.json();
        const savedStr = localStorage.getItem('keinshop_clients');
        let localItems: Client[] = [];
        if (savedStr) {
          try {
            localItems = JSON.parse(savedStr).filter((item: any) => item.is_demo !== true && item.isdemo !== true);
          } catch (e) {}
        }

        const mergedClients = mergeServerAndLocalList(serverClients, localItems, 'id');
        setClients(mergedClients);
        safeSetItem('keinshop_clients', JSON.stringify(mergedClients));

        const pendingLocalItems = mergedClients.filter(item => 
          item.id && 
          !item.deleted_at && 
          (item as any).pending_sync === true
        );

        if (pendingLocalItems.length > 0) {
          console.log(`[Sync] Uploading ${pendingLocalItems.length} offline/local clients to server...`);
          for (const item of pendingLocalItems) {
            try {
              await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
            } catch (err) { console.error(`[Sync] Failed to upload client ${item.id}:`, err); }
          }
          const updatedRes = await fetch('/api/clients');
          if (updatedRes.ok) {
            const freshServerClients = await updatedRes.json();
            const reMerged = mergeServerAndLocalList(freshServerClients, mergedClients, 'id');
            setClients(reMerged);
            safeSetItem('keinshop_clients', JSON.stringify(reMerged));
          }
        }
      }

      if (productsRes) {
        const serverProducts = await productsRes.json();
        const savedStr = localStorage.getItem('keinshop_products');
        let localItems: Product[] = [];
        if (savedStr) {
          try {
            localItems = JSON.parse(savedStr).filter((item: any) => item.is_demo !== true && item.isdemo !== true);
          } catch (e) {}
        }

        const mergedProducts = mergeServerAndLocalList(serverProducts, localItems, 'sku');
        setProducts(mergedProducts);
        safeSetItem('keinshop_products', JSON.stringify(mergedProducts));

        const pendingLocalItems = mergedProducts.filter(item => 
          item.sku && 
          !item.deleted_at && 
          (item.status as string) !== 'inactive_deleted' &&
          (item as any).pending_sync === true
        );

        if (pendingLocalItems.length > 0) {
          console.log(`[Sync] Uploading ${pendingLocalItems.length} offline/local products to server...`);
          for (const item of pendingLocalItems) {
            try {
              const formData = new FormData();
              formData.append("sku", item.sku);
              formData.append("name", item.name);
              formData.append("category", item.category);
              formData.append("stock", String(item.stock));
              formData.append("minStock", String(item.minStock || 0));
              formData.append("priceBuy", String(item.priceBuy || 0));
              formData.append("priceSell", String(item.priceSell || 0));
              formData.append("visible", String(item.visible));
              formData.append("description", item.description || "");
              formData.append("sizes", JSON.stringify(item.sizes || []));
              formData.append("colors", JSON.stringify(item.colors || []));
              formData.append("images_meta", JSON.stringify(item.images || []));

              await fetch('/api/inventory', { method: 'POST', body: formData });
            } catch (err) { console.error(`[Sync] Failed to upload product ${item.sku}:`, err); }
          }
          const updatedRes = await fetch('/api/inventory');
          if (updatedRes.ok) {
            const freshServerProducts = await updatedRes.json();
            const reMerged = mergeServerAndLocalList(freshServerProducts, mergedProducts, 'sku');
            setProducts(reMerged);
            safeSetItem('keinshop_products', JSON.stringify(reMerged));
          }
        }
      }

      if (publicationsRes && publicationsRes.ok) {
        const serverPubs = await publicationsRes.json();
        const savedStr = localStorage.getItem('keinshop_publications');
        let localItems: Publication[] = [];
        if (savedStr) {
          try {
            localItems = JSON.parse(savedStr).filter((item: any) => item.is_demo !== true && item.isdemo !== true);
          } catch (e) {}
        }

        const mergedPubs = mergeServerAndLocalList(serverPubs, localItems, 'id');
        setPublications(mergedPubs);
        safeSetItem('keinshop_publications', JSON.stringify(mergedPubs));

        const pendingLocalItems = mergedPubs.filter(item => 
          item.id && 
          (item as any).pending_sync === true
        );

        if (pendingLocalItems.length > 0) {
          console.log(`[Sync] Uploading ${pendingLocalItems.length} offline/local publications to server...`);
          for (const item of pendingLocalItems) {
            try {
              await fetch('/api/publications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
            } catch (err) { console.error(`[Sync] Failed to upload publication ${item.id}:`, err); }
          }
          const updatedRes = await fetch('/api/publications');
          if (updatedRes.ok) {
            const freshServerPubs = await updatedRes.json();
            const reMerged = mergeServerAndLocalList(freshServerPubs, mergedPubs, 'id');
            setPublications(reMerged);
            safeSetItem('keinshop_publications', JSON.stringify(reMerged));
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync all data with server:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  const refetchAllData = async () => {
    await syncAllData();
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const dataURLtoBlob = (dataurl: string) => {
    try {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error("Failed to parse base64 to blob", e);
      return new Blob([], { type: 'image/png' });
    }
  };

  const syncOfflineQueue = async () => {
    const queued = await getQueuedRequests();
    if (queued.length === 0) return;

    triggerSyncToast(`Sincronizando ${queued.length} operaciones pendientes...`);

    for (const req of queued) {
      try {
        if (!navigator.onLine) break;

        let response;
        if (req.resource === 'inventory' && (req.method === 'POST' || req.method === 'PUT')) {
          const formData = new FormData();
          const p = req.body;
          formData.append("sku", p.sku);
          formData.append("name", p.name);
          formData.append("category", p.category);
          formData.append("stock", String(p.stock));
          formData.append("minStock", String(p.minStock));
          formData.append("priceBuy", String(p.priceBuy));
          formData.append("priceSell", String(p.priceSell));
          formData.append("visible", String(p.visible));
          formData.append("description", p.description || "");
          formData.append("sizes", JSON.stringify(p.sizes || []));
          formData.append("colors", JSON.stringify(p.colors || []));
          formData.append("images_meta", JSON.stringify(p.images || []));

          if (p.base64_files) {
            p.base64_files.forEach((bf: any) => {
              try {
                const blob = dataURLtoBlob(bf.data);
                formData.append("images[]", blob, bf.name);
              } catch (e) {
                console.error("Error decoding base64 file", e);
              }
            });
          }

          response = await fetch(req.url, {
            method: req.method,
            body: formData
          });
        } else {
          response = await fetch(req.url, {
            method: req.method,
            headers: {
              'Content-Type': 'application/json',
              ...req.headers
            },
            body: req.body ? JSON.stringify(req.body) : undefined
          });
        }

        if (response.ok || response.status === 201 || response.status === 200) {
          await dequeueRequest(req.id);
        } else if (response.status === 409) {
          console.warn("[Offline Sync] Conflict detected during background sync:", req);
          await dequeueRequest(req.id);
        } else {
          await dequeueRequest(req.id);
        }
      } catch (err) {
        console.error("Error processing queued request:", err);
        break;
      }
    }

    await updatePendingCount();
    await refetchAllData();
    triggerSyncToast(`Sincronización finalizada correctamente.`);
  };

  React.useEffect(() => {
    updatePendingCount();
  }, []);

  React.useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/events");
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log("[SSE] Real-time update received:", payload);
          refetchAllData();
        } catch (e) {
          console.error("[SSE] Failed to parse event payload:", e);
        }
      };
      eventSource.onerror = (err) => {
        console.warn("[SSE] EventSource disconnected or encountered an error. Express will handle reconnection automatically.", err);
      };
    } catch (e) {
      console.error("[SSE] EventSource creation failed:", e);
    }
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache state to localStorage for offline access
  React.useEffect(() => {
    safeSetItem('keinshop_products', JSON.stringify(products));
  }, [products]);

  React.useEffect(() => {
    safeSetItem('keinshop_clients', JSON.stringify(clients));
  }, [clients]);

  React.useEffect(() => {
    safeSetItem('keinshop_orders', JSON.stringify(orders));
  }, [orders]);

  React.useEffect(() => {
    safeSetItem('keinshop_transactions', JSON.stringify(transactions));
  }, [transactions]);

  React.useEffect(() => {
    safeSetItem('keinshop_publications', JSON.stringify(publications));
  }, [publications]);

  React.useEffect(() => {
    if (!initialLoading) {
      prevProductsRef.current = products;
      prevClientsRef.current = clients;
      prevOrdersRef.current = orders;
      prevTransactionsRef.current = transactions;
      prevPublicationsRef.current = publications;
    }
  }, [initialLoading]);

  // Sync all data from backend API or local storage on mount
  React.useEffect(() => {
    // Pre-fetch and cache backend-computed public origin for accurate tracking links
    fetch('/api/public/origin')
      .then(res => res.json())
      .then(data => {
        if (data && data.publicOrigin) {
          safeSetItem('keinshop_public_origin', data.publicOrigin);
        }
      })
      .catch(err => console.error("Error fetching public origin:", err));

    // Fast startup safety timer: unblock UI after max 150ms if local data is ready
    const quickTimer = setTimeout(() => {
      setInitialLoading(false);
    }, 150);

    const hydrateAndSync = async () => {
      let currentProducts: Product[] = [];
      let currentClients: Client[] = [];
      let currentOrders: SpecialOrder[] = [];
      let currentTransactions: Transaction[] = [];
      let currentPublications: Publication[] = [];

      try {
        const [cachedProducts, cachedClients, cachedOrders, cachedTransactions, cachedPublications] = await Promise.all([
          idbGet('keinshop_products'),
          idbGet('keinshop_clients'),
          idbGet('keinshop_orders'),
          idbGet('keinshop_transactions'),
          idbGet('keinshop_publications'),
        ]);

        if (cachedProducts) {
          currentProducts = typeof cachedProducts === 'string' ? JSON.parse(cachedProducts) : cachedProducts;
          setProducts(currentProducts);
        }
        if (cachedClients) {
          currentClients = typeof cachedClients === 'string' ? JSON.parse(cachedClients) : cachedClients;
          setClients(currentClients);
        }
        if (cachedOrders) {
          currentOrders = typeof cachedOrders === 'string' ? JSON.parse(cachedOrders) : cachedOrders;
          setOrders(currentOrders);
        }
        if (cachedTransactions) {
          currentTransactions = typeof cachedTransactions === 'string' ? JSON.parse(cachedTransactions) : cachedTransactions;
          setTransactions(currentTransactions);
        }
        if (cachedPublications) {
          currentPublications = typeof cachedPublications === 'string' ? JSON.parse(cachedPublications) : cachedPublications;
          setPublications(currentPublications);
        }
      } catch (err) {
        console.error("Failed to hydrate from IndexedDB:", err);
      } finally {
        // Unblock loading screen immediately
        setInitialLoading(false);
        clearTimeout(quickTimer);

        // Run heavy remote store sync and API fetches concurrently in background
        (async () => {
          try {
            console.log("[Firestore Sync] Merging local data with Firestore remote store in background...");
            const [fsProducts, fsClients, fsOrders, fsTransactions, fsPublications] = await Promise.allSettled([
              syncCollectionFromFirestore<Product>('inventory', currentProducts, 'sku'),
              syncCollectionFromFirestore<Client>('clients', currentClients, 'id'),
              syncCollectionFromFirestore<SpecialOrder>('special_orders', currentOrders, 'id'),
              syncCollectionFromFirestore<Transaction>('accounting', currentTransactions, 'id'),
              syncCollectionFromFirestore<Publication>('publications', currentPublications, 'id'),
            ]);

            if (fsProducts.status === 'fulfilled' && fsProducts.value) setProducts(fsProducts.value);
            if (fsClients.status === 'fulfilled' && fsClients.value) setClients(fsClients.value);
            if (fsOrders.status === 'fulfilled' && fsOrders.value) setOrders(fsOrders.value);
            if (fsTransactions.status === 'fulfilled' && fsTransactions.value) setTransactions(fsTransactions.value);
            if (fsPublications.status === 'fulfilled' && fsPublications.value) setPublications(fsPublications.value);
          } catch (fsErr) {
            console.error("[Firestore Sync] Error merging with Firestore on mount:", fsErr);
          } finally {
            syncAllData();
          }
        })();
      }
    };

    hydrateAndSync();

    const handleSyncRequest = () => {
      syncAllData();
    };
    window.addEventListener('sync-all-data', handleSyncRequest);
    return () => {
      window.removeEventListener('sync-all-data', handleSyncRequest);
    };
  }, []);

  // SSE Real-time Synchronization and Presence
  React.useEffect(() => {
    if (!jwtUser) {
      setOnlineAdmins([]);
      return;
    }

    const name = jwtUser.first_name || jwtUser.firstName || "Admin";
    const sse = new EventSource(`/api/realtime/stream?userId=${encodeURIComponent(name)}`);

    sse.addEventListener('presence', (e: MessageEvent) => {
      try {
        const users = JSON.parse(e.data);
        if (Array.isArray(users)) {
          setOnlineAdmins(users);
        }
      } catch (err) {
        console.error("Failed to parse presence:", err);
      }
    });

    sse.addEventListener('mutate', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        console.log("[SSE Realtime] Sync mutation received:", payload);
        refetchAllData();
      } catch (err) {
        console.error("Failed to parse mutate:", err);
      }
    });

    sse.onerror = (err) => {
      console.warn("SSE stream idle or reconnecting. Auto-reconnection is handled by browser.");
    };

    return () => {
      sse.close();
    };
  }, [jwtUser]);

  // Undo / History State Manager
  interface AppStateSnapshot {
    products: Product[];
    clients: Client[];
    orders: SpecialOrder[];
    transactions: Transaction[];
    publications: Publication[];
    recommendations: AIRecommendation[];
    auditLogs: AuditLog[];
  }
  const [history, setHistory] = useState<AppStateSnapshot[]>([]);

  // Capture state for Undo/Restore functionality
  const saveSnapshotToHistory = (
    currentProducts = products, 
    currentClients = clients, 
    currentOrders = orders, 
    currentTransactions = transactions, 
    currentPublications = publications, 
    currentRecommendations = recommendations, 
    currentLogs = auditLogs
  ) => {
    const snapshot: AppStateSnapshot = {
      products: JSON.parse(JSON.stringify(currentProducts)),
      clients: JSON.parse(JSON.stringify(currentClients)),
      orders: JSON.parse(JSON.stringify(currentOrders)),
      transactions: JSON.parse(JSON.stringify(currentTransactions)),
      publications: JSON.parse(JSON.stringify(currentPublications)),
      recommendations: JSON.parse(JSON.stringify(currentRecommendations)),
      auditLogs: JSON.parse(JSON.stringify(currentLogs))
    };
    setHistory(prev => [...prev, snapshot]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const previous = history[history.length - 1];
    setProducts(previous.products);
    setClients(previous.clients);
    setOrders(previous.orders);
    setTransactions(previous.transactions);
    setPublications(previous.publications);
    setRecommendations(previous.recommendations);
    
    // Log Undo in audit logs
    const newLog: AuditLog = {
      id: `LOG-UND-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: `Ken Israel (${role})`,
      action: "Deshacer: Se restauró la versión anterior del estado del sistema.",
      module: "Historial"
    };
    
    setAuditLogs([newLog, ...previous.auditLogs]);
    setHistory(prev => prev.slice(0, -1));
  };

  const logAction = (actionText: string, moduleName: string) => {
    const newLog: AuditLog = {
      id: `LOG-0${auditLogs.length + 1}`,
      timestamp: new Date().toISOString(),
      user: `Ken Israel (${role})`,
      action: actionText,
      module: moduleName
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // --- ACTIONS: INVENTORY ---
  const handleAddProduct = async (p: Product & { files?: File[] }) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    const { files, ...productData } = p;
    // 1. Optimistic UI Update: Reflect change immediately in local state
    const optimisticProduct: Product = {
      ...productData,
      version: 1,
      updated_at: new Date().toISOString()
    };
    setProducts(prev => [optimisticProduct, ...prev.filter(item => item.sku !== p.sku)]);
    logAction(`Añadió producto: '${p.name}' con SKU ${p.sku}`, "Inventario");

    if (isOffline) {
      let base64_files: any[] = [];
      if (files) {
        base64_files = await Promise.all(files.map(async (file) => ({
          name: file.name,
          type: file.type,
          data: await fileToBase64(file)
        })));
      }

      const pendingProduct = { 
        ...optimisticProduct, 
        pending_sync: true 
      };
      
      setProducts(prev => [pendingProduct, ...prev.filter(item => item.sku !== p.sku)]);
      await enqueueRequest({
        url: '/api/inventory',
        method: 'POST',
        resource: 'inventory',
        action: 'create',
        body: { ...pendingProduct, base64_files }
      });
      await updatePendingCount();
      triggerSyncToast(`Producto '${p.name}' guardado localmente (sin conexión).`);
      return true;
    }

    try {
      const formData = new FormData();
      formData.append("sku", p.sku);
      formData.append("name", p.name);
      formData.append("category", p.category);
      formData.append("stock", String(p.stock));
      formData.append("minStock", String(p.minStock));
      formData.append("priceBuy", String(p.priceBuy));
      formData.append("priceSell", String(p.priceSell));
      formData.append("visible", String(p.visible));
      formData.append("description", p.description || "");
      formData.append("sizes", JSON.stringify(p.sizes || []));
      formData.append("colors", JSON.stringify(p.colors || []));
      formData.append("images_meta", JSON.stringify(p.images || []));

      if (files) {
        files.forEach(file => {
          formData.append("images[]", file, file.name);
        });
      }

      const response = await fetch('/api/inventory', {
        method: 'POST',
        body: formData
      });

      if (response.status === 201 || response.ok) {
        const result = await response.json();
        const created = result.data || p;
        setProducts(prev => prev.map(item => item.sku === p.sku ? created : item));
        return true;
      } else {
        alert("Fallo al registrar producto en el servidor. Conservando copia local.");
        return false;
      }
    } catch (err) {
      console.error("Network error, queuing add product:", err);
      let base64_files: any[] = [];
      if (files) {
        base64_files = await Promise.all(files.map(async (file) => ({
          name: file.name,
          type: file.type,
          data: await fileToBase64(file)
        })));
      }
      const pendingProduct = { 
        ...optimisticProduct, 
        pending_sync: true
      };
      setProducts(prev => prev.map(item => item.sku === p.sku ? pendingProduct : item));
      await enqueueRequest({
        url: '/api/inventory',
        method: 'POST',
        resource: 'inventory',
        action: 'create',
        body: { ...pendingProduct, base64_files }
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Producto guardado localmente.`);
      return true;
    }
  };

  const handleUpdateProduct = async (p: Product & { files?: File[] }) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    const { files, ...productData } = p;
    // 1. Optimistic UI Update: Reflect update immediately in local state
    const optimisticProduct: Product = {
      ...productData,
      updated_at: new Date().toISOString()
    };
    setProducts(prev => prev.map(item => item.sku === p.sku ? optimisticProduct : item));
    logAction(`Modificó producto SKU ${p.sku}: '${p.name}'`, "Inventario");

    if (isOffline) {
      let base64_files: any[] = [];
      if (files) {
        base64_files = await Promise.all(files.map(async (file) => ({
          name: file.name,
          type: file.type,
          data: await fileToBase64(file)
        })));
      }
      const pendingProduct = { 
        ...optimisticProduct, 
        pending_sync: true 
      };
      setProducts(prev => prev.map(item => item.sku === p.sku ? pendingProduct : item));
      await enqueueRequest({
        url: `/api/inventory/${p.sku}`,
        method: 'PUT',
        resource: 'inventory',
        action: 'update',
        body: { ...pendingProduct, base64_files }
      });
      await updatePendingCount();
      triggerSyncToast(`Cambios de producto guardados localmente.`);
      return true;
    }

    try {
      const formData = new FormData();
      formData.append("sku", p.sku);
      formData.append("name", p.name);
      formData.append("category", p.category);
      formData.append("stock", String(p.stock));
      formData.append("minStock", String(p.minStock));
      formData.append("priceBuy", String(p.priceBuy));
      formData.append("priceSell", String(p.priceSell));
      formData.append("visible", String(p.visible));
      formData.append("description", p.description || "");
      formData.append("sizes", JSON.stringify(p.sizes || []));
      formData.append("colors", JSON.stringify(p.colors || []));
      formData.append("images_meta", JSON.stringify(p.images || []));

      if (files) {
        files.forEach(file => {
          formData.append("images[]", file, file.name);
        });
      }

      const response = await fetch(`/api/inventory/${p.sku}`, {
        method: 'PUT',
        body: formData
      });

      if (response.ok || response.status === 200) {
        const result = await response.json();
        const updated = result.data || p;
        setProducts(prev => prev.map(item => item.sku === p.sku ? updated : item));
        return true;
      } else if (response.status === 409) {
        const conflict = await response.json();
        setActiveConflict({
          resource: 'inventory',
          id: p.sku,
          currentVersion: conflict.currentVersion,
          incomingVersion: conflict.incomingVersion,
          currentData: conflict.currentData,
          incomingData: p,
          onResolve: async (resolvedData) => {
            const retryProduct = { ...resolvedData, version: conflict.currentVersion };
            await handleUpdateProduct(retryProduct);
            setActiveConflict(null);
          },
          onCancel: () => {
            setProducts(prev => prev.map(item => item.sku === p.sku ? conflict.currentData : item));
            setActiveConflict(null);
          }
        });
        return false;
      } else {
        alert("Fallo al modificar producto en el servidor.");
        return false;
      }
    } catch (err) {
      console.error("Network error, queuing product update:", err);
      let base64_files: any[] = [];
      if (files) {
        base64_files = await Promise.all(files.map(async (file) => ({
          name: file.name,
          type: file.type,
          data: await fileToBase64(file)
        })));
      }
      const pendingProduct = { 
        ...optimisticProduct, 
        pending_sync: true
      };
      setProducts(prev => prev.map(item => item.sku === p.sku ? pendingProduct : item));
      await enqueueRequest({
        url: `/api/inventory/${p.sku}`,
        method: 'PUT',
        resource: 'inventory',
        action: 'update',
        body: { ...pendingProduct, base64_files }
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Cambios de producto guardados localmente.`);
      return true;
    }
  };

  const handleDeleteProduct = async (sku: string, mode: 'soft' | 'hard' = 'soft', reason: string = '') => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    // 1. Optimistic UI Update: Update local state immediately
    if (mode === 'hard') {
      setProducts(prev => prev.filter(item => item.sku !== sku));
      logAction(`Eliminó permanentemente producto SKU ${sku}`, "Inventario");
    } else {
      setProducts(prev => prev.map(item => item.sku === sku ? {
        ...item,
        deleted_at: new Date().toISOString(),
        deletedby: `Ken Israel (${role})`,
        deleted_reason: reason,
        status: 'inactive'
      } : item));
      logAction(`Desactivó (Soft Delete) producto SKU ${sku}`, "Inventario");
    }

    const encodedSku = encodeURIComponent(sku);
    if (isOffline) {
      if (mode !== 'hard') {
        setProducts(prev => prev.map(item => item.sku === sku ? { ...item, pending_sync: true } : item));
      }
      await enqueueRequest({
        url: `/api/inventory/${encodedSku}?mode=${mode}&reason=${encodeURIComponent(reason)}&user_id=${encodeURIComponent(`Ken Israel (${role})`)}`,
        method: 'DELETE',
        resource: 'inventory',
        action: 'delete'
      });
      await updatePendingCount();
      triggerSyncToast(`Eliminación de producto registrada localmente.`);
      return true;
    }

    try {
      const response = await fetch(`/api/inventory/${encodedSku}?mode=${mode}&reason=${encodeURIComponent(reason)}&user_id=${encodeURIComponent(`Ken Israel (${role})`)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        return true;
      } else {
        console.warn("Server delete returned non-200, maintaining optimistic deletion locally.");
        return true;
      }
    } catch (err) {
      console.error("Network error, queuing product delete:", err);
      if (mode !== 'hard') {
        setProducts(prev => prev.map(item => item.sku === sku ? { ...item, pending_sync: true } : item));
      }
      await enqueueRequest({
        url: `/api/inventory/${encodedSku}?mode=${mode}&reason=${encodeURIComponent(reason)}&user_id=${encodeURIComponent(`Ken Israel (${role})`)}`,
        method: 'DELETE',
        resource: 'inventory',
        action: 'delete'
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Eliminación encolada localmente.`);
      return true;
    }
  };

  const handleRestoreProduct = async (sku: string) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    // 1. Optimistic UI Update: Restore in state immediately
    setProducts(prev => prev.map(item => {
      if (item.sku === sku) {
        const restoredItem = { ...item };
        delete restoredItem.deleted_at;
        delete restoredItem.deletedby;
        delete restoredItem.deleted_reason;
        restoredItem.status = 'active';
        return restoredItem;
      }
      return item;
    }));
    logAction(`Restauró producto SKU ${sku}`, "Inventario");

    if (isOffline) {
      setProducts(prev => prev.map(item => item.sku === sku ? { ...item, pending_sync: true } : item));
      await enqueueRequest({
        url: `/api/inventory/${sku}/restore?user_id=${encodeURIComponent(`Ken Israel (${role})`)}`,
        method: 'POST',
        resource: 'inventory',
        action: 'restore'
      });
      await updatePendingCount();
      triggerSyncToast(`Restauración de producto registrada localmente.`);
      return true;
    }

    try {
      const response = await fetch(`/api/inventory/${sku}/restore?user_id=${encodeURIComponent(`Ken Israel (${role})`)}`, {
        method: 'POST'
      });

      if (response.ok) {
        return true;
      } else {
        alert("Fallo al restaurar el producto en el servidor.");
        return false;
      }
    } catch (err) {
      console.error("Network error, queuing product restore:", err);
      setProducts(prev => prev.map(item => item.sku === sku ? { ...item, pending_sync: true } : item));
      await enqueueRequest({
        url: `/api/inventory/${sku}/restore?user_id=${encodeURIComponent(`Ken Israel (${role})`)}`,
        method: 'POST',
        resource: 'inventory',
        action: 'restore'
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Restauración encolada localmente.`);
      return true;
    }
  };

  const handleToggleProductVisibility = async (sku: string) => {
    saveSnapshotToHistory();
    const existing = products.find(p => p.sku === sku);
    if (!existing) return;

    const nextVis = existing.visible === false || (existing.visible as any) === 'false' ? true : false;
    const updated = { ...existing, visible: nextVis, updated_at: new Date().toISOString() };

    setProducts(prev => prev.map(item => item.sku === sku ? updated : item));
    logAction(`${nextVis ? 'Activó' : 'Ocultó'} producto SKU ${sku} del catálogo`, "Catálogo");

    try {
      await handleUpdateProduct(updated);
    } catch (err) {
      console.error("Failed to persist visibility change to server:", err);
    }
  };

  // --- ACTIONS: SPECIAL ORDERS (SHEIN/TEMU) ---
  const handleAddOrder = async (o: SpecialOrder) => {
    try {
      // 1. Strict Validation of Mandatory Fields
      if (!o.id || !o.id.trim()) {
        throw new Error("El código de pedido (ID) es obligatorio.");
      }
      if (!o.client_name || !o.client_name.trim() || o.client_name.trim().length < 3) {
        throw new Error("El nombre completo del cliente es obligatorio (mínimo 3 caracteres).");
      }
      if (!o.client_phone || !o.client_phone.trim() || o.client_phone.trim().length < 5) {
        throw new Error("El teléfono del cliente es obligatorio (mínimo 5 caracteres).");
      }
      if (o.weightLbs === undefined || o.weightLbs === null || isNaN(Number(o.weightLbs)) || Number(o.weightLbs) < 0) {
        throw new Error("El peso (Lbs) debe ser un número válido (mínimo 0).");
      }
      if (o.costPerLb === undefined || o.costPerLb === null || isNaN(Number(o.costPerLb)) || Number(o.costPerLb) < 0) {
        throw new Error("El precio por libra debe ser un número válido (mínimo 0).");
      }
      if (o.totalCost === undefined || o.totalCost === null || isNaN(Number(o.totalCost)) || Number(o.totalCost) < 0) {
        throw new Error("El costo total de los productos debe ser un número válido (mínimo 0).");
      }
      if (!o.items || o.items.length === 0) {
        throw new Error("El pedido debe contener al menos un artículo (item).");
      }

      saveSnapshotToHistory();
      const isOffline = !isOnline;

      // 2. Optimistic UI Update: Reflect order immediately in local state
      const optimisticOrder = { ...o, version: 1, updated_at: new Date().toISOString() };
      setOrders(prev => [optimisticOrder, ...prev.filter(item => item.id !== o.id)]);
      logAction(`Registró pedido especial ${o.id} para ${o.client_name || 'Cliente'}`, "Pedidos");

      // Write to Firestore asynchronously
      try {
        syncItemToFirestore('special_orders', optimisticOrder.id, optimisticOrder);
      } catch (fsErr) {
        console.error("[Firestore Sync] Error writing order:", fsErr);
      }

      if (isOffline) {
        const pendingOrder = { ...optimisticOrder, pending_sync: true };
        setOrders(prev => [pendingOrder, ...prev.filter(item => item.id !== o.id)]);
        await enqueueRequest({
          url: '/api/admin/special-orders',
          method: 'POST',
          resource: 'special_orders',
          action: 'create',
          body: o
        });
        await updatePendingCount();
        triggerSyncToast(`Pedido ${o.id} guardado localmente.`);

        return pendingOrder;
      }

      const response = await fetch('/api/admin/special-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...o,
          id: o.id,
          clientId: o.clientId,
          client_name: o.client_name,
          client_whatsapp: o.client_whatsapp || o.client_phone || '',
          client_phone: o.client_phone || '',
          origin_channel: o.source || 'WhatsApp',
          source: o.source || 'WhatsApp',
          origin_category: o.origin_category || 'Shein',
          weight_lbs: o.weightLbs,
          weightLbs: o.weightLbs,
          additional_lbs: o.additional_lbs,
          costPerLb: o.costPerLb,
          price_per_lb: o.costPerLb,
          freight_cost: o.freight_cost,
          initial_products_cost: o.initial_products_cost,
          initial_payment: o.paidAmount,
          totalCost: o.totalCost,
          paidAmount: o.paidAmount,
          pending_balance: o.pending_balance,
          itemsText: o.itemsText,
          items: o.items,
          photos: o.photos,
          notes: o.notes,
          logistics_notes: o.notes,
          status: o.status,
          timeline: o.timeline,
          dateEstArrival: o.dateEstArrival,
          estimated_arrival_date: o.dateEstArrival,
          dateOrdered: o.dateOrdered,
          request_id: o.request_id
        })
      });

      if (response.ok) {
        const result = await response.json();
        const createdOrder = result.order || o;
        setOrders(prev => prev.map(item => item.id === o.id ? createdOrder : item));
        return createdOrder;
      } else {
        const errText = await response.text();
        console.warn("Server response not ok when adding order, retaining optimistic copy:", errText);
        return optimisticOrder;
      }
    } catch (err: any) {
      console.error("Error in handleAddOrder:", err);
      triggerSyncToast(err.message || "Pedido registrado con sincronización diferida.");
      return o;
    }
  };

  const handleUpdateOrder = async (o: SpecialOrder) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    // 1. Optimistic UI Update: Reflect order update immediately in local state
    const optimisticOrder = { ...o, updated_at: new Date().toISOString() };
    setOrders(prev => prev.map(item => item.id === o.id ? optimisticOrder : item));
    logAction(`Actualizó pedido especial ${o.id}`, "Pedidos");

    if (isOffline) {
      const pendingOrder = { ...optimisticOrder, pending_sync: true };
      setOrders(prev => prev.map(item => item.id === o.id ? pendingOrder : item));
      await enqueueRequest({
        url: `/api/admin/special-orders/${o.id}`,
        method: 'PUT',
        resource: 'special_orders',
        action: 'update',
        body: o
      });
      await updatePendingCount();
      triggerSyncToast(`Cambios de pedido especial guardados localmente.`);
      return true;
    }

    try {
      const response = await fetch(`/api/admin/special-orders/${o.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(o)
      });

      if (response.ok) {
        const result = await response.json();
        const updated = result.order || o;
        setOrders(prev => prev.map(item => item.id === o.id ? updated : item));
        return true;
      } else if (response.status === 409) {
        const conflict = await response.json();
        setActiveConflict({
          resource: 'special_order',
          id: o.id,
          currentVersion: conflict.currentVersion,
          incomingVersion: conflict.incomingVersion,
          currentData: conflict.currentData,
          incomingData: o,
          onResolve: async (resolvedData) => {
            const retryOrder = { ...resolvedData, version: conflict.currentVersion };
            await handleUpdateOrder(retryOrder);
            setActiveConflict(null);
          },
          onCancel: () => {
            setOrders(prev => prev.map(item => item.id === o.id ? conflict.currentData : item));
            setActiveConflict(null);
          }
        });
        return false;
      } else {
        console.warn("Fallo al actualizar pedido en servidor, conservando cambios locales.");
        return true;
      }
    } catch (err) {
      console.error("Network error, queuing order update:", err);
      const pendingOrder = { ...optimisticOrder, pending_sync: true };
      setOrders(prev => prev.map(item => item.id === o.id ? pendingOrder : item));
      await enqueueRequest({
        url: `/api/admin/special-orders/${o.id}`,
        method: 'PUT',
        resource: 'special_orders',
        action: 'update',
        body: o
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Cambios de pedido guardados localmente.`);
      return true;
    }
  };

  const handleUpdateOrderStatus = async (id: string, newStatus: string, requestId: string, reason: string): Promise<boolean> => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    // 1. Optimistic UI Update: Instantly update status in local state
    const nowIso = new Date().toISOString();
    setOrders(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: newStatus,
          order_status: newStatus,
          statusupdatedat: nowIso,
          last_update: nowIso
        };
      }
      return item;
    }));
    logAction(`Actualizó estado del pedido ${id} a '${newStatus}'`, "Pedidos");
    triggerSyncToast(`Estado actualizado correctamente.`);

    if (isOffline) {
      setOrders(prev => prev.map(item => item.id === id ? { ...item, pending_sync: true } : item));
      await enqueueRequest({
        url: `/api/admin/special-orders/${id}/status`,
        method: 'POST',
        resource: 'special_orders',
        action: 'update_status',
        body: { new_status: newStatus, request_id: requestId, reason: reason }
      });
      await updatePendingCount();
      return true;
    }

    try {
      const response = await fetch(`/api/admin/special-orders/${id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-id': `Ken Israel (${role})`
        },
        body: JSON.stringify({
          new_status: newStatus,
          request_id: requestId,
          reason: reason
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.statusupdatedat) {
          setOrders(prev => prev.map(item => item.id === id ? { ...item, statusupdatedat: result.statusupdatedat } : item));
        }
        return true;
      } else {
        console.warn("Status update non-200 from server, keeping optimistic update.");
        return true;
      }
    } catch (err: any) {
      console.error("Network error during status update, queuing for offline sync:", err);
      setOrders(prev => prev.map(item => item.id === id ? { ...item, pending_sync: true } : item));
      await enqueueRequest({
        url: `/api/admin/special-orders/${id}/status`,
        method: 'POST',
        resource: 'special_orders',
        action: 'update_status',
        body: { new_status: newStatus, request_id: requestId, reason: reason }
      });
      await updatePendingCount();
      return true;
    }
  };

  const handleDeleteOrder = async (id: string, mode: 'soft' | 'hard', reason: string = "Eliminado por el administrador") => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;
    const userStr = `Ken Israel (${role})`;

    // 1. Optimistic UI Update: Delete/Archive order and connected transaction immediately
    if (mode === 'hard') {
      setOrders(prev => prev.filter(item => item.id !== id));
      logAction(`Eliminó permanentemente (Hard Delete) el pedido ${id}. Razón: ${reason}`, "Pedidos");
    } else {
      setOrders(prev => prev.map(item => item.id === id ? {
        ...item,
        deleted_at: new Date().toISOString(),
        publish_status: 'draft',
        deleted_by: userStr,
        deleted_reason: reason
      } : item));
      logAction(`Archivó temporalmente (Soft Delete) el pedido ${id}. Razón: ${reason}`, "Pedidos");
    }
    // Always purge any linked transaction from local state when deleting a special order
    setTransactions(prev => prev.filter(tx => tx.orderId !== id && tx.id !== `TX-AUTO-PE-${id}`));
    triggerSyncToast(mode === 'hard' ? 'Pedido eliminado permanentemente.' : 'Pedido archivado correctamente.');

    if (isOffline) {
      if (mode !== 'hard') {
        setOrders(prev => prev.map(item => item.id === id ? { ...item, pending_sync: true } : item));
      }
      await enqueueRequest({
        url: `/api/admin/special-orders/${id}?mode=${mode}&deleted_by=${encodeURIComponent(userStr)}&deleted_reason=${encodeURIComponent(reason)}`,
        method: 'DELETE',
        resource: 'special_orders',
        action: 'delete'
      });
      await updatePendingCount();
      return true;
    }

    try {
      const encodedId = encodeURIComponent(id);
      const response = await fetch(`/api/admin/special-orders/${encodedId}?mode=${mode}&deleted_by=${encodeURIComponent(userStr)}&deleted_reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 404) {
        console.warn(`Server status ${response.status} deleting order ${id}. Enqueuing background sync.`);
        await enqueueRequest({
          url: `/api/admin/special-orders/${encodedId}?mode=${mode}&deleted_by=${encodeURIComponent(userStr)}&deleted_reason=${encodeURIComponent(reason)}`,
          method: 'DELETE',
          resource: 'special_orders',
          action: 'delete'
        });
        await updatePendingCount();
      }
      return true;
    } catch (err) {
      console.error("Network error, queuing order delete:", err);
      if (mode !== 'hard') {
        setOrders(prev => prev.map(item => item.id === id ? { ...item, pending_sync: true } : item));
      }
      await enqueueRequest({
        url: `/api/admin/special-orders/${encodeURIComponent(id)}?mode=${mode}&deleted_by=${encodeURIComponent(userStr)}&deleted_reason=${encodeURIComponent(reason)}`,
        method: 'DELETE',
        resource: 'special_orders',
        action: 'delete'
      });
      await updatePendingCount();
      return true;
    }
  };

  const handleRestoreOrder = async (id: string) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    // 1. Optimistic UI Update: Restore order in state immediately
    setOrders(prev => prev.map(item => {
      if (item.id === id) {
        const restored = { ...item };
        delete restored.deleted_at;
        delete restored.deleted_by;
        delete restored.deleted_reason;
        restored.publish_status = 'published';
        return restored;
      }
      return item;
    }));
    logAction(`Restauró pedido especial ID ${id}`, "Pedidos");

    if (isOffline) {
      setOrders(prev => prev.map(item => item.id === id ? { ...item, pending_sync: true } : item));
      await enqueueRequest({
        url: `/api/admin/special-orders/${id}/restore`,
        method: 'POST',
        resource: 'special_orders',
        action: 'restore'
      });
      await updatePendingCount();
      triggerSyncToast(`Restauración de pedido guardada localmente.`);
      return true;
    }

    try {
      const response = await fetch(`/api/admin/special-orders/${id}/restore`, {
        method: 'POST'
      });
      if (!response.ok) {
        console.warn("Server responded not ok when restoring order, retaining optimistic copy.");
      }
      return true;
    } catch (err) {
      console.error("Network error, queuing order restore:", err);
      setOrders(prev => prev.map(item => item.id === id ? { ...item, pending_sync: true } : item));
      await enqueueRequest({
        url: `/api/admin/special-orders/${id}/restore`,
        method: 'POST',
        resource: 'special_orders',
        action: 'restore'
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Restauración de pedido guardada localmente.`);
      return true;
    }
  };

  const handleScheduleOrderInCalendar = (order: SpecialOrder) => {
    saveSnapshotToHistory();
    const client = clients.find(c => c.id === order.clientId);
    const pub: Publication = {
      id: `PUB-SCH-${Date.now()}`,
      title: `Entrega Pedido: ${client ? client.name : (order.client_name || 'Cliente')}`,
      date: order.dateEstArrival,
      time: "10:00",
      channel: "Instagram",
      copy: `Coordinación de despacho para el pedido especial ${order.id}. Artículos: ${order.itemsText || 'Detalle de importación'}.`,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500",
      hashtags: ["Keinshop", "Despachos", "PedidosEspeciales"],
      status: "Programado",
      eventType: "delivery",
      orderId: order.id,
      clientId: order.clientId,
      reminderConfig: "24h"
    };
    setPublications(prev => [pub, ...prev]);
    logAction(`Agendó entrega del pedido ${order.id} en calendario para el ${order.dateEstArrival}`, "Calendario");
  };

  // --- ACTIONS: CLIENTS ---
  const handleAddClient = async (c: Client) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    // 1. Optimistic UI Update: Instantly reflect new client in state
    const optimisticClient = { ...c, version: 1, updated_at: new Date().toISOString() };
    setClients(prev => [optimisticClient, ...prev.filter(item => item.id !== c.id)]);
    logAction(`Registró nuevo perfil de cliente: '${c.name}'`, "Clientes");

    if (isOffline) {
      const pendingClient = { ...optimisticClient, pending_sync: true };
      setClients(prev => [pendingClient, ...prev.filter(item => item.id !== c.id)]);
      await enqueueRequest({
        url: '/api/clients',
        method: 'POST',
        resource: 'clients',
        action: 'create',
        body: c
      });
      await updatePendingCount();
      triggerSyncToast(`Cliente '${c.name}' guardado localmente.`);
      return true;
    }

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      });

      if (response.ok) {
        const result = await response.json();
        const newClient = result.data || c;
        setClients(prev => [newClient, ...prev.filter(item => item.id !== newClient.id)]);
        return true;
      } else {
        console.warn("Fallo al registrar cliente en el servidor, conservando copia local.");
        return true;
      }
    } catch (err) {
      console.error("Network error, queuing client creation:", err);
      const pendingClient = { ...optimisticClient, pending_sync: true };
      setClients(prev => [pendingClient, ...prev.filter(item => item.id !== c.id)]);
      await enqueueRequest({
        url: '/api/clients',
        method: 'POST',
        resource: 'clients',
        action: 'create',
        body: c
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Cliente guardado localmente.`);
      return true;
    }
  };

  const handleUpdateClient = async (c: Client) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    // 1. Optimistic UI Update: Reflect updated client in state immediately
    const optimisticClient = { ...c, updated_at: new Date().toISOString() };
    setClients(prev => prev.map(item => item.id === c.id ? optimisticClient : item));
    logAction(`Actualizó perfil de cliente ID ${c.id}`, "Clientes");

    if (isOffline) {
      const pendingClient = { ...optimisticClient, pending_sync: true };
      setClients(prev => prev.map(item => item.id === c.id ? pendingClient : item));
      await enqueueRequest({
        url: `/api/clients/${c.id}`,
        method: 'PUT',
        resource: 'clients',
        action: 'update',
        body: c
      });
      await updatePendingCount();
      triggerSyncToast(`Cambios de cliente guardados localmente.`);
      return true;
    }

    try {
      const response = await fetch(`/api/clients/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      });

      if (response.ok) {
        const result = await response.json();
        const updated = result.data || c;
        setClients(prev => prev.map(item => item.id === updated.id ? updated : item));
        return true;
      } else if (response.status === 409) {
        const conflict = await response.json();
        setActiveConflict({
          resource: 'clients',
          id: c.id,
          currentVersion: conflict.currentVersion,
          incomingVersion: conflict.incomingVersion,
          currentData: conflict.currentData,
          incomingData: c,
          onResolve: async (resolvedData) => {
            const retryClient = { ...resolvedData, version: conflict.currentVersion };
            await handleUpdateClient(retryClient);
            setActiveConflict(null);
          },
          onCancel: () => {
            setClients(prev => prev.map(item => item.id === c.id ? conflict.currentData : item));
            setActiveConflict(null);
          }
        });
        return false;
      } else {
        console.warn("Fallo al actualizar cliente en servidor, manteniendo cambios locales.");
        return true;
      }
    } catch (err) {
      console.error("Network error, queuing client update:", err);
      const pendingClient = { ...optimisticClient, pending_sync: true };
      setClients(prev => prev.map(item => item.id === c.id ? pendingClient : item));
      await enqueueRequest({
        url: `/api/clients/${c.id}`,
        method: 'PUT',
        resource: 'clients',
        action: 'update',
        body: c
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Cambios de cliente guardados localmente.`);
      return true;
    }
  };

  const handleDeleteClient = async (id: string, mode: 'soft' | 'hard' = 'soft', reason: string = '') => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    if (isOffline) {
      if (mode === 'hard') {
        setClients(prev => prev.filter(item => item.id !== id));
      } else {
        setClients(prev => prev.map(item => item.id === id ? {
          ...item,
          deleted_at: new Date().toISOString(),
          pending_sync: true
        } : item));
      }
      logAction(`Eliminó cliente offline ID ${id} (${mode})`, "Clientes");
      await enqueueRequest({
        url: `/api/clients/${id}?mode=${mode}&reason=${encodeURIComponent(reason)}`,
        method: 'DELETE',
        resource: 'clients',
        action: 'delete'
      });
      await updatePendingCount();
      triggerSyncToast(`Eliminación de cliente guardada localmente.`);
      return { success: true };
    }

    try {
      const response = await fetch(`/api/clients/${id}?mode=${mode}&reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error, message: data.message, activeOrders: data.activeOrders };
      }

      const refreshRes = await fetch('/api/clients');
      if (refreshRes.ok) {
        const refreshedClients = await refreshRes.json();
        setClients(refreshedClients);
      } else {
        if (mode === 'hard') {
          setClients(prev => prev.filter(item => item.id !== id));
        } else {
          setClients(prev => prev.map(item => item.id === id ? { ...item, deleted_at: new Date().toISOString() } : item));
        }
      }

      logAction(`Eliminó cliente ID ${id} (${mode})`, "Clientes");
      return { success: true, data };
    } catch (err: any) {
      console.error("Network error, queuing client delete:", err);
      if (mode === 'hard') {
        setClients(prev => prev.filter(item => item.id !== id));
      } else {
        setClients(prev => prev.map(item => item.id === id ? {
          ...item,
          deleted_at: new Date().toISOString(),
          pending_sync: true
        } : item));
      }
      await enqueueRequest({
        url: `/api/clients/${id}?mode=${mode}&reason=${encodeURIComponent(reason)}`,
        method: 'DELETE',
        resource: 'clients',
        action: 'delete'
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Eliminación de cliente guardada localmente.`);
      return { success: true };
    }
  };

  const handleRestoreClient = async (id: string) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    if (isOffline) {
      setClients(prev => prev.map(item => {
        if (item.id === id) {
          const restored = { ...item };
          delete restored.deleted_at;
          return { ...restored, pending_sync: true };
        }
        return item;
      }));
      logAction(`Restauró cliente offline ID ${id}`, "Clientes");
      await enqueueRequest({
        url: `/api/clients/${id}/restore`,
        method: 'POST',
        resource: 'clients',
        action: 'restore'
      });
      await updatePendingCount();
      triggerSyncToast(`Restauración de cliente guardada localmente.`);
      return { success: true };
    }

    try {
      const response = await fetch(`/api/clients/${id}/restore`, {
        method: 'POST'
      });
      if (response.ok) {
        const refreshRes = await fetch('/api/clients');
        if (refreshRes.ok) {
          const refreshedClients = await refreshRes.json();
          setClients(refreshedClients);
        }
        logAction(`Restauró cliente ID ${id}`, "Clientes");
        return { success: true };
      }
      return { success: false };
    } catch (err: any) {
      console.error("Network error, queuing client restore:", err);
      setClients(prev => prev.map(item => {
        if (item.id === id) {
          const restored = { ...item };
          delete restored.deleted_at;
          return { ...restored, pending_sync: true };
        }
        return item;
      }));
      await enqueueRequest({
        url: `/api/clients/${id}/restore`,
        method: 'POST',
        resource: 'clients',
        action: 'restore'
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Restauración guardada localmente.`);
      return { success: true };
    }
  };

  // --- ACTIONS: ACCOUNTING ---
  const handleAddTransaction = async (tx: Transaction) => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    // 1. Optimistic UI Update: Instantly reflect new transaction in state
    const optimisticTx = { ...tx, version: 1, updated_at: new Date().toISOString() };
    setTransactions(prev => [optimisticTx, ...prev.filter(item => item.id !== tx.id)]);
    logAction(`Registró movimiento contable: ${tx.type} de $${tx.amount.toLocaleString()} en '${tx.category}'`, "Contabilidad");

    if (isOffline) {
      const pendingTx = { ...optimisticTx, pending_sync: true };
      setTransactions(prev => [pendingTx, ...prev.filter(item => item.id !== tx.id)]);
      await enqueueRequest({
        url: '/api/accounting/entries',
        method: 'POST',
        resource: 'accounting',
        action: 'create',
        body: tx
      });
      await updatePendingCount();
      triggerSyncToast(`Transacción guardada localmente.`);
      return true;
    }

    try {
      const response = await fetch('/api/accounting/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      if (response.ok) {
        const savedTx = await response.json();
        const freshTx = savedTx.data || savedTx;
        setTransactions(prev => prev.map(item => item.id === tx.id ? freshTx : item));
        return true;
      } else {
        console.warn("Fallo al guardar transacción en servidor, conservando copia local.");
        return true;
      }
    } catch (error) {
      console.error("Network error, queuing transaction creation:", error);
      const pendingTx = { ...optimisticTx, pending_sync: true };
      setTransactions(prev => prev.map(item => item.id === tx.id ? pendingTx : item));
      await enqueueRequest({
        url: '/api/accounting/entries',
        method: 'POST',
        resource: 'accounting',
        action: 'create',
        body: tx
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Transacción guardada localmente.`);
      return true;
    }
  };

  const handleDeleteTransaction = async (
    id: string,
    mode: 'soft' | 'hard',
    reason: string
  ): Promise<{ success: boolean; message?: string }> => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;
    const userStr = jwtUser?.email || jwtUser?.name || 'admin_ken';
    const token = jwtToken || localStorage.getItem('keinshop_jwt_token');

    // Optimistic / Immediate state update so it is removed/updated instantly
    if (mode === 'hard') {
      setTransactions(prev => prev.filter(item => item.id !== id));
    } else {
      setTransactions(prev => prev.map(item => item.id === id ? {
        ...item,
        deleted_at: new Date().toISOString(),
        deletedby: userStr,
        deletedreason: reason
      } : item));
    }

    if (isOffline) {
      logAction(`Eliminó transacción offline ID ${id} (${mode})`, "Contabilidad");
      await enqueueRequest({
        url: `/api/accounting/entries/${id}?mode=${mode}&deleted_by=${encodeURIComponent(userStr)}&deleted_reason=${encodeURIComponent(reason)}`,
        method: 'DELETE',
        resource: 'accounting',
        action: 'delete'
      });
      await updatePendingCount();
      triggerSyncToast(`Eliminación de transacción guardada localmente.`);
      return { success: true };
    }

    try {
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/accounting/entries/${id}?mode=${mode}&deleted_by=${encodeURIComponent(userStr)}&deleted_reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        // Rollback state on error
        const refreshRes = await fetch('/api/accounting/entries');
        if (refreshRes.ok) {
          setTransactions(await refreshRes.json());
        }
        return { success: false, message: data.message || "Error al eliminar la transacción." };
      }

      const refreshRes = await fetch('/api/accounting/entries');
      if (refreshRes.ok) {
        const freshData = await refreshRes.json();
        setTransactions(freshData);
      } else {
        if (mode === 'hard') {
          setTransactions(prev => prev.filter(item => item.id !== id));
        } else {
          setTransactions(prev => prev.map(item => item.id === id ? { ...item, deleted_at: new Date().toISOString(), deletedby: userStr, deletedreason: reason } : item));
        }
      }

      logAction(`Eliminó transacción ID ${id} (${mode})`, "Contabilidad");
      // Fetch fresh audit logs to reflect this action immediately
      fetchServerAuditLogs();
      return { success: true };
    } catch (error: any) {
      console.error("Network error, queuing transaction delete:", error);
      // Ensure local state represents deletion
      if (mode === 'hard') {
        setTransactions(prev => prev.filter(item => item.id !== id));
      } else {
        setTransactions(prev => prev.map(item => item.id === id ? {
          ...item,
          deleted_at: new Date().toISOString(),
          deletedby: userStr,
          deletedreason: reason,
          pending_sync: true
        } : item));
      }
      await enqueueRequest({
        url: `/api/accounting/entries/${id}?mode=${mode}&deleted_by=${encodeURIComponent(userStr)}&deleted_reason=${encodeURIComponent(reason)}`,
        method: 'DELETE',
        resource: 'accounting',
        action: 'delete'
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Eliminación encolada localmente.`);
      return { success: true };
    }
  };

  const handleDeleteTransactions = async (ids: string[], reason: string): Promise<boolean> => {
    saveSnapshotToHistory();
    const token = jwtToken || localStorage.getItem('keinshop_jwt_token');
    const userStr = jwtUser?.email || jwtUser?.name || 'admin_ken';

    // Optimistic delete
    setTransactions(prev => prev.filter(item => !ids.includes(item.id)));

    try {
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/accounting/entries/batch-delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids, reason })
      });
      if (response.ok) {
        const refreshRes = await fetch('/api/accounting/entries');
        if (refreshRes.ok) {
          setTransactions(await refreshRes.json());
        }
        logAction(`Eliminó ${ids.length} transacciones en lote`, "Contabilidad");
        fetchServerAuditLogs();
        return true;
      } else {
        // Rollback
        const refreshRes = await fetch('/api/accounting/entries');
        if (refreshRes.ok) {
          setTransactions(await refreshRes.json());
        }
        return false;
      }
    } catch (err) {
      console.error("Error batch deleting transactions:", err);
      // Rollback
      const refreshRes = await fetch('/api/accounting/entries');
      if (refreshRes.ok) {
        setTransactions(await refreshRes.json());
      }
      return false;
    }
  };

  const handleUpdateTransactions = async (ids: string[], updates: any): Promise<boolean> => {
    saveSnapshotToHistory();
    const token = jwtToken || localStorage.getItem('keinshop_jwt_token');

    // Optimistic update
    setTransactions(prev => prev.map(item => ids.includes(item.id) ? { ...item, ...updates } : item));

    try {
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/accounting/entries/batch-update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids, updates })
      });
      if (response.ok) {
        const refreshRes = await fetch('/api/accounting/entries');
        if (refreshRes.ok) {
          setTransactions(await refreshRes.json());
        }
        logAction(`Actualizó ${ids.length} transacciones en lote`, "Contabilidad");
        fetchServerAuditLogs();
        return true;
      } else {
        // Rollback
        const refreshRes = await fetch('/api/accounting/entries');
        if (refreshRes.ok) {
          setTransactions(await refreshRes.json());
        }
        return false;
      }
    } catch (err) {
      console.error("Error batch updating transactions:", err);
      // Rollback
      const refreshRes = await fetch('/api/accounting/entries');
      if (refreshRes.ok) {
        setTransactions(await refreshRes.json());
      }
      return false;
    }
  };

  const handleRestoreTransaction = async (id: string): Promise<boolean> => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    if (isOffline) {
      setTransactions(prev => prev.map(item => {
        if (item.id === id) {
          const restored = { ...item };
          delete restored.deleted_at;
          delete restored.deletedby;
          delete restored.deletedreason;
          return { ...restored, pending_sync: true };
        }
        return item;
      }));
      logAction(`Restauró transacción offline ID ${id}`, "Contabilidad");
      await enqueueRequest({
        url: `/api/accounting/entries/${id}/restore`,
        method: 'POST',
        resource: 'accounting',
        action: 'restore'
      });
      await updatePendingCount();
      triggerSyncToast(`Restauración de transacción registrada localmente.`);
      return true;
    }

    try {
      const response = await fetch(`/api/accounting/entries/${id}/restore`, {
        method: 'POST'
      });
      if (!response.ok) return false;

      const refreshRes = await fetch('/api/accounting/entries');
      if (refreshRes.ok) {
        const freshData = await refreshRes.json();
        setTransactions(freshData);
      } else {
        setTransactions(prev => prev.map(item => item.id === id ? { ...item, deleted_at: undefined, deletedby: undefined, deletedreason: undefined } : item));
      }

      logAction(`Restauró transacción ID ${id}`, "Contabilidad");
      return true;
    } catch (error) {
      console.error("Network error, queuing transaction restore:", error);
      setTransactions(prev => prev.map(item => {
        if (item.id === id) {
          const restored = { ...item };
          delete restored.deleted_at;
          delete restored.deletedby;
          delete restored.deletedreason;
          return { ...restored, pending_sync: true };
        }
        return item;
      }));
      await enqueueRequest({
        url: `/api/accounting/entries/${id}/restore`,
        method: 'POST',
        resource: 'accounting',
        action: 'restore'
      });
      await updatePendingCount();
      triggerSyncToast(`Error de conexión. Restauración registrada localmente.`);
      return true;
    }
  };

  const handleClearAllAuditLogs = async (): Promise<any> => {
    try {
      const token = jwtToken || localStorage.getItem('keinshop_jwt_token');
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/admin/audit-logs', {
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        const result = await response.json();
        if (result.logs) {
          const mappedLogs = result.logs.map((log: any) => ({
            id: log.id || `LOG-0${Date.now()}`,
            timestamp: log.created_at || new Date().toISOString(),
            user: log.metadata?.cleared_by || 'Administrador principal',
            action: `[VACIADO DE BITÁCORA] ${log.metadata?.action_performed || 'Limpieza de logs'}`,
            module: 'Auditoría'
          }));
          setAuditLogs(mappedLogs);
        } else {
          setAuditLogs([]);
        }
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error("Error clearing audit logs on server:", error);
      setAuditLogs([]);
    }
  };

  const handleUpdateTransaction = async (tx: Transaction): Promise<boolean> => {
    saveSnapshotToHistory();
    const isOffline = !isOnline;

    if (isOffline) {
      setTransactions(prev => prev.map(item => item.id === tx.id ? { ...tx, pending_sync: true } : item));
      logAction(`Actualizó movimiento contable offline: ${tx.type} de $${tx.amount.toLocaleString()}`, "Contabilidad");
      await enqueueRequest({
        url: `/api/accounting/entries/${tx.id}`,
        method: 'PUT',
        resource: 'accounting',
        action: 'update',
        body: tx
      });
      await updatePendingCount();
      triggerSyncToast(`Actualización guardada localmente.`);
      return true;
    }

    try {
      const response = await fetch(`/api/accounting/entries/${tx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      if (response.ok) {
        const result = await response.json();
        const updated = result.data || tx;
        setTransactions(prev => prev.map(item => item.id === tx.id ? updated : item));
        logAction(`Actualizó movimiento contable: ${tx.type} de $${tx.amount.toLocaleString()} en '${tx.category}'`, "Contabilidad");
        return true;
      } else {
        alert("Fallo al actualizar transacción en el servidor.");
        return false;
      }
    } catch (error) {
      console.error("Network error, queuing transaction update:", error);
      setTransactions(prev => prev.map(item => item.id === tx.id ? { ...tx, pending_sync: true } : item));
      await enqueueRequest({
        url: `/api/accounting/entries/${tx.id}`,
        method: 'PUT',
        resource: 'accounting',
        action: 'update',
        body: tx
      });
      await updatePendingCount();
      triggerSyncToast(`Actualización de transacción guardada localmente.`);
      return true;
    }
  };

  // --- ACTIONS: CONTENT CALENDAR ---
  const handleAddPublication = async (p: Publication) => {
    saveSnapshotToHistory();
    // Update local state first for instant UX response
    setPublications(prev => [p, ...prev]);
    logAction(`Añadió publicación al calendario: '${p.title}' para ${p.channel}`, "Calendario");

    try {
      await fetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
    } catch (err) {
      console.error("[Sync] Failed to post publication:", err);
    }
  };

  const handleUpdatePublication = async (p: Publication) => {
    saveSnapshotToHistory();
    // Update local state first
    setPublications(prev => prev.map(item => item.id === p.id ? p : item));
    logAction(`Actualizó publicación '${p.title}' en calendario`, "Calendario");

    try {
      await fetch(`/api/publications/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
    } catch (err) {
      console.error("[Sync] Failed to update publication:", err);
    }
  };

  const handleDeletePublication = async (id: string) => {
    saveSnapshotToHistory();
    // Update local state first
    setPublications(prev => prev.filter(item => item.id !== id));
    logAction(`Eliminó publicación ID ${id} del calendario`, "Calendario");

    try {
      await fetch(`/api/publications/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("[Sync] Failed to delete publication:", err);
    }
  };

  // --- ACTIONS: AI ADVISOR ---
  const handleAddRecommendation = (r: AIRecommendation) => {
    saveSnapshotToHistory();
    setRecommendations(prev => [r, ...prev]);
    logAction(`Guardó nueva recomendación IA de ${r.type}: '${r.title}'`, "Asesores IA");
  };

  const handleUpdateRecommendation = (r: AIRecommendation) => {
    saveSnapshotToHistory();
    setRecommendations(prev => prev.map(item => item.id === r.id ? r : item));
    logAction(`Ajustó versión de recomendación ID ${r.id} a v${r.version}`, "Asesores IA");
  };

  // Sidebar Menu Items
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'catalogo', label: 'Catálogo', icon: BookOpen },
    { id: 'pedidos', label: 'Pedidos especiales', icon: ShoppingBag },
    { id: 'clientes', label: 'Clientes y agenda', icon: Users },
    { id: 'contabilidad', label: 'Gestión contable', icon: DollarSign },
    { id: 'calendario', label: 'Calendario', icon: Calendar },
    { id: 'reportes', label: 'Reportes y KPI', icon: BarChart },
    { id: 'asesores', label: 'Asesores IA', icon: Sparkles },
    ...((jwtUser && (jwtUser.role === 'admin' || jwtUser.role === 'manager')) ? [
      { id: 'apikeys', label: 'Llaves y Auditoría', icon: Key }
    ] : []),
    { id: 'configuracion', label: 'Configuración', icon: Settings }
  ];

  // Check if we are in public catalog view
  const isPublicCatalog = window.location.search.includes('view=catalog') || 
                           window.location.hash.includes('view=catalog') || 
                           window.location.pathname.includes('/catalog') ||
                           window.location.pathname.includes('/catalogo');

  const isPublicTracking = window.location.search.includes('view=tracking') || 
                            window.location.search.includes('id=') ||
                            window.location.hash.includes('view=tracking') || 
                            window.location.pathname.includes('/orders/special') ||
                            window.location.pathname.includes('/special-order') ||
                            window.location.pathname.includes('/seguimiento') ||
                            window.location.pathname.includes('/track') ||
                            window.location.pathname.includes('/pedido');

  if (isPublicCatalog) {
    return <PublicCatalog products={products} />;
  }

  if (isPublicTracking) {
    return <PublicTracking />;
  }

  if (!jwtToken) {
    return (
      <AuthGate 
        onAuthSuccess={(token, user) => {
          safeSetItem('keinshop_jwt_token', token);
          safeSetItem('keinshop_user_info', JSON.stringify(user));
          setJwtToken(token);
          setJwtUser(user);
          // Sync with legacy role states
          if (user.role === 'admin') setRole('Admin');
          else if (user.role === 'manager') setRole('Gestor de Contenido');
          else setRole('Vendedor');
        }} 
      />
    );
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-[#FF7AA6]/30">
        <div className="flex flex-col items-center text-center max-w-sm w-full">
          {/* Logo / Brand Circle with pulse effect */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-[#203180] to-[#FF7AA6] rounded-full blur opacity-25 animate-pulse"></div>
            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center border-4 border-[#203180] shadow-xl">
              <span className="text-3xl font-black text-[#203180] select-none tracking-tighter" translate="no">KS</span>
            </div>
          </div>

          {/* Brand Name */}
          <h1 className="keinshop-brand mb-2">
            KEINSHOP <span className="keinshop-brand--accent">CRM</span>
          </h1>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-6">Inteligencia de Negocio</p>

          {/* Progress Spinner element */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <RefreshCw className="w-5 h-5 text-[#FF7AA6] animate-spin" />
            <span className="text-sm font-semibold text-[#203180]">Sincronizando con base de datos...</span>
          </div>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Cargando inventarios, pedidos especiales y reportes contables en tiempo real de forma segura.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 selection:bg-indigo-500 selection:text-white">
      
      {/* Dynamic Header */}
      <Header 
        currentRole={role} 
        onRoleChange={setRole} 
        auditLogs={auditLogs}
        onClearLogs={() => {
          setAuditLogs([]);
          logAction("Limpieza manual de logs de auditoría efectuada.", "Auditoría");
        }}
        loggedInUser={jwtUser}
        onlineAdmins={onlineAdmins}
        onLogout={() => {
          localStorage.removeItem('keinshop_jwt_token');
          localStorage.removeItem('keinshop_user_info');
          setJwtToken(null);
          setJwtUser(null);
          setActiveTab('dashboard');
        }}
        products={products}
        clients={clients}
        orders={orders}
        publications={publications}
        transactions={transactions}
        onNavigateToTab={setActiveTab}
      />

      {/* Main Structural Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        
        {/* Navigation Sidebar */}
        <nav className="w-full lg:w-64 bg-[#203180] text-white rounded-3xl p-5 shrink-0 shadow-lg h-fit space-y-1 border border-white/5">
          <div className="hidden lg:block pb-4 mb-4 border-b border-white/10 text-center">
            <h3 className="font-extrabold text-sm text-[#FF7AA6] tracking-wider uppercase">Menú <span translate="no">KEINSHOP</span></h3>
            <p className="text-[10px] text-white/50 mt-1">Navegación CRM Integral</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:flex lg:flex-col gap-1.5">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive 
                      ? 'bg-[#FF7AA6] text-white shadow-lg scale-[1.02]' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-white/60'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* AI Active Status Badge Box */}
          <div className="hidden lg:block mt-6 pt-4 border-t border-white/10">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest">IA Activa</span>
              </div>
              <p className="text-xs text-white/70 italic leading-snug">"Sugiero aumentar stock de sandalias para el fin de semana."</p>
            </div>
          </div>
        </nav>

        {/* Dynamic Tab Panel */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <Dashboard 
              products={products}
              orders={orders}
              transactions={transactions}
              publications={publications}
              clients={clients}
              role={role}
              onNavigate={setActiveTab}
              onAddProductQuick={() => {
                setActiveTab('inventario');
                // Auto trigger opens add product form in state
              }}
              onAddOrderQuick={() => {
                setActiveTab('pedidos');
              }}
              onAddPostQuick={() => {
                setActiveTab('calendario');
              }}
              undoHistoryLength={history.length}
              onUndo={handleUndo}
            />
          )}

          {activeTab === 'inventario' && (
            <Inventario 
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onRestoreProduct={handleRestoreProduct}
              onReorderProducts={setProducts}
              role={role}
            />
          )}

          {activeTab === 'catalogo' && (
            <Catalogo 
              products={products}
              onToggleVisibility={handleToggleProductVisibility}
              role={role}
            />
          )}

          {activeTab === 'pedidos' && (
            <PedidosEspeciales 
              orders={orders}
              clients={clients}
              onAddOrder={handleAddOrder}
              onUpdateOrder={handleUpdateOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onDeleteOrder={handleDeleteOrder}
              role={role}
              onScheduleInCalendar={handleScheduleOrderInCalendar}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientesAgenda 
              clients={clients}
              orders={orders}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onRestoreClient={handleRestoreClient}
              role={role}
            />
          )}

          {activeTab === 'contabilidad' && (
            <GestionContable 
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onRestoreTransaction={handleRestoreTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransactions={handleDeleteTransactions}
              onUpdateTransactions={handleUpdateTransactions}
              role={role}
            />
          )}

          {activeTab === 'calendario' && (
            <CalendarioContenido 
              publications={publications}
              products={products}
              clients={clients}
              orders={orders}
              onAddPublication={handleAddPublication}
              onUpdatePublication={handleUpdatePublication}
              onDeletePublication={handleDeletePublication}
              role={role}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesKPI 
              products={products}
              orders={orders}
              transactions={transactions}
              publications={publications}
              role={role}
            />
          )}

          {activeTab === 'asesores' && (
            <AsesoresIA 
              recommendations={recommendations}
              onAddRecommendation={handleAddRecommendation}
              onUpdateRecommendation={handleUpdateRecommendation}
              role={role}
              products={products}
              clients={clients}
              orders={orders}
              transactions={transactions}
            />
          )}

          {activeTab === 'apikeys' && jwtToken && jwtUser && (
            <ApiKeysManagement 
              token={jwtToken} 
              currentUser={jwtUser} 
            />
          )}

          {activeTab === 'configuracion' && (
            <Configuracion 
              role={role}
              products={products}
              clients={clients}
              orders={orders}
              transactions={transactions}
              auditLogs={auditLogs}
              onRestoreProduct={handleRestoreProduct}
              onRestoreClient={handleRestoreClient}
              onRestoreOrder={handleRestoreOrder}
              onRestoreTransaction={handleRestoreTransaction}
              onClearAuditLogs={handleClearAllAuditLogs}
            />
          )}
        </main>

      </div>

      {/* Persistent global footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12 text-center text-xs text-gray-400 font-medium">
        <p>© 2026 <span translate="no">KEINSHOP</span> CRM. Reservados todos los derechos.</p>
        <p className="text-[10px] mt-1 text-gray-300">Impulsado por Gemini 3.5 Flash & Inteligencia de Negocio.</p>
      </footer>

      {/* Floating Network/Queue Status Indicator */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {!isOnline ? (
          <div className="bg-amber-600 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-2xl border border-amber-500/20 flex items-center gap-2 animate-bounce">
            <span className="w-2.5 h-2.5 bg-amber-200 rounded-full animate-pulse"></span>
            <span>Modo Offline</span>
            {pendingQueueCount > 0 && (
              <span className="bg-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {pendingQueueCount} pendientes
              </span>
            )}
          </div>
        ) : (
          pendingQueueCount > 0 && (
            <button
              onClick={syncOfflineQueue}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-ping"></span>
              <span>Sincronizar {pendingQueueCount} pendientes</span>
            </button>
          )
        )}

        {showSyncToast && (
          <div className="bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-2xl border border-slate-800 animate-slide-in-right max-w-sm">
            {syncToastMsg}
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal Dialog */}
      {activeConflict && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-red-100 max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Conflicto de Versiones</h3>
                <p className="text-xs text-gray-500">Módulo: {activeConflict.resource.toUpperCase()} - ID: {activeConflict.id}</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Se detectó que el registro en el servidor fue modificado recientemente por otro usuario (versión <span className="font-bold text-red-600">v{activeConflict.currentVersion}</span>), mientras tú intentas guardar tus cambios desde una versión base desactualizada.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                  <h4 className="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1">Tu Versión Local</h4>
                  <pre className="text-[10px] text-gray-600 font-mono overflow-auto max-h-36">
                    {JSON.stringify(activeConflict.incomingData, null, 2)}
                  </pre>
                </div>
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                  <h4 className="font-bold text-indigo-700 mb-2 border-b border-indigo-100 pb-1">Versión Actual Servidor</h4>
                  <pre className="text-[10px] text-indigo-600 font-mono overflow-auto max-h-36">
                    {JSON.stringify(activeConflict.currentData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={activeConflict.onCancel}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                Conservar Servidor (Descartar mis cambios)
              </button>
              <button
                onClick={() => activeConflict.onResolve(activeConflict.incomingData)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
              >
                Sobrescribir Servidor (Conservar mis cambios)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
