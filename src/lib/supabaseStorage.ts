import { supabase } from './supabase'

class SupabaseStorageService {
  private lastEnsureWasFallback: boolean = false
  // Local fallback namespace key to avoid collisions
  private static LOCAL_NAMESPACE = 'promptide_prefs_fallback'

  private readLocalFallback(): Record<string, any> {
    if (typeof window === 'undefined') return {}
    try {
      const raw = window.localStorage.getItem(SupabaseStorageService.LOCAL_NAMESPACE)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  private writeLocalFallback(prefs: Record<string, any>): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        SupabaseStorageService.LOCAL_NAMESPACE,
        JSON.stringify(prefs ?? {})
      )
    } catch {}
  }

  private upsertLocalKey(key: string, data: any): void {
    const all = this.readLocalFallback()
    all[key] = data
    this.writeLocalFallback(all)
  }

  private deleteLocalKey(key: string): void {
    const all = this.readLocalFallback()
    if (key in all) {
      delete all[key]
      this.writeLocalFallback(all)
    }
  }
  private async getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  private async ensureProfile(userId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, preferences')
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // Statement timeout or transient server error: fall back to empty prefs
        if (error.code === '57014' || String(error.message || '').toLowerCase().includes('timeout')) {
          this.lastEnsureWasFallback = true
          return {}
        }
        throw error
      }

      if (!data) {
        const defaultPrefs = {}
        // Best-effort create; if it fails due to timeout, still return defaults
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({ id: userId, user_id: userId, preferences: defaultPrefs }, { onConflict: 'id' })
        if (upsertError && upsertError.code !== '57014') throw upsertError
        this.lastEnsureWasFallback = !!upsertError
        return defaultPrefs
      }

      this.lastEnsureWasFallback = false
      return (data.preferences as Record<string, any>) || {}
    } catch (e: any) {
      // As a safety net, never block callers; return empty prefs on transient issues
      this.lastEnsureWasFallback = true
      return {}
    }
  }

  async loadData(key: string): Promise<any> {
    const userId = await this.getCurrentUserId()
    if (!userId) {
      // When not signed in, serve persisted local fallback
      const local = this.readLocalFallback()
      const value = local[key]
      if (value !== undefined) return value
      return key === 'prompts' ? [] : key === 'folders' ? [] : {}
    }
    const prefs = await this.ensureProfile(userId)
    if (this.lastEnsureWasFallback) {
      // On timeouts, use local fallback if present
      const local = this.readLocalFallback()
      const value = local[key]
      if (value !== undefined) return value
    }
    if (key === 'folders' && !Array.isArray(prefs?.[key])) return []
    return prefs?.[key] ?? (key === 'prompts' ? [] : {})
  }

  async saveData(key: string, data: any): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) {
      // Persist locally when unauthenticated (e.g., GitHub Pages demo)
      this.upsertLocalKey(key, data)
      return
    }

    const prefs = await this.ensureProfile(userId)
    // If the last ensure was a fallback (timeout), avoid overwriting server state with partial data
    if (this.lastEnsureWasFallback) {
      // Persist locally so user changes are not lost; server write will be attempted later
      this.upsertLocalKey(key, data)
      return
    }
    const newPrefs = { ...prefs, [key]: data }

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: newPrefs, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) {
      // On write error, keep a local copy so the UI persists across reloads
      this.upsertLocalKey(key, data)
      throw error
    }
    // Successful write: also mirror locally to ensure fast subsequent reads
    this.upsertLocalKey(key, data)
  }

  async loadMany(keys: string[]): Promise<Record<string, any>> {
    const userId = await this.getCurrentUserId()
    if (!userId) {
      const result: Record<string, any> = {}
      for (const key of keys) result[key] = key === 'prompts' || key === 'folders' ? [] : {}
      return result
    }
    const prefs = await this.ensureProfile(userId)
    const result: Record<string, any> = {}
    for (const key of keys) {
      result[key] = prefs?.[key]
    }
    return result
  }

  async deleteData(key: string): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) {
      this.deleteLocalKey(key)
      return
    }
    const prefs = await this.ensureProfile(userId)
    if (this.lastEnsureWasFallback) {
      this.deleteLocalKey(key)
      return
    }
    const { [key]: _removed, ...rest } = prefs || {}

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: rest, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) {
      // Mirror deletion locally even if server fails
      this.deleteLocalKey(key)
      throw error
    }
    this.deleteLocalKey(key)
  }
}

export const remoteStorage = new SupabaseStorageService()
export default remoteStorage 