// Local-first persistence for the single Session.
//
// Phase 1 is offline-first with no backend: the Session is stored in IndexedDB
// when available, and falls back to localStorage otherwise (and in test/jsdom
// environments, where IndexedDB is absent). There are only two operations,
// save and load — there is no remote sync and no per-record delete.

import type { Session } from './types';

const KEY = 'bscos.session.v1';
const DB_NAME = 'bscos';
const STORE = 'kv';

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

// ---- localStorage backend ----

function lsSave(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // storage full or unavailable; nothing else we can safely do in Phase 1
  }
}

function lsLoad(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

// ---- IndexedDB backend ----

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSave(session: Session): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(session, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbLoad(): Promise<Session | null> {
  const db = await openDB();
  try {
    return await new Promise<Session | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as Session | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

// ---- public API ----

export async function saveSession(session: Session): Promise<void> {
  if (hasIndexedDB()) {
    try {
      await idbSave(session);
      return;
    } catch {
      // fall back to localStorage below
    }
  }
  lsSave(session);
}

export async function loadSession(): Promise<Session | null> {
  if (hasIndexedDB()) {
    try {
      const fromIdb = await idbLoad();
      if (fromIdb) return fromIdb;
    } catch {
      // fall back to localStorage below
    }
  }
  return lsLoad();
}
