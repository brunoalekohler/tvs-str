// IndexedDB storage for local corporate videos
const DB_NAME = 'santa_rosa_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'videos';
const KEY = 'active_corporate_video';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeVideoFile(file: File | Blob, name: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ blob: file, name, updatedAt: Date.now() }, KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    localStorage.setItem('santa_rosa_video_filename', name);
  } catch (err) {
    console.error('Failed to store video in IndexedDB:', err);
    throw err;
  }
}

export async function getStoredVideo(): Promise<{ url: string; name: string } | null> {
  try {
    const db = await openDB();
    return await new Promise<{ url: string; name: string } | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          const url = URL.createObjectURL(req.result.blob);
          resolve({ url, name: req.result.name || 'Vídeo Local' });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function removeStoredVideo(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    localStorage.removeItem('santa_rosa_video_filename');
  } catch (err) {
    console.error('Failed to remove video from IndexedDB:', err);
  }
}
