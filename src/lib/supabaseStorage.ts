import { supabase } from './supabase'

class SupabaseStorageService {
  private lastEnsureWasFallback: boolean = false
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
      // Safe defaults when not signed in
      return key === 'prompts' ? [] : key === 'folders' ? [] : {}
    }
    const prefs = await this.ensureProfile(userId)
    if (key === 'folders' && !Array.isArray(prefs?.[key])) return []
    return prefs?.[key] ?? (key === 'prompts' ? [] : {})
  }

  async saveData(key: string, data: any): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) return // no-op when unauthenticated

    const prefs = await this.ensureProfile(userId)
    // If the last ensure was a fallback (timeout), avoid overwriting server state with partial data
    if (this.lastEnsureWasFallback) {
      // Defer write; next successful read will clear the flag
      return
    }
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