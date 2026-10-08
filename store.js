import { DEFAULTS } from './config.js';

const KS = 'su.settings', KR = 'su.recent';
const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* opslag vol of geblokkeerd */ } };

export const loadSettings = () => ({ ...DEFAULTS, ...read(KS, {}) });
export const saveSettings = (s) => write(KS, s);
export const loadRecent = () => read(KR, []);
export const saveRecent = (r) => write(KR, r);

let dbp;
function db() {
  return dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('su', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pdfs');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbp = undefined; reject(req.error); };
  });
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('pdfs', mode);
    const req = fn(t.objectStore('pdfs'));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

// ponytail: ArrayBuffer i.p.v. Blob — Blobs in IndexedDB zijn op oudere iOS onbetrouwbaar.
export const putPdf = (id, buf) => tx('readwrite', (st) => st.put(buf, id));
export const getPdf = (id) => tx('readonly', (st) => st.get(id));
export const delPdf = (id) => tx('readwrite', (st) => st.delete(id));
