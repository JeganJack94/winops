import { db } from './firebase';
import { 
  collection, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

const ZONE_COLLECTION = 'zones';

export const zoneService = {
  // Get all zones with real-time updates
  subscribeToZones: (callback) => {
    const q = query(collection(db, ZONE_COLLECTION), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const zones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(zones);
    });
  },

  // Initialize or save a zone (using zone name as ID for simplicity)
  saveZoneAreas: async (zoneName, areas) => {
    const zoneRef = doc(db, ZONE_COLLECTION, zoneName);
    return await setDoc(zoneRef, {
      name: zoneName,
      areas: areas,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  // Update a specific zone
  updateZone: async (zoneId, zoneData) => {
    const zoneRef = doc(db, ZONE_COLLECTION, zoneId);
    return await updateDoc(zoneRef, {
      ...zoneData,
      updatedAt: new Date().toISOString()
    });
  },

  // Delete a zone (if needed)
  deleteZone: async (zoneId) => {
    const zoneRef = doc(db, ZONE_COLLECTION, zoneId);
    return await deleteDoc(zoneRef);
  }
};
