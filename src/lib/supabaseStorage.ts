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
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) return null
      return data.user?.id ?? null
    } catch {
      return null
    }
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
        const msg = String(error.message || '').toLowerCase()
        if (
          error.code === '57014' ||
          error.code === 'PGRST002' ||
          msg.includes('timeout') ||
          msg.includes('service unavailable') ||
          msg.includes('schema cache')
        ) {
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
    if (!userId) return key === 'prompts' ? [] : key === 'folders' ? [] : {}
    const prefs = await this.ensureProfile(userId)
    if (this.lastEnsureWasFallback) return key === 'prompts' ? [] : key === 'folders' ? [] : {}
    if (key === 'folders' && !Array.isArray(prefs?.[key])) return []
    return prefs?.[key] ?? (key === 'prompts' ? [] : {})
  }

  async saveData(key: string, data: any): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) return

    const prefs = await this.ensureProfile(userId)
    // If the last ensure was a fallback (timeout), avoid overwriting server state with partial data
    if (this.lastEnsureWasFallback) return
    const newPrefs = { ...prefs, [key]: data }

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: newPrefs, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) throw error
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
    if (!userId) return
    const prefs = await this.ensureProfile(userId)
    if (this.lastEnsureWasFallback) return
    const { [key]: _removed, ...rest } = prefs || {}

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: rest, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) throw error
  }
}

export const remoteStorage = new SupabaseStorageService()
export default remoteStorage 