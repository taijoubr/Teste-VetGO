import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore using the designated named database from firebase-applet-config.json
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Critical Firestore Connection Validator
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Conexão com Firestore confirmada com sucesso.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Cliente offline, operando em modo offline resiliente.');
    } else {
      console.log('[Firebase] Healthcheck inicial executado.');
    }
    return false;
  }
}

// Run test connection
testConnection().catch(() => {});

// ==========================================
// DETAILED SYNC LOGGING & OBSERVABILITY
// ==========================================

export interface FirestoreSyncLogEntry {
  id: string;
  timestamp: string; // ISO string
  collection: string; // e.g. 'tutors', 'patients', 'appointments', 'users'
  docId: string;
  action: 'SAVE' | 'DELETE' | 'FETCH' | 'BATCH_SYNC' | 'RESTORE';
  status: 'SUCCESS' | 'ERROR' | 'INFO';
  itemSummary?: string;
  details?: string;
  error?: string;
  durationMs?: number;
}

const SYNC_LOGS_STORAGE_KEY = 'vetgo_firestore_sync_logs';
const MAX_SYNC_LOGS = 150;

/**
 * Returns all recorded Firestore synchronization events from local storage.
 */
export function getFirestoreSyncLogs(): FirestoreSyncLogEntry[] {
  try {
    const raw = localStorage.getItem(SYNC_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Appends a new synchronization log entry, persists it in local storage ring buffer,
 * and notifies active UI listeners (e.g. Sidebar status widget).
 */
export function addFirestoreSyncLog(
  entry: Omit<FirestoreSyncLogEntry, 'id' | 'timestamp'>
): FirestoreSyncLogEntry {
  const fullEntry: FirestoreSyncLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const existing = getFirestoreSyncLogs();
    const updated = [fullEntry, ...existing].slice(0, MAX_SYNC_LOGS);
    localStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem('vetgo_firestore_last_sync_time', fullEntry.timestamp);
    if (fullEntry.status === 'SUCCESS') {
      localStorage.setItem('vetgo_firestore_last_success_time', fullEntry.timestamp);
    }
  } catch (e) {
    console.warn('[SyncLog] Erro ao persistir log de sincronização:', e);
  }

  // Dispatch custom window event for real-time reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vetgo_sync_event', {
        detail: fullEntry,
      })
    );
  }

  return fullEntry;
}

/**
 * Clears all recorded sync logs.
 */
export function clearFirestoreSyncLogs(): void {
  try {
    localStorage.removeItem(SYNC_LOGS_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vetgo_sync_event', { detail: { action: 'CLEAR' } }));
    }
  } catch {}
}

/**
 * Computes quick aggregate stats on Firestore synchronization.
 */
export function getFirestoreSyncStats() {
  const logs = getFirestoreSyncLogs();
  const total = logs.length;
  const successCount = logs.filter((l) => l.status === 'SUCCESS').length;
  const errorCount = logs.filter((l) => l.status === 'ERROR').length;
  const lastSyncTime = localStorage.getItem('vetgo_firestore_last_sync_time') || (logs[0]?.timestamp ?? null);
  const lastSuccessTime = localStorage.getItem('vetgo_firestore_last_success_time') || null;

  return {
    total,
    successCount,
    errorCount,
    lastSyncTime,
    lastSuccessTime,
    isHealthy: errorCount === 0 || (total > 0 && successCount / total > 0.8),
  };
}

// ==========================================
// ROBUST CLOUD SYNC HELPERS & VAULT RESCUE
// ==========================================

export const firestoreSync = {
  /**
   * Saves a single document into Firestore with detailed telemetry and logging.
   */
  async saveDoc(collectionName: string, id: string, data: any, itemSummary?: string): Promise<{ success: boolean; error?: string }> {
    const start = Date.now();
    const docPath = `${collectionName}/${id}`;
    const summary = itemSummary || `${collectionName} #${id}`;

    try {
      const docRef = doc(db, collectionName, String(id));
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      const durationMs = Date.now() - start;

      addFirestoreSyncLog({
        collection: collectionName,
        docId: String(id),
        action: 'SAVE',
        status: 'SUCCESS',
        itemSummary: summary,
        details: `Salvo com sucesso em Firestore (${docPath})`,
        durationMs,
      });

      return { success: true };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errMsg = err?.message || String(err);
      console.warn(`[Firestore] Erro ao salvar ${docPath}, mantendo local:`, err);

      addFirestoreSyncLog({
        collection: collectionName,
        docId: String(id),
        action: 'SAVE',
        status: 'ERROR',
        itemSummary: summary,
        details: `Falha ao sincronizar documento na nuvem`,
        error: errMsg,
        durationMs,
      });

      return { success: false, error: errMsg };
    }
  },

  /**
   * Removes a document from Firestore with detailed telemetry.
   */
  async deleteDoc(collectionName: string, id: string, itemSummary?: string): Promise<{ success: boolean; error?: string }> {
    const start = Date.now();
    const docPath = `${collectionName}/${id}`;
    const summary = itemSummary || `${collectionName} #${id}`;

    try {
      const docRef = doc(db, collectionName, String(id));
      await deleteDoc(docRef);
      const durationMs = Date.now() - start;

      addFirestoreSyncLog({
        collection: collectionName,
        docId: String(id),
        action: 'DELETE',
        status: 'SUCCESS',
        itemSummary: summary,
        details: `Excluído com sucesso do Firestore (${docPath})`,
        durationMs,
      });

      return { success: true };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errMsg = err?.message || String(err);
      console.warn(`[Firestore] Erro ao remover ${docPath}:`, err);

      addFirestoreSyncLog({
        collection: collectionName,
        docId: String(id),
        action: 'DELETE',
        status: 'ERROR',
        itemSummary: summary,
        details: `Falha ao remover documento na nuvem`,
        error: errMsg,
        durationMs,
      });

      return { success: false, error: errMsg };
    }
  },

  /**
   * Fetches an entire collection with telemetry.
   */
  async fetchCollection(collectionName: string, userId?: string): Promise<any[]> {
    const start = Date.now();
    try {
      const colRef = collection(db, collectionName);
      let q = query(colRef);
      if (userId) {
        q = query(colRef, where('userId', '==', String(userId)));
      }
      const snapshot = await getDocs(q);
      const items: any[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });

      const durationMs = Date.now() - start;
      addFirestoreSyncLog({
        collection: collectionName,
        docId: 'all',
        action: 'FETCH',
        status: 'SUCCESS',
        itemSummary: `Coleção ${collectionName}`,
        details: `${items.length} registro(s) obtido(s) do Firestore`,
        durationMs,
      });

      return items;
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errMsg = err?.message || String(err);
      console.warn(`[Firestore] Erro ao buscar ${collectionName}:`, err);

      addFirestoreSyncLog({
        collection: collectionName,
        docId: 'all',
        action: 'FETCH',
        status: 'ERROR',
        itemSummary: `Coleção ${collectionName}`,
        details: `Falha ao consultar coleção`,
        error: errMsg,
        durationMs,
      });

      return [];
    }
  },

  /**
   * Pushes all local entities (vault tutors, patients, user profile) to Firestore
   * to guarantee zero data loss across container restarts or new commits.
   */
  async syncAllToFirestore(userId?: string): Promise<{
    success: boolean;
    syncedCount: number;
    errorsCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    let syncedCount = 0;
    let errorsCount = 0;

    const currentUserId = userId || '1';

    // 1. Sync User Profile
    try {
      const rawUser = localStorage.getItem('vetgo_current_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const res = await this.saveDoc('users', String(u.id || currentUserId), u, `Perfil do Veterinário: ${u.first_name || 'Usuário'}`);
        if (res.success) {
          syncedCount++;
          details.push(`Perfil de ${u.email || u.first_name} sincronizado`);
        } else {
          errorsCount++;
          details.push(`Erro ao sincronizar perfil: ${res.error}`);
        }
      }
    } catch (e: any) {
      errorsCount++;
      details.push(`Erro perfil: ${e.message}`);
    }

    // 2. Collect Tutors from all local keys
    const tutorsMap = new Map<string, any>();
    const tutorKeys = ['vetgo_permanent_vault_tutors', 'vetgo_tutors', `vetgo_tutors_u${currentUserId}`];
    for (const key of tutorKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            arr.forEach((t) => {
              if (t && t.id) tutorsMap.set(String(t.id), t);
            });
          }
        }
      } catch {}
    }

    for (const [tutorId, tutor] of tutorsMap.entries()) {
      const res = await this.saveDoc(
        'tutors',
        String(tutorId),
        { ...tutor, userId: String(currentUserId) },
        `Tutor: ${tutor.name || 'Sem Nome'} (ID: ${tutorId})`
      );
      if (res.success) {
        syncedCount++;
      } else {
        errorsCount++;
      }
    }
    if (tutorsMap.size > 0) {
      details.push(`${tutorsMap.size} tutor(es) processado(s)`);
    }

    // 3. Collect Patients from all local keys
    const patientsMap = new Map<string, any>();
    const patientKeys = ['vetgo_permanent_vault_patients', 'vetgo_patients', `vetgo_patients_u${currentUserId}`];
    for (const key of patientKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            arr.forEach((p) => {
              if (p && p.id) patientsMap.set(String(p.id), p);
            });
          }
        }
      } catch {}
    }

    for (const [patId, patient] of patientsMap.entries()) {
      const res = await this.saveDoc(
        'patients',
        String(patId),
        { ...patient, userId: String(currentUserId) },
        `Paciente: ${patient.name || 'Sem Nome'} (${patient.species || 'Espécie não informada'})`
      );
      if (res.success) {
        syncedCount++;
      } else {
        errorsCount++;
      }
    }
    if (patientsMap.size > 0) {
      details.push(`${patientsMap.size} paciente(s) processado(s)`);
    }

    const overallSuccess = errorsCount === 0;

    addFirestoreSyncLog({
      collection: 'all',
      docId: 'batch',
      action: 'BATCH_SYNC',
      status: overallSuccess ? 'SUCCESS' : errorsCount > 0 && syncedCount > 0 ? 'INFO' : 'ERROR',
      itemSummary: `Sincronização Completa (${syncedCount} itens gravados)`,
      details: details.join(' • '),
      error: errorsCount > 0 ? `${errorsCount} item(ns) falharam na sincronização` : undefined,
    });

    return {
      success: overallSuccess,
      syncedCount,
      errorsCount,
      details,
    };
  },

  /**
   * Restores tutors and patients from Firestore back to the browser storage
   * in case local storage was cleared or user logged in from a new machine.
   */
  async restoreFromFirestore(userId?: string): Promise<{
    tutorsRestored: number;
    patientsRestored: number;
    message: string;
  }> {
    const currentUserId = userId || '1';
    let tutorsRestored = 0;
    let patientsRestored = 0;

    try {
      const cloudTutors = await this.fetchCollection('tutors', currentUserId);
      if (cloudTutors.length > 0) {
        const existingRaw = localStorage.getItem('vetgo_permanent_vault_tutors') || '[]';
        const existing = JSON.parse(existingRaw);
        const map = new Map<string, any>();
        existing.forEach((t: any) => map.set(String(t.id), t));
        cloudTutors.forEach((ct: any) => map.set(String(ct.id), ct));

        const merged = Array.from(map.values());
        localStorage.setItem('vetgo_permanent_vault_tutors', JSON.stringify(merged));
        localStorage.setItem('vetgo_tutors', JSON.stringify(merged));
        localStorage.setItem(`vetgo_tutors_u${currentUserId}`, JSON.stringify(merged));
        tutorsRestored = cloudTutors.length;
      }

      const cloudPatients = await this.fetchCollection('patients', currentUserId);
      if (cloudPatients.length > 0) {
        const existingRaw = localStorage.getItem('vetgo_permanent_vault_patients') || '[]';
        const existing = JSON.parse(existingRaw);
        const map = new Map<string, any>();
        existing.forEach((p: any) => map.set(String(p.id), p));
        cloudPatients.forEach((cp: any) => map.set(String(cp.id), cp));

        const merged = Array.from(map.values());
        localStorage.setItem('vetgo_permanent_vault_patients', JSON.stringify(merged));
        localStorage.setItem('vetgo_patients', JSON.stringify(merged));
        localStorage.setItem(`vetgo_patients_u${currentUserId}`, JSON.stringify(merged));
        patientsRestored = cloudPatients.length;
      }

      // Also trigger backend sync vault endpoint to rebuild ephemeral database
      if (tutorsRestored > 0 || patientsRestored > 0) {
        fetch('/api/v1/sync/vault', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tutors: cloudTutors,
            patients: cloudPatients,
          }),
        }).catch(() => {});
      }

      addFirestoreSyncLog({
        collection: 'all',
        docId: 'restore',
        action: 'RESTORE',
        status: 'SUCCESS',
        itemSummary: `Restauração da Nuvem Concluída`,
        details: `${tutorsRestored} tutores e ${patientsRestored} pacientes recuperados com sucesso do Firestore`,
      });

      return {
        tutorsRestored,
        patientsRestored,
        message: `Restauração concluída! ${tutorsRestored} tutores e ${patientsRestored} pacientes recuperados.`,
      };
    } catch (err: any) {
      addFirestoreSyncLog({
        collection: 'all',
        docId: 'restore',
        action: 'RESTORE',
        status: 'ERROR',
        itemSummary: `Falha na Restauração`,
        error: err?.message || String(err),
      });

      return {
        tutorsRestored: 0,
        patientsRestored: 0,
        message: `Falha ao restaurar dados da nuvem: ${err?.message || String(err)}`,
      };
    }
  },
};
