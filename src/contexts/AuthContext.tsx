import React, { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { initFirebaseIfConfigured, getFirebase } from '../lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth'

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface Profile {
  id: string
  user_id: string
  display_name?: string
  bio?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
  settings: Record<string, any>
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function readLocal<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
function writeLocal<T>(key: string, value: T) { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fb = initFirebaseIfConfigured()
    if (fb) {
      const unsub = onAuthStateChanged(fb.auth, (u) => {
        if (u) {
          const mapped: User = { id: u.uid, email: u.email || '' }
          setUser(mapped)
          const p = readLocal<Profile | null>(`profile_${mapped.id}`, null) || {
            id: mapped.id,
            user_id: mapped.id,
            settings: { theme: 'dark', editor_font_size: 14, auto_save: true, show_line_numbers: true, word_wrap: true },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setProfile(p)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      })
      return () => unsub()
    } else {
      // pure local fallback
      const existing = readLocal<User | null>('auth_user', null)
      if (existing) {
        setUser(existing)
        const p = readLocal<Profile | null>(`profile_${existing.id}`, null) || {
          id: existing.id,
          user_id: existing.id,
          settings: { theme: 'dark', editor_font_size: 14, auto_save: true, show_line_numbers: true, word_wrap: true },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setProfile(p)
      }
      setLoading(false)
    }
  }, [])

  async function signIn(email: string, password: string) {
    const fb = getFirebase()
    if (fb) {
      await signInWithEmailAndPassword(fb.auth, email, password)
      toast.success('Erfolgreich angemeldet!')
      return
    }
    // local fallback
    const u: User = readLocal<User | null>('auth_user', null) || { id: `loc_${Date.now()}`, email }
    writeLocal('auth_user', u)
    setUser(u)
    const p = readLocal<Profile | null>(`profile_${u.id}`, null) || {
      id: u.id,
      user_id: u.id,
      settings: { theme: 'dark', editor_font_size: 14, auto_save: true, show_line_numbers: true, word_wrap: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    writeLocal(`profile_${u.id}`, p)
    setProfile(p)
    toast.success('Erfolgreich angemeldet!')
  }

  async function signUp(email: string, password: string, _fullName?: string) {
    const fb = getFirebase()
    if (fb) {
      await createUserWithEmailAndPassword(fb.auth, email, password)
      toast.success('Registrierung erfolgreich!')
      return
    }
    await signIn(email, password)
    toast.success('Registrierung erfolgreich!')
  }

  async function signOut() {
    const fb = getFirebase()
    if (fb) {
      await fbSignOut(fb.auth)
      toast.success('Erfolgreich abgemeldet!')
      return
    }
    localStorage.removeItem('auth_user')
    setUser(null)
    setProfile(null)
    toast.success('Erfolgreich abgemeldet!')
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user || !profile) return
    const merged: Profile = { ...profile, ...updates, settings: { ...(profile.settings||{}), ...(updates.settings||{}) }, updated_at: new Date().toISOString() }
    setProfile(merged)
    writeLocal(`profile_${user.id}`, merged)
    toast.success('Profil erfolgreich aktualisiert!')
  }

  const value = { user, profile, loading, signIn, signUp, signOut, updateProfile }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}