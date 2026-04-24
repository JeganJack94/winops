import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  query,
  orderBy
} from 'firebase/firestore';

const SETTLEMENTS_COLLECTION = 'settlements';

export const settlementService = {
  subscribeToSettlements: (callback) => {
    const q = query(collection(db, SETTLEMENTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      callback(data);
    });
  },

  saveSettlement: async (periodKey, amount) => {
    const docRef = doc(db, SETTLEMENTS_COLLECTION, periodKey);
    await setDoc(docRef, {
      received: Number(amount) || 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
};
