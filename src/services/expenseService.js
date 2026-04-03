import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

const EXPENSE_COLLECTION = 'expenses';

export const expenseService = {
  addExpense: async (data) => {
    return await addDoc(collection(db, EXPENSE_COLLECTION), {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  deleteExpense: async (id) => {
    const docRef = doc(db, EXPENSE_COLLECTION, id);
    return await deleteDoc(docRef);
  },

  subscribeToExpenses: (callback, limitCount = 50) => {
    const q = query(
      collection(db, EXPENSE_COLLECTION), 
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
  }
};
