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

const CUSTOMER_COLLECTION = 'customers';

export const customerService = {
  // Get all customers with real-time updates
  subscribeToCustomers: (callback) => {
    const q = query(collection(db, CUSTOMER_COLLECTION), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(customers);
    });
  },

  // Add a new customer
  addCustomer: async (customerData) => {
    return await addDoc(collection(db, CUSTOMER_COLLECTION), {
      ...customerData,
      createdAt: new Date().toISOString()
    });
  },

  // Update customer details
  updateCustomer: async (customerId, customerData) => {
    const customerRef = doc(db, CUSTOMER_COLLECTION, customerId);
    const { id: _, ...updateData } = customerData;
    return await updateDoc(customerRef, updateData);
  },

  // Delete a customer
  deleteCustomer: async (customerId) => {
    const customerRef = doc(db, CUSTOMER_COLLECTION, customerId);
    return await deleteDoc(customerRef);
  }
};
