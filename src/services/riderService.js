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

const RIDER_COLLECTION = 'riders';

export const riderService = {
  // Get all riders with real-time updates
  subscribeToRiders: (callback) => {
    const q = query(collection(db, RIDER_COLLECTION), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const riders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(riders);
    });
  },

  // Add a new rider
  addRider: async (riderData) => {
    return await addDoc(collection(db, RIDER_COLLECTION), {
      ...riderData,
      status: riderData.status || 'Active',
      createdAt: new Date().toISOString()
    });
  },

  // Update rider details
  updateRider: async (riderId, riderData) => {
    const riderRef = doc(db, RIDER_COLLECTION, riderId);
    return await updateDoc(riderRef, riderData);
  },

  // Delete a rider
  deleteRider: async (riderId) => {
    const riderRef = doc(db, RIDER_COLLECTION, riderId);
    return await deleteDoc(riderRef);
  }
};
