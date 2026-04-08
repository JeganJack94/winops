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

const PROFILES_COLLECTION = 'employee_profiles';

export const profileService = {
  addProfile: async (data) => {
    return await addDoc(collection(db, PROFILES_COLLECTION), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },

  updateProfile: async (id, data) => {
    const docRef = doc(db, PROFILES_COLLECTION, id);
    const { id: _, ...updateData } = data; // Strip id from payload
    return await updateDoc(docRef, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
  },

  deleteProfile: async (id) => {
    const docRef = doc(db, PROFILES_COLLECTION, id);
    return await deleteDoc(docRef);
  },

  subscribeToProfiles: (callback) => {
    const q = query(
      collection(db, PROFILES_COLLECTION),
      orderBy('name', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(profiles);
    });
  }
};
