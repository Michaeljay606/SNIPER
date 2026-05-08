import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

import { USE_SUPABASE } from '../config';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Lazy initialize Firestore to avoid connection errors when using Supabase
let _db: any = null;
export const getDb = () => {
  if (!_db) {
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, firebaseConfig.firestoreDatabaseId);
  }
  return _db;
};

// Export db as a legacy constant but it will trigger init on first access
export const db = USE_SUPABASE ? null : getDb();

export const storage = getStorage(app);

export const loginAnonymously = () => signInAnonymously(auth);
export const logout = () => signOut(auth);
