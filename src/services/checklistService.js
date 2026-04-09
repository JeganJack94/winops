import { db } from './firebase';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

const CHECKLIST_COLLECTION = 'checklists';

export const checklistService = {
  // We'll use a single document per date for simplicity
  subscribeToChecklist: (date, callback) => {
    const docRef = doc(db, CHECKLIST_COLLECTION, date);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        // Return default state if doesn't exist
        callback({
          date,
          notes: '',
          checkedItems: [],
          outbound: {
            rto: 0,
            cancel: 0,
            pickup: 0,
            replacement: 0
          }
        });
      }
    });
  },

  subscribeToNotes: (callback) => {
    const docRef = doc(db, CHECKLIST_COLLECTION, 'persistent_notes');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().content || '');
      } else {
        callback('');
      }
    });
  },

  updateNotes: async (content) => {
    const docRef = doc(db, CHECKLIST_COLLECTION, 'persistent_notes');
    return await setDoc(docRef, { 
      content,
      lastUpdated: new Date().toISOString() 
    }, { merge: true });
  },

  updateChecklist: async (date, data) => {
    const docRef = doc(db, CHECKLIST_COLLECTION, date);
    // eslint-disable-next-line no-unused-vars
    const { id, notes, ...updateData } = data; // Strip notes from daily update
    return await setDoc(docRef, {
      ...updateData,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  }
};
