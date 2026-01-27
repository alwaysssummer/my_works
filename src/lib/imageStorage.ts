/**
 * IndexedDB 기반 이미지 저장소
 * 로컬 스토리지 용량 제한(5MB)을 피하기 위해 IndexedDB 사용
 */

const DB_NAME = "blocknote-images";
const STORE_NAME = "images";
const DB_VERSION = 1;

interface ImageRecord {
  id: string;
  data: Blob;
  mimeType: string;
  createdAt: Date;
}

// URL 캐시 (Object URL은 세션 한정이므로 캐싱)
const urlCache = new Map<string, string>();

/**
 * IndexedDB 연결
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * 이미지 저장
 * @param blob 이미지 Blob
 * @returns 이미지 ID
 */
export async function saveImage(blob: Blob): Promise<string> {
  const id = crypto.randomUUID();
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const record: ImageRecord = {
      id,
      data: blob,
      mimeType: blob.type,
      createdAt: new Date(),
    };

    const request = store.add(record);
    request.onsuccess = () => {
      // Object URL 생성 및 캐싱
      const url = URL.createObjectURL(blob);
      urlCache.set(id, url);
      resolve(id);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 이미지 불러오기
 * @param id 이미지 ID
 * @returns Object URL 또는 null
 */
export async function getImage(id: string): Promise<string | null> {
  // 캐시된 URL 반환
  if (urlCache.has(id)) {
    return urlCache.get(id)!;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as ImageRecord | undefined;
      if (record) {
        const url = URL.createObjectURL(record.data);
        urlCache.set(id, url);
        resolve(url);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 이미지 삭제
 * @param id 이미지 ID
 */
export async function deleteImage(id: string): Promise<void> {
  // 캐시된 URL 해제
  if (urlCache.has(id)) {
    URL.revokeObjectURL(urlCache.get(id)!);
    urlCache.delete(id);
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 모든 이미지 ID 목록 가져오기
 */
export async function getAllImageIds(): Promise<string[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 여러 이미지 URL 한번에 불러오기 (성능 최적화)
 */
export async function preloadImages(ids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  await Promise.all(
    ids.map(async (id) => {
      const url = await getImage(id);
      if (url) {
        result.set(id, url);
      }
    })
  );

  return result;
}

/**
 * 사용량 확인 (대략적인 크기)
 */
export async function getStorageUsage(): Promise<{ count: number; sizeEstimate: string }> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const countRequest = store.count();
    countRequest.onsuccess = () => {
      const count = countRequest.result;
      // 대략적인 크기 추정 (정확한 계산은 비용이 높음)
      resolve({
        count,
        sizeEstimate: count > 0 ? `약 ${count}개 이미지` : "비어 있음",
      });
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
}
