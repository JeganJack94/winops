import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  deleteDoc,
  updateDoc,
  doc
} from 'firebase/firestore';

const HUB_COLLECTION = 'hub_entries';
const RIDER_ENTRY_COLLECTION = 'rider_entries';

export const deliveryService = {
  // Hub Entries
  addHubEntry: async (data) => {
    return await addDoc(collection(db, HUB_COLLECTION), {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  subscribeToHubEntries: (callback, limitCount = 10) => {
    const q = query(
      collection(db, HUB_COLLECTION), 
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(entries);
    });
  },

  // Rider Entries
  addRiderEntry: async (data) => {
    return await addDoc(collection(db, RIDER_ENTRY_COLLECTION), {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  deleteHubEntry: async (id) => {
    return await deleteDoc(doc(db, HUB_COLLECTION, id));
  },

  deleteRiderEntry: async (id) => {
    return await deleteDoc(doc(db, RIDER_ENTRY_COLLECTION, id));
  },

  updateHubEntry: async (id, data) => {
    return await updateDoc(doc(db, HUB_COLLECTION, id), data);
  },

  updateRiderEntry: async (id, data) => {
    return await updateDoc(doc(db, RIDER_ENTRY_COLLECTION, id), data);
  },

  subscribeToRiderEntries: (callback, riderId = null) => {
    let q = query(collection(db, RIDER_ENTRY_COLLECTION), orderBy('timestamp', 'desc'));
    if (riderId) {
      q = query(q, where('riderId', '==', riderId));
    }
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(entries);
    });
  }
};
