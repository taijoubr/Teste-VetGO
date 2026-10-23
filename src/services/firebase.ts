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

// Cloud Sync Helpers
export const firestoreSync = {
  async saveDoc(collectionName: string, id: string, data: any) {
    const docPath = `${collectionName}/${id}`;
    try {
      const docRef = doc(db, collectionName, String(id));
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn(`[Firestore] Erro ao salvar ${docPath}, mantendo local:`, err);
    }
  },

  async deleteDoc(collectionName: string, id: string) {
    const docPath = `${collectionName}/${id}`;
    try {
      const docRef = doc(db, collectionName, String(id));
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`[Firestore] Erro ao remover ${docPath}:`, err);
    }
  },

  async fetchCollection(collectionName: string, userId?: string): Promise<any[]> {
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
      return items;
    } catch (err) {
      console.warn(`[Firestore] Erro ao buscar ${collectionName}:`, err);
      return [];
    }
  }
};
