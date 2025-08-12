import localforage from 'localforage'
import { initFirebaseIfConfigured, getFirebase } from './firebase'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

const storageMode: 'cloud' | 'hybrid' = ((import.meta as any).env?.VITE_STORAGE_MODE === 'cloud') ? 'cloud' : 'hybrid'

localforage.config({
  name: 'prompt-ide',
  storeName: 'kv',
  description: 'Prompt IDE data store'
})

async function migrateIfNeeded<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const existing = await localforage.getItem<T>(key)
    if (existing !== null && existing !== undefined) return existing
    const ls = localStorage.getItem(key)
    if (ls) {
      const parsed = JSON.parse(ls) as T
      await localforage.setItem(key, parsed)
      return parsed
    }
  } catch {}
  return defaultValue
}

function getCurrentUserId(): string | null {
  // Prefer Firebase auth user when available
  try {
    const fb = getFirebase()
    const firebaseUid = (fb as any)?.auth?.currentUser?.uid as string | undefined
    if (firebaseUid) return firebaseUid
  } catch {}

  // If Firebase is configured but there is no signed-in user, do not use local fallback id
  // to avoid unauthorized Firestore writes with a stale local user id
  try {
    const fb = getFirebase()
    if (fb) return null
  } catch {}

  // Local fallback user id
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.id || null
  } catch {
    return null
  }
}

async function readFromFirestore<T>(key: string): Promise<T | undefined> {
  const fb = getFirebase() || initFirebaseIfConfigured()
  if (!fb) return undefined
  const uid = getCurrentUserId()
  if (!uid) return undefined
  const ref = doc(fb.db, 'users', uid, 'kv', key)
  const snap = await getDoc(ref)
  if (!snap.exists()) return undefined
  return snap.data()?.value as T
}

async function writeToFirestore<T>(key: string, value: T): Promise<boolean> {
  const fb = getFirebase() || initFirebaseIfConfigured()
  if (!fb) return false
  const uid = getCurrentUserId()
  if (!uid) return false
  const ref = doc(fb.db, 'users', uid, 'kv', key)
  await setDoc(ref, { value, updated_at: Date.now() }, { merge: true })
  return true
}

async function deleteFromFirestore(key: string): Promise<boolean> {
  const fb = getFirebase() || initFirebaseIfConfigured()
  if (!fb) return false
  const uid = getCurrentUserId()
  if (!uid) return false
  const ref = doc(fb.db, 'users', uid, 'kv', key)
  await deleteDoc(ref)
  return true
}

export const storage = {
  async loadData<T = any>(key: string): Promise<T> {
    // Cloud-only mode: do not read from local at all
    if (storageMode === 'cloud') {
      const fromCloud = await readFromFirestore<T>(key).catch(() => undefined)
      if (fromCloud !== undefined) return fromCloud as T
      // return sensible defaults if nothing in cloud yet
      const defVal: any = key === 'prompts' || key === 'folders' ? [] : {}
      return defVal as T
    }

    // Hybrid mode: Prefer Firestore if configured and user present
    const fromCloud = await readFromFirestore<T>(key).catch(() => undefined)
    if (fromCloud !== undefined) return fromCloud as T

    // Fallback to IndexedDB with migration from localStorage
    const defVal: any = key === 'prompts' || key === 'folders' ? [] : {}
    const data = await migrateIfNeeded<T>(key, defVal)
    return (data as any) ?? defVal
  },
  async saveData<T = any>(key: string, value: T): Promise<void> {
    const hasFirebaseUser = !!getCurrentUserId()
    const written = await writeToFirestore<T>(key, value).catch(() => false)
    if (storageMode === 'cloud') {
      if (!hasFirebaseUser || !written) {
        throw new Error('Cloud-only mode: write failed (not signed in or Firestore unavailable).')
      }
      return
    }
    // Hybrid: fall back to local if cloud write fails
    if (!written) await localforage.setItem(key, value as any)
    else await localforage.setItem(key, value as any)
  },
  async deleteData(key: string): Promise<void> {
    const deleted = await deleteFromFirestore(key).catch(() => false)
    if (storageMode === 'cloud') {
      if (!deleted) throw new Error('Cloud-only mode: delete failed (not signed in or Firestore unavailable).')
      return
    }
    await localforage.removeItem(key)
  }
}

export const savePrompts = async (prompts: any[]) => {
  await storage.saveData('prompts', prompts)
}

export const loadPrompts = async () => {
  const result = await storage.loadData('prompts')
  return result || []
}

export const saveSettings = async (settings: any) => {
  await storage.saveData('settings', settings)
}

export const loadSettings = async () => {
  const result = await storage.loadData('settings')
  return result || {}
} 