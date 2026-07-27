import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { initializeApp as initializeClientApp, getApps as getClientApps } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, getDocs, getDoc, query, where, limit, deleteDoc, setDoc } from "firebase/firestore";
import { getStorage as getClientStorage, ref as clientRef, uploadBytes, getDownloadURL } from "firebase/storage";
import crypto from "crypto";

const DB_FILE = path.join(process.cwd(), "keinshop.db");
const hydratedMarker = path.join(process.cwd(), ".sqlite_hydrated");

export let db: any;

function openDatabase() {
  try {
    const database = new Database(DB_FILE);
    database.pragma("journal_mode = WAL");
    database.pragma("synchronous = NORMAL");
    database.pragma("temp_store = MEMORY");
    database.pragma("cache_size = -2000");
    return database;
  } catch (err: any) {
    console.warn("[DB] Error opening or initializing database, attempting recovery:", err.message);
    try {
      if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
      if (fs.existsSync(`${DB_FILE}-wal`)) fs.unlinkSync(`${DB_FILE}-wal`);
      if (fs.existsSync(`${DB_FILE}-shm`)) fs.unlinkSync(`${DB_FILE}-shm`);
      if (fs.existsSync(hydratedMarker)) fs.unlinkSync(hydratedMarker);
    } catch (e) {
      console.error("[DB] Could not remove corrupt database files:", e);
    }
    try {
      const database = new Database(DB_FILE);
      database.pragma("journal_mode = WAL");
      database.pragma("synchronous = NORMAL");
      database.pragma("temp_store = MEMORY");
      database.pragma("cache_size = -2000");
      return database;
    } catch (fallbackErr) {
      console.error("[DB] Fallback database creation failed, using /tmp/keinshop.db:", fallbackErr);
      const tmpDb = new Database("/tmp/keinshop.db");
      tmpDb.pragma("journal_mode = WAL");
      return tmpDb;
    }
  }
}

db = openDatabase();

// Initialize Firebase
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
export let firestoreDb: any = null;
export let firebaseBucket: any = null;

if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    
    // Initialize Admin SDK solely for Storage (if storage bucket is configured)
    let adminApp;
    if (getAdminApps().length === 0) {
      adminApp = initializeAdminApp({
        projectId: config.projectId,
        storageBucket: config.storageBucket,
      });
    } else {
      adminApp = getAdminApps()[0];
    }

    if (config.storageBucket) {
      firebaseBucket = getStorage(adminApp).bucket();
    } else {
      firebaseBucket = getStorage(adminApp).bucket(`${config.projectId}.appspot.com`);
    }
    console.log("[Firebase Admin] Firebase Storage client initialized successfully with bucket:", firebaseBucket.name);

    // Initialize Client SDK for Firestore
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    };

    let clientApp;
    if (getClientApps().length === 0) {
      clientApp = initializeClientApp(firebaseConfig);
    } else {
      clientApp = getClientApps()[0];
    }

    if (config.firestoreDatabaseId) {
      firestoreDb = getFirestore(clientApp, config.firestoreDatabaseId);
    } else {
      firestoreDb = getFirestore(clientApp);
    }
    console.log("[Firebase Client] Firestore client initialized successfully with database:", config.firestoreDatabaseId || "default");

  } catch (err) {
    console.error("[Firebase] Error initializing Firestore/Storage client:", err);
  }
} else {
  console.log("[Firebase] firebase-applet-config.json not found. Firestore is disabled.");
}

export async function uploadFileToFirebase(localFilePath: string, destinationPath: string): Promise<string> {
  // 1. Try Admin SDK Upload
  if (firebaseBucket) {
    try {
      const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString();
      const options = {
        destination: destinationPath,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: token,
          }
        }
      };
      await withTimeout(firebaseBucket.upload(localFilePath, options), 10000);
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseBucket.name}/o/${encodeURIComponent(destinationPath)}?alt=media&token=${token}`;
      console.log(`[Firebase Storage - Admin] Upload successful for ${destinationPath}: ${downloadUrl}`);
      return downloadUrl;
    } catch (adminErr: any) {
      console.warn(`[Firebase Storage - Admin] Upload failed or timed out for ${destinationPath}, trying Client SDK:`, adminErr.message || adminErr);
    }
  }

  // 2. Try Client SDK Upload
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const firebaseConfig = {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      };
      const clientApp = getClientApps().length === 0 ? initializeClientApp(firebaseConfig) : getClientApps()[0];
      const clientStorage = getClientStorage(clientApp);
      const storageRef = clientRef(clientStorage, destinationPath);
      
      const fileBuffer = fs.readFileSync(localFilePath);
      await withTimeout(uploadBytes(storageRef, fileBuffer), 10000);
      const downloadUrl = await withTimeout(getDownloadURL(storageRef), 10000);
      console.log(`[Firebase Storage - Client] Upload successful for ${destinationPath}: ${downloadUrl}`);
      return downloadUrl;
    }
  } catch (clientErr: any) {
    console.warn(`[Firebase Storage - Client] Upload failed or timed out too for ${destinationPath}:`, clientErr.message || clientErr);
  }

  // 3. If both SDKs fail, throw an error instead of using Base64.
  // Using Base64 for images causes massive JSON payloads which crash the frontend (Unhandled Promise Rejections)
  // and trigger 413 Payload Too Large on the backend.
  throw new Error(`Firebase Storage upload failed for both Admin and Client SDKs. Bucket may not be configured.`);
}

let isFirestoreQuotaExceeded = false;

function handleFirestoreError(action: string, err: any) {
  const errMsg = err?.message || String(err || "");
  const errCode = err?.code || "";
  if (errMsg.includes("resource-exhausted") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota limit exceeded") || errCode === "resource-exhausted" || errCode === 8) {
    if (!isFirestoreQuotaExceeded) {
      isFirestoreQuotaExceeded = true;
      console.warn("[Firestore Sync] Free daily write quota reached for Firestore project. Local SQLite and JSON storage will continue providing 100% data persistence.");
    }
  } else {
    console.error(`[Firestore Sync] Error during ${action}:`, err);
  }
}

export async function syncTableToFirestore(collectionName: string, idField: string, list: any[]) {
  if (!firestoreDb || isFirestoreQuotaExceeded) return;
  try {
    const batch = writeBatch(firestoreDb);

    for (const item of list) {
      const docId = String(item[idField]);
      if (!docId || docId === "undefined" || docId === "null") continue;
      const docRef = doc(firestoreDb, collectionName, docId);
      const trackingToken = item.tracking_token || null;
      batch.set(docRef, {
        ...item,
        id: docId,
        deleted_at: item.deleted_at || null,
        tracking_token: trackingToken,
        _raw: JSON.stringify(item)
      });
    }

    await batch.commit();
    console.log(`[Firestore Sync] Synchronized ${list.length} docs in collection: ${collectionName}`);
  } catch (err) {
    handleFirestoreError(`synchronizing collection ${collectionName}`, err);
  }
}

export async function deleteFromFirestore(collectionName: string, docId: string) {
  if (!firestoreDb || isFirestoreQuotaExceeded) return;
  try {
    const docRef = doc(firestoreDb, collectionName, String(docId));
    await deleteDoc(docRef);
    console.log(`[Firestore Sync] Successfully deleted doc ${docId} from collection ${collectionName}`);
  } catch (err) {
    handleFirestoreError(`deleting doc ${docId} from collection ${collectionName}`, err);
  }
}

export function syncDeletedRecords(tableName: string, collectionName: string, idField: string, incomingList: any[]) {
  if (!firestoreDb || isFirestoreQuotaExceeded) return;
  try {
    for (const item of incomingList) {
      if (item && (item.deleted_at || item.status === 'deleted')) {
        const id = String(item[idField]);
        if (id && id !== "undefined" && id !== "null") {
          deleteFromFirestore(collectionName, id).catch(err => {
            console.error(`[Firestore Delete Sync] Failed to delete ${id} from collection ${collectionName}:`, err);
          });
        }
      }
    }
  } catch (err) {
    console.error(`[Firestore Delete Sync] Error processing deleted records for ${tableName}:`, err);
  }
}

export function saveTableDataset(
  tableName: string,
  collectionName: string,
  idField: string,
  incomingList: any[],
  jsonFile: string
): boolean {
  try {
    if (!Array.isArray(incomingList)) {
      incomingList = [];
    }

    const validIncomingList: any[] = [];
    const incomingKeys = new Set<string>();
    const deletedKeys = new Set<string>();

    for (const item of incomingList) {
      if (!item) continue;
      const key = String(item[idField]);
      if (!key || key === "undefined" || key === "null") continue;

      if (item.deleted_at || item.status === 'deleted') {
        deletedKeys.add(key);
      } else if (item.is_demo !== true && item.isdemo !== true) {
        incomingKeys.add(key);
        validIncomingList.push(item);
      }
    }

    // Delete explicitly deleted items from Firestore
    for (const key of deletedKeys) {
      deleteFromFirestore(collectionName, key).catch(err => {
        console.error(`[Firestore Delete Sync] Failed to delete ${key} from ${collectionName}:`, err);
      });
    }

    // 2.5 Compute delta to avoid burning Firestore write quota
    let existingRows: any[] = [];
    try {
      existingRows = db.prepare(`SELECT ${idField}, _raw FROM ${tableName}`).all();
    } catch (e) {
      console.warn(`[Diff] Could not fetch existing rows for ${tableName}:`, e);
    }
    const existingMap = new Map<string, string>();
    for (const r of existingRows) {
      existingMap.set(String(r[idField]), r._raw);
    }

    const changedOrNewItems: any[] = [];
    for (const item of validIncomingList) {
      const key = String(item[idField]);
      const newRaw = JSON.stringify(item);
      if (existingMap.get(key) !== newRaw) {
        changedOrNewItems.push(item);
      }
    }

    // 3. Update SQLite transactionally with the exact active list
    const deleteStmt = db.prepare(`DELETE FROM ${tableName}`);
    const insertStmt = db.prepare(
      `INSERT OR REPLACE INTO ${tableName} (${idField}, deleted_at, _raw) VALUES (?, ?, ?)`
    );

    const transaction = db.transaction((list: any[]) => {
      deleteStmt.run();
      for (const item of list) {
        const key = String(item[idField]);
        if (!key || key === "undefined" || key === "null") continue;
        const deletedAt = item.deleted_at || null;
        insertStmt.run(key, deletedAt, JSON.stringify(item));
      }
    });

    transaction(validIncomingList);

    // 4. Save active records to local JSON files for redundancy
    try {
      fs.writeFileSync(
        path.join(process.cwd(), jsonFile),
        JSON.stringify(validIncomingList, null, 2),
        "utf-8"
      );
      const backupName = jsonFile.replace(".json", "_backup.json");
      fs.writeFileSync(
        path.join(process.cwd(), backupName),
        JSON.stringify(validIncomingList, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.error(`[File Sync] Error saving ${jsonFile}:`, e);
    }

    // 5. Sync ONLY CHANGED active records to Firestore
    if (changedOrNewItems.length > 0) {
      syncTableToFirestore(collectionName, idField, changedOrNewItems).catch(err => {
        console.error(`Firestore sync failed for ${tableName}:`, err);
      });
    }

    return true;
  } catch (err) {
    console.error(`Error executing save for table ${tableName}:`, err);
    return false;
  }
}

export function hardDeleteEntity(tableName: string, collectionName: string, idField: string, id: string): boolean {
  try {
    db.prepare(`DELETE FROM ${tableName} WHERE ${idField} = ?`).run(String(id));
    deleteFromFirestore(collectionName, String(id)).catch(err => {
      console.error(`[Firestore Delete] Failed to delete ${id} from ${collectionName}:`, err);
    });
    const rows = db.prepare(`SELECT _raw FROM ${tableName}`).all() as any[];
    const list = rows.map((r: any) => JSON.parse(r._raw)).filter((item: any) => item.is_demo !== true && item.isdemo !== true);
    const jsonMap: Record<string, string> = {
      special_orders: "special_orders.json",
      inventory: "inventory.json",
      accounting_entries: "accounting_entries.json",
      clients: "clients.json",
      loans: "loans.json",
      investments: "investments.json",
      publications: "publications.json",
      sales: "sales.json"
    };
    if (jsonMap[tableName]) {
      try {
        fs.writeFileSync(path.join(process.cwd(), jsonMap[tableName]), JSON.stringify(list, null, 2), "utf-8");
      } catch (e) {}
    }
    return true;
  } catch (err) {
    console.error(`Error hard deleting ${id} from ${tableName}:`, err);
    return false;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function hydrateFromFirestore() {
  if (!firestoreDb || isFirestoreQuotaExceeded) {
    console.log("[DB HYDRATION] Firestore not initialized or quota exceeded. Skipping cloud hydration.");
    return;
  }

  console.log("[DB HYDRATION] Hydrating SQLite database from Firestore Cloud...");
  const collections = [
    { name: "special_orders", idField: "id", table: "special_orders", jsonFile: "special_orders.json" },
    { name: "clients", idField: "id", table: "clients", jsonFile: "clients.json" },
    { name: "inventory", idField: "sku", table: "inventory", jsonFile: "inventory.json" },
    { name: "accounting", idField: "id", table: "accounting_entries", jsonFile: "accounting_entries.json" },
    { name: "loans", idField: "id", table: "loans", jsonFile: "loans.json" },
    { name: "investments", idField: "id", table: "investments", jsonFile: "investments.json" },
    { name: "publications", idField: "id", table: "publications", jsonFile: "publications.json" },
    { name: "sales", idField: "id", table: "sales", jsonFile: "sales.json" }
  ];

  for (const col of collections) {
    if (isFirestoreQuotaExceeded) break;
    try {
      const colRef = collection(firestoreDb, col.name);
      const snapshot = await withTimeout(getDocs(colRef), 5000);

      // Load existing SQLite rows first to avoid losing locally created records
      const existingMap = new Map<string, any>();
      try {
        const rows = db.prepare(`SELECT _raw FROM ${col.table}`).all() as any[];
        for (const r of rows) {
          if (!r._raw) continue;
          try {
            const item = JSON.parse(r._raw);
            const key = String(item[col.idField]);
            if (key && !item.deleted_at && item.status !== 'deleted') {
              existingMap.set(key, item);
            }
          } catch (e) {}
        }
      } catch (e) {}

      if (!snapshot.empty) {
        snapshot.forEach((documentDoc: any) => {
          const data = documentDoc.data();
          let item: any = null;
          if (data._raw) {
            try {
              item = JSON.parse(data._raw);
            } catch (e) {}
          }
          if (!item) {
            item = { ...data };
            if (!item[col.idField]) {
              item[col.idField] = documentDoc.id;
            }
          }
          if (item && !item.deleted_at && item.status !== 'deleted') {
            const key = String(item[col.idField]);
            const existing = existingMap.get(key);
            if (!existing) {
              existingMap.set(key, item);
            } else {
              const localTime = existing.updated_at || existing.updatedAt || '';
              const cloudTime = item.updated_at || item.updatedAt || '';
              if (cloudTime && cloudTime >= localTime) {
                existingMap.set(key, { ...existing, ...item });
              }
            }
          }
        });
      }

      const mergedList = Array.from(existingMap.values());
      if (mergedList.length > 0) {
        console.log(`[DB HYDRATION] Merging ${mergedList.length} records into table ${col.table}...`);
        saveTableDataset(col.table, col.name, col.idField, mergedList, col.jsonFile);
      }
    } catch (err) {
      handleFirestoreError(`hydrating collection ${col.name}`, err);
    }
  }
}


// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS special_orders (
    id TEXT PRIMARY KEY,
    deleted_at TEXT,
    _raw TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory (
    sku TEXT PRIMARY KEY,
    deleted_at TEXT,
    _raw TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounting_entries (
    id TEXT PRIMARY KEY,
    deleted_at TEXT,
    _raw TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    deleted_at TEXT,
    _raw TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    details TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_id TEXT,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    deleted_at TEXT,
    _raw TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    deleted_at TEXT,
    _raw TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS publications (
    id TEXT PRIMARY KEY,
    deleted_at TEXT,
    _raw TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    deleted_at TEXT,
    _raw TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_special_orders_deleted_at ON special_orders (deleted_at);
  CREATE INDEX IF NOT EXISTS idx_inventory_deleted_at ON inventory (deleted_at);
  CREATE INDEX IF NOT EXISTS idx_accounting_entries_deleted_at ON accounting_entries (deleted_at);
  CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients (deleted_at);
  CREATE INDEX IF NOT EXISTS idx_loans_deleted_at ON loans (deleted_at);
  CREATE INDEX IF NOT EXISTS idx_investments_deleted_at ON investments (deleted_at);
  CREATE INDEX IF NOT EXISTS idx_publications_deleted_at ON publications (deleted_at);
  CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales (deleted_at);
`);

/**
 * Migration helper to load existing real data from JSON files on first run.
 * This ensures NO DATA LOSS while fully transitioning to SQLite.
 */
export function migrateFromJSONFiles() {
  try {
    console.log("[DB MIGRATION] Running JSON-to-SQLite migration check...");

    // 1. Special Orders
    const ordersCount = (db.prepare("SELECT count(*) as count FROM special_orders").get() as any).count;
    if (ordersCount === 0) {
      const filePath = path.join(process.cwd(), "special_orders.json");
      if (fs.existsSync(filePath)) {
        console.log("[DB MIGRATION] Migrating special_orders from JSON...");
        const content = fs.readFileSync(filePath, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list) && list.length > 0) {
          saveOrders(list);
        }
      }
    }

    // 2. Clients
    const clientsCount = (db.prepare("SELECT count(*) as count FROM clients").get() as any).count;
    if (clientsCount === 0) {
      const filePath = path.join(process.cwd(), "clients.json");
      if (fs.existsSync(filePath)) {
        console.log("[DB MIGRATION] Migrating clients from JSON...");
        const content = fs.readFileSync(filePath, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list) && list.length > 0) {
          saveClients(list);
        }
      }
    }

    // 3. Inventory
    const inventoryCount = (db.prepare("SELECT count(*) as count FROM inventory").get() as any).count;
    if (inventoryCount === 0) {
      const filePath = path.join(process.cwd(), "inventory.json");
      if (fs.existsSync(filePath)) {
        console.log("[DB MIGRATION] Migrating inventory from JSON...");
        const content = fs.readFileSync(filePath, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list) && list.length > 0) {
          saveInventory(list);
        }
      }
    }

    // 4. Accounting Entries
    const acctCount = (db.prepare("SELECT count(*) as count FROM accounting_entries").get() as any).count;
    if (acctCount === 0) {
      const filePath = path.join(process.cwd(), "accounting_entries.json");
      if (fs.existsSync(filePath)) {
        console.log("[DB MIGRATION] Migrating accounting_entries from JSON...");
        const content = fs.readFileSync(filePath, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list) && list.length > 0) {
          saveAccounting(list);
        }
      }
    }

    // 5. Loans
    const loansCount = (db.prepare("SELECT count(*) as count FROM loans").get() as any).count;
    if (loansCount === 0) {
      const filePath = path.join(process.cwd(), "loans.json");
      if (fs.existsSync(filePath)) {
        console.log("[DB MIGRATION] Migrating loans from JSON...");
        const content = fs.readFileSync(filePath, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list) && list.length > 0) {
          saveLoans(list);
        }
      }
    }

    // 6. Investments
    const invCount = (db.prepare("SELECT count(*) as count FROM investments").get() as any).count;
    if (invCount === 0) {
      const filePath = path.join(process.cwd(), "investments.json");
      if (fs.existsSync(filePath)) {
        console.log("[DB MIGRATION] Migrating investments from JSON...");
        const content = fs.readFileSync(filePath, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list) && list.length > 0) {
          saveInvestments(list);
        }
      }
    }

    // 7. Publications
    const pubCount = (db.prepare("SELECT count(*) as count FROM publications").get() as any).count;
    if (pubCount === 0) {
      const filePath = path.join(process.cwd(), "publications.json");
      if (fs.existsSync(filePath)) {
        console.log("[DB MIGRATION] Migrating publications from JSON...");
        const content = fs.readFileSync(filePath, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list) && list.length > 0) {
          savePublications(list);
        }
      }
    }

    console.log("[DB MIGRATION] JSON-to-SQLite migration check complete.");
  } catch (err) {
    console.error("[DB MIGRATION] Error migrating from JSON files:", err);
  }
}

export async function performOneTimeMasterPurgeV3() {
  console.log("[DB] Master purge disabled permanently to ensure all user data is safely preserved.");
  return;
}

// --- AUDIT LOGS ---

export function logAuditAction(
  action: "CREATE" | "EDIT" | "DELETE" | "RESTORE",
  entity: "special_order" | "inventory" | "accounting" | "clients",
  entity_id: string,
  user_id: string,
  details: any
) {
  try {
    const id = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const timestamp = new Date().toISOString();
    const detailsStr = JSON.stringify(details);

    db.prepare(`
      INSERT INTO audit_logs (id, action, entity, entity_id, user_id, timestamp, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, action, entity, entity_id, user_id || "admin_ken", timestamp, detailsStr);

    console.log(`[Audit Log Saved to DB] ${action} on ${entity} ID: ${entity_id} by ${user_id}`);
  } catch (err) {
    console.error("Error saving audit log in SQLite:", err);
  }
}

export function loadAuditLogs(): any[] {
  try {
    const rows = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC").all() as any[];
    return rows.map(r => ({
      log_id: r.id,
      id: r.id,
      action: r.action,
      entity: r.entity,
      entity_id: r.entity_id,
      user_id: r.user_id,
      timestamp: r.timestamp,
      details: JSON.parse(r.details)
    }));
  } catch (err) {
    console.error("Error loading audit logs from SQLite:", err);
    return [];
  }
}

export function clearAuditLogs(): boolean {
  try {
    db.prepare("DELETE FROM audit_logs").run();
    return true;
  } catch (err) {
    console.error("Error clearing audit logs in SQLite:", err);
    return false;
  }
}

// --- SPECIAL ORDERS ---

export async function fetchFirestoreOrder(cleanId: string): Promise<any | null> {
  if (!firestoreDb) return null;
  try {
    const docRef = doc(firestoreDb, "special_orders", cleanId);
    const docSnap = await withTimeout(getDoc(docRef), 5000);
    if (docSnap.exists()) {
      const docData = docSnap.data();
      if (docData && docData._raw) {
        return JSON.parse(docData._raw);
      }
    }

    const q = query(
      collection(firestoreDb, "special_orders"),
      where("tracking_token", "==", cleanId),
      limit(1)
    );
    const querySnapshot = await withTimeout(getDocs(q), 5000);
    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data();
      if (docData && docData._raw) {
        return JSON.parse(docData._raw);
      }
    }
  } catch (err) {
    console.error("[db.ts fetchFirestoreOrder] Error querying Firestore:", err);
  }
  return null;
}

export function loadOrders(): any[] {
  try {
    const rows = db.prepare("SELECT _raw FROM special_orders").all() as any[];
    return rows.map(r => JSON.parse(r._raw)).filter(item => item.is_demo !== true && item.isdemo !== true);
  } catch (err) {
    console.error("Error loading special orders from SQLite:", err);
    return [];
  }
}

export function saveOrders(ordersList: any[]) {
  return saveTableDataset("special_orders", "special_orders", "id", ordersList, "special_orders.json");
}

// --- INVENTORY ---

export function loadInventory(): any[] {
  try {
    const rows = db.prepare("SELECT _raw FROM inventory").all() as any[];
    return rows.map(r => JSON.parse(r._raw)).filter(item => item.is_demo !== true && item.isdemo !== true);
  } catch (err) {
    console.error("Error loading inventory from SQLite:", err);
    return [];
  }
}

export function saveInventory(itemsList: any[]) {
  return saveTableDataset("inventory", "inventory", "sku", itemsList, "inventory.json");
}

// --- ACCOUNTING ENTRIES ---

export function loadAccounting(): any[] {
  try {
    const rows = db.prepare("SELECT _raw FROM accounting_entries").all() as any[];
    return rows.map(r => JSON.parse(r._raw)).filter(item => item.is_demo !== true && item.isdemo !== true);
  } catch (err) {
    console.error("Error loading accounting entries from SQLite:", err);
    return [];
  }
}

export function saveAccounting(entriesList: any[]) {
  return saveTableDataset("accounting_entries", "accounting", "id", entriesList, "accounting_entries.json");
}

// --- CLIENTS ---

export function loadClients(): any[] {
  try {
    const rows = db.prepare("SELECT _raw FROM clients").all() as any[];
    return rows.map(r => JSON.parse(r._raw)).filter(item => item.is_demo !== true && item.isdemo !== true);
  } catch (err) {
    console.error("Error loading clients from SQLite:", err);
    return [];
  }
}

export function saveClients(clientsList: any[]) {
  return saveTableDataset("clients", "clients", "id", clientsList, "clients.json");
}

// --- INTERACTIONS ---

export interface InteractionRecord {
  id: string;
  product_id: string;
  user_id: string | null;
  type: "view" | "click" | "order";
  timestamp: string;
}

export function saveInteraction(rec: InteractionRecord): boolean {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO interactions (id, product_id, user_id, type, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(rec.id, rec.product_id, rec.user_id || null, rec.type, rec.timestamp);
    return true;
  } catch (err) {
    console.error("Error saveInteraction in SQLite:", err);
    return false;
  }
}

export function loadInteractions(): InteractionRecord[] {
  try {
    const rows = db.prepare("SELECT * FROM interactions ORDER BY timestamp DESC").all() as any[];
    return rows.map(r => ({
      id: r.id,
      product_id: r.product_id,
      user_id: r.user_id,
      type: r.type,
      timestamp: r.timestamp
    }));
  } catch (err) {
    console.error("Error loadInteractions from SQLite:", err);
    return [];
  }
}

export function deleteInteraction(id: string): boolean {
  try {
    db.prepare("DELETE FROM interactions WHERE id = ?").run(id);
    return true;
  } catch (err) {
    console.error("Error deleteInteraction in SQLite:", err);
    return false;
  }
}

export function clearAllInteractions(): boolean {
  try {
    db.prepare("DELETE FROM interactions").run();
    return true;
  } catch (err) {
    console.error("Error clearAllInteractions in SQLite:", err);
    return false;
  }
}

// --- LOANS (PRÉSTAMOS) ---

export function loadLoans(): any[] {
  try {
    const rows = db.prepare("SELECT _raw FROM loans WHERE deleted_at IS NULL").all() as any[];
    return rows.map(r => JSON.parse(r._raw));
  } catch (err) {
    console.error("Error loading loans from SQLite:", err);
    return [];
  }
}

export function saveLoans(loansList: any[]) {
  return saveTableDataset("loans", "loans", "id", loansList, "loans.json");
}

// --- INVESTMENTS (INVERSIONES) ---

export function loadInvestments(): any[] {
  try {
    const rows = db.prepare("SELECT _raw FROM investments WHERE deleted_at IS NULL").all() as any[];
    return rows.map(r => JSON.parse(r._raw));
  } catch (err) {
    console.error("Error loading investments from SQLite:", err);
    return [];
  }
}

export function saveInvestments(invsList: any[]) {
  return saveTableDataset("investments", "investments", "id", invsList, "investments.json");
}

// --- PUBLICATIONS ---

export function loadPublications(): any[] {
  try {
    const rows = db.prepare("SELECT _raw FROM publications").all() as any[];
    return rows.map(r => JSON.parse(r._raw)).filter(item => item.is_demo !== true && item.isdemo !== true);
  } catch (err) {
    console.error("Error loading publications from SQLite:", err);
    return [];
  }
}

export function savePublications(publicationsList: any[]) {
  return saveTableDataset("publications", "publications", "id", publicationsList, "publications.json");
}

// --- SALES & INVOICES ---

export function loadSales(): any[] {
  try {
    const rows = db.prepare("SELECT _raw FROM sales").all() as any[];
    return rows.map(r => JSON.parse(r._raw)).filter(item => item.is_demo !== true && item.isdemo !== true);
  } catch (err) {
    console.error("Error loading sales from SQLite:", err);
    return [];
  }
}

export function saveSales(salesList: any[]) {
  return saveTableDataset("sales", "sales", "id", salesList, "sales.json");
}



