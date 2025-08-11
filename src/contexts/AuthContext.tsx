import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

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
  settings?: any
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoadPromise, setProfileLoadPromise] = useState<Promise<void> | null>(null)


  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const supaUser = data.user
        if (supaUser) {
          setUser({ id: supaUser.id, email: supaUser.email || '' })
          // Fire-and-forget profile load so we don't block app boot
          loadProfile(supaUser.id)
        }
      } finally {
        setLoading(false)
      }
    }

    // Listen to auth changes
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' })
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    init()
    return () => {
      authSub.subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId: string) {
    if (profileLoadPromise) return profileLoadPromise
    const p = (async () => {
      try {
        // Prefer RPC to get/create atomically to avoid schema-cache errors
        const { data, error } = await supabase.rpc('get_or_create_profile')
        if (error) throw error
        setProfile({ id: userId, user_id: userId, settings: (data as any) || {} })
      } catch (err: any) {
        // If statement/lock timeout or transient error, skip setting profile to avoid blocking app
        const msg = String(err?.message || '').toLowerCase()
        if (err?.code === '57014' || err?.code === '55P03' || err?.code === 'PGRST002' || msg.includes('schema cache') || msg.includes('service unavailable')) {
          console.warn('Profile load timed out. Continuing without blocking.')
          return
        }
        console.error('Load profile error:', err)
      } finally {
        setProfileLoadPromise(null)
      }
    })()
    setProfileLoadPromise(p)
    return p
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message || 'Anmeldung fehlgeschlagen')
      throw error
    }
    toast.success('Erfolgreich angemeldet!')
  }

  async function signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      toast.error(error.message || 'Registrierung fehlgeschlagen')
      throw error
    }
    const userId = data.user?.id
    if (userId) {
      // Initialize preferences row via RPC to avoid schema cache errors
      const { error: insertError } = await supabase.rpc('set_preferences', { prefs: {} })
      if (insertError) console.error('Create profile error:', insertError)
    }
    toast.success('Registrierung erfolgreich!')
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message || 'Abmeldung fehlgeschlagen')
      throw error
    }
    toast.success('Erfolgreich abgemeldet!')
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return
    // If you need to store profile fields beyond preferences, you can keep a dedicated table.
    // For now we only maintain preferences; user profile display fields can be extended later via another RPC.
    const { data, error: loadErr } = await supabase.rpc('get_or_create_profile')
    if (loadErr) {
      toast.error(loadErr.message || 'Profil-Update fehlgeschlagen')
      throw loadErr
    }
    const prefs = (data as any) || {}
    const merged = { ...prefs, settings: { ...(prefs.settings || {}), ...updates.settings } }
    const { error } = await supabase.rpc('set_preferences', { prefs: merged })
    if (error) {
      toast.error(error.message || 'Profil-Update fehlgeschlagen')
      throw error
    }
    await loadProfile(user.id)
    toast.success('Profil erfolgreich aktualisiert!')
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}