const DB_NAME = 'youtube-english-extractor';
const DB_VERSION = 1;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('videos')) {
        const videos = db.createObjectStore('videos', { keyPath: 'videoId' });
        videos.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('items')) {
        const items = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        items.createIndex('videoId', 'videoId');
        items.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putVideo(video) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('videos', 'readwrite').objectStore('videos').put({
      videoId: video.videoId,
      title: video.title || '',
      channel: video.channel || '',
      duration: video.duration || 0,
      thumbnail: video.thumbnail || '',
      createdAt: video.createdAt || Date.now(),
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addItem(item) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('items', 'readwrite').objectStore('items').add({
      videoId: item.videoId,
      type: item.type === 'word' ? 'word' : 'sentence',
      text: item.text || '',
      context: item.context || '',
      startTime: item.startTime ?? null,
      endTime: item.endTime ?? null,
      note: item.note || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      createdAt: item.createdAt || Date.now(),
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
