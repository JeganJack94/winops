import { db } from './firebase';
import { 
  collection, 
  onSnapshot,
  query,
  updateDoc,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';

const EARNINGS_OVERRIDES_COLLECTION = 'earnings_overrides';

export const earningsService = {
  subscribeToOverrides: (callback) => {
    const q = query(collection(db, EARNINGS_OVERRIDES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const overrides = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(overrides);
    });
  },

  // Save an override or create it if it doesn't exist
  setOverride: async (id, data) => {
    // id is expected to be `${date}_${riderId}`
    await setDoc(doc(db, EARNINGS_OVERRIDES_COLLECTION, id), {
      ...data,
      timestamp: new Date().toISOString()
    }, { merge: true });
  },

  deleteOverride: async (id) => {
    await deleteDoc(doc(db, EARNINGS_OVERRIDES_COLLECTION, id));
  }
};
