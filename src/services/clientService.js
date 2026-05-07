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

const CLIENTS_COLLECTION = 'clients';

export const clientService = {
  subscribeToClients: (callback) => {
    const q = query(collection(db, CLIENTS_COLLECTION), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const clients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(clients);
    });
  },

  addClient: async (clientData) => {
    try {
      const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), {
        ...clientData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding client: ", error);
      throw error;
    }
  },

  updateClient: async (clientId, clientData) => {
    try {
      const docRef = doc(db, CLIENTS_COLLECTION, clientId);
      await updateDoc(docRef, {
        ...clientData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating client: ", error);
      throw error;
    }
  },

  deleteClient: async (clientId) => {
    try {
      const docRef = doc(db, CLIENTS_COLLECTION, clientId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting client: ", error);
      throw error;
    }
  }
};
