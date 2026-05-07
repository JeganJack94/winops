import { db } from './firebase';
import { 
  collection, 
  onSnapshot,
  query,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  orderBy
} from 'firebase/firestore';

const EARNINGS_OVERRIDES_COLLECTION = 'earnings_overrides';
const PAYOUTS_COLLECTION = 'payout_records';

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
  },

  // Payouts & Advances
  subscribeToPayouts: (callback) => {
    const q = query(collection(db, PAYOUTS_COLLECTION), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const payouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(payouts);
    });
  },

  addPayout: async (data) => {
    return await addDoc(collection(db, PAYOUTS_COLLECTION), {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  deletePayout: async (id) => {
    await deleteDoc(doc(db, PAYOUTS_COLLECTION, id));
  },

  updatePayout: async (id, data) => {
    await updateDoc(doc(db, PAYOUTS_COLLECTION, id), data);
  }
};
