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
  SALARIES: 'salaries',
  SETTLEMENTS: 'settlements'
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
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  // Salaries
  addSalary: async (data) => {
    return await addDoc(collection(db, COLLECTIONS.SALARIES), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },
  updateSalary: async (id, data) => {
    const { id: _, ...updateData } = data;
    return await updateDoc(doc(db, COLLECTIONS.SALARIES, id), updateData);
  },
  deleteSalary: async (id) => {
    return await deleteDoc(doc(db, COLLECTIONS.SALARIES, id));
  },
  subscribeToSalaries: (callback) => {
    const q = query(collection(db, COLLECTIONS.SALARIES), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  // Settlements
  addSettlement: async (data) => {
    return await addDoc(collection(db, COLLECTIONS.SETTLEMENTS), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },
  updateSettlement: async (id, data) => {
    const { id: _, ...updateData } = data;
    return await updateDoc(doc(db, COLLECTIONS.SETTLEMENTS, id), updateData);
  },
  deleteSettlement: async (id) => {
    return await deleteDoc(doc(db, COLLECTIONS.SETTLEMENTS, id));
  },
  subscribeToSettlements: (callback) => {
    const q = query(collection(db, COLLECTIONS.SETTLEMENTS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }
};
