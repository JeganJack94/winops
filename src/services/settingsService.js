import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  getDocs,
  collection,
  deleteDoc
} from 'firebase/firestore';

const SETTINGS_DOC_ID = 'app_settings';
const SETTINGS_COLLECTION = 'settings';

export const settingsService = {
  subscribeToSettings: (callback) => {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        // Default settings
        callback({
          ratePerParcel: 18,
          companyName: 'Win Express',
          email: 'winexpress630551@gmail.com'
        });
      }
    });
  },

  updateSettings: async (data) => {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return await setDoc(docRef, data, { merge: true });
  },

  wipeOperationalData: async () => {
    const collectionsToClear = [
      'daily_records',
      'rider_entries',
      'hub_entries',
      'earnings_overrides',
      'expenses'
    ];

    for (const coll of collectionsToClear) {
      const qs = await getDocs(collection(db, coll));
      for (const snapshot of qs.docs) {
         await deleteDoc(doc(db, coll, snapshot.id));
      }
    }
  }
};
