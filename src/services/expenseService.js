import { db } from './firebase';
import { 
  collection, 
  addDoc, 
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
