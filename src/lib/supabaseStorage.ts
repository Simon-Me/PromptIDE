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

  private async ensurePreferencesViaRpc(): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_profile')
      if (error) throw error
      this.lastEnsureWasFallback = false
      return (data as any) || {}
    } catch (e: any) {
      const msg = String(e?.message || '').toLowerCase()
      if (e?.code === '57014' || e?.code === '55P03' || e?.code === 'PGRST002' || msg.includes('timeout') || msg.includes('service unavailable') || msg.includes('schema cache')) {
        this.lastEnsureWasFallback = true
        return {}
      }
      // For any other error, propagate
      throw e
    }
  }

  async loadData(key: string): Promise<any> {
    const userId = await this.getCurrentUserId()
    if (!userId) return key === 'prompts' ? [] : key === 'folders' ? [] : {}
    const prefs = await this.ensurePreferencesViaRpc()
    if (this.lastEnsureWasFallback) return key === 'prompts' ? [] : key === 'folders' ? [] : {}
    if (key === 'folders' && !Array.isArray(prefs?.[key])) return []
    return prefs?.[key] ?? (key === 'prompts' ? [] : {})
  }

  async saveData(key: string, data: any): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) return

    const prefs = await this.ensurePreferencesViaRpc()
    if (this.lastEnsureWasFallback) return
    const newPrefs = { ...prefs, [key]: data }

    const { error } = await supabase.rpc('set_preferences', { prefs: newPrefs })
    if (error) throw error
  }

  async loadMany(keys: string[]): Promise<Record<string, any>> {
    const userId = await this.getCurrentUserId()
    if (!userId) {
      const result: Record<string, any> = {}
      for (const key of keys) result[key] = key === 'prompts' || key === 'folders' ? [] : {}
      return result
    }
    const prefs = await this.ensurePreferencesViaRpc()
    const result: Record<string, any> = {}
    for (const key of keys) {
      result[key] = prefs?.[key]
    }
    return result
  }

  async deleteData(key: string): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) return
    const prefs = await this.ensurePreferencesViaRpc()
    if (this.lastEnsureWasFallback) return
    const { [key]: _removed, ...rest } = prefs || {}

    const { error } = await supabase.rpc('set_preferences', { prefs: rest })
    if (error) throw error
  }
}

export const remoteStorage = new SupabaseStorageService()
export default remoteStorage 