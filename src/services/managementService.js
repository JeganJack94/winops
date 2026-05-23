import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

const COLLECTIONS = {
  INVESTMENTS: 'investments',
  POCKET_SETTLEMENTS: 'pocket_settlements'
};

export const managementService = {
  // Investments
  addInvestment: async (data) => {
    return await addDoc(collection(db, COLLECTIONS.INVESTMENTS), {
      ...data,
      status: 'Open',
      recoveredAmount: 0,
      createdAt: new Date().toISOString()
    });
  },
  updateInvestment: async (id, data) => {
    const { id: _, ...updateData } = data;
    return await updateDoc(doc(db, COLLECTIONS.INVESTMENTS, id), updateData);
  },
  deleteInvestment: async (id) => {
    return await deleteDoc(doc(db, COLLECTIONS.INVESTMENTS, id));
  },
  subscribeToInvestments: (callback) => {
    const q = query(collection(db, COLLECTIONS.INVESTMENTS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, 
      (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => console.error("Investments subscription error:", err)
    );
  },

  // Pocket Settlements (Personal Invest vs Business Withdrawals)
  addPocketSettlement: async (data) => {
    return await addDoc(collection(db, COLLECTIONS.POCKET_SETTLEMENTS), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },
  updatePocketSettlement: async (id, data) => {
    const { id: _, ...updateData } = data;
    return await updateDoc(doc(db, COLLECTIONS.POCKET_SETTLEMENTS, id), updateData);
  },
  deletePocketSettlement: async (id) => {
    return await deleteDoc(doc(db, COLLECTIONS.POCKET_SETTLEMENTS, id));
  },
  subscribeToPocketSettlements: (callback) => {
    const q = query(collection(db, COLLECTIONS.POCKET_SETTLEMENTS), orderBy('date', 'desc'));
    return onSnapshot(q, 
      (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => console.error("Pocket settlements subscription error:", err)
    );
  }
};
