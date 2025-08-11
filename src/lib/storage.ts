import localforage from 'localforage'
import { initFirebaseIfConfigured, getFirebase } from './firebase'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

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
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.id || null
  } catch { return null }
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
    // Prefer Firestore if configured and user present
    const fromCloud = await readFromFirestore<T>(key).catch(() => undefined)
    if (fromCloud !== undefined) return fromCloud as T

    // Fallback to IndexedDB with migration from localStorage
    const defVal: any = key === 'prompts' || key === 'folders' ? [] : {}
    const data = await migrateIfNeeded<T>(key, defVal)
    return (data as any) ?? defVal
  },
  async saveData<T = any>(key: string, value: T): Promise<void> {
    const written = await writeToFirestore<T>(key, value).catch(() => false)
    if (!written) {
      await localforage.setItem(key, value as any)
    } else {
      // Mirror to IndexedDB for offline
      await localforage.setItem(key, value as any)
    }
  },
  async deleteData(key: string): Promise<void> {
    const deleted = await deleteFromFirestore(key).catch(() => false)
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