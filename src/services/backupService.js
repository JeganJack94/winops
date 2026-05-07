import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

const COLLECTIONS = [
  'daily_records',
  'expenses',
  'settlements',
  'riders',
  'hub_entries',
  'rider_entries',
  'payouts',
  'customers',
  'zones',
  'checklists',
  'settings',
  'profiles',
];

export const backupService = {
  /**
   * Fetches all documents from all known collections and returns them as an object.
   */
  exportAllData: async () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      collections: {}
    };

    for (const col of COLLECTIONS) {
      try {
        const snapshot = await getDocs(collection(db, col));
        if (!snapshot.empty) {
          backup.collections[col] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }
      } catch (err) {
        // Collection may not exist, skip silently
        console.warn(`Skipping collection "${col}":`, err.message);
      }
    }

    return backup;
  },

  /**
   * Triggers a browser download of the backup JSON file.
   */
  downloadBackup: async () => {
    const data = await backupService.exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    const filename = `winexpress_backup_${date}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { filename, collectionCount: Object.keys(data.collections).length };
  }
};
