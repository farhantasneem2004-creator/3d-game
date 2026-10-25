/**
 * IndexedDB Persistent Storage for 3D Character Assets
 * Saves .obj, .mtl, and .jpg texture permanently in the browser.
 * Auto-restores saved character on page load without requiring re-upload.
 */

const DB_NAME = 'Platformer3D_AssetDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_character';
const RECORD_KEY = 'active_character';

export interface SavedCharacterData {
  objText: string;
  mtlText: string;
  jpgBase64: string;
  fileName: string;
  savedAt: number;
}

class AssetStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          reject(new Error('IndexedDB not supported in this environment'));
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  /**
   * Save custom character assets permanently in IndexedDB
   */
  public async saveCharacter(
    objText: string,
    mtlText: string,
    jpgFile: File | Blob,
    fileName: string
  ): Promise<void> {
    const jpgBase64 = await this.fileToBase64(jpgFile);
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: SavedCharacterData = {
        objText,
        mtlText,
        jpgBase64,
        fileName,
        savedAt: Date.now(),
      };

      const putRequest = store.put(record, RECORD_KEY);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  }

  /**
   * Load saved character assets from IndexedDB
   */
  public async loadCharacter(): Promise<SavedCharacterData | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getRequest = store.get(RECORD_KEY);

        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Clear saved character from IndexedDB (restores default model)
   */
  public async clearSavedCharacter(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const delRequest = store.delete(RECORD_KEY);

        delRequest.onsuccess = () => resolve();
        delRequest.onerror = () => reject(delRequest.error);
      });
    } catch {
      // ignore
    }
  }

  private fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

export const assetStorage = new AssetStorageManager();
