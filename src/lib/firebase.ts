import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

const cfg = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
}

export function initFirebaseIfConfigured() {
  if (app) return { app, auth: auth!, db: db! }
  const hasAll = cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId
  if (!hasAll) return null
  app = initializeApp(cfg as any)
  auth = getAuth(app)
  db = getFirestore(app)
  return { app, auth, db }
}

export function getFirebase() {
  return app && auth && db ? { app, auth, db } : null
}
