class LocalStorageService {
  private cache: Record<string, any> = {}

  private getCurrentUserId(): string {
    try {
      const raw = localStorage.getItem('auth_user')
      if (!raw) return 'guest'
      const u = JSON.parse(raw)
      return u?.id || 'guest'
    } catch {
      return 'guest'
    }
  }

  async loadData(key: string): Promise<any> {
    const userId = this.getCurrentUserId()
    const namespaced = `${userId}:${key}`

    if (this.cache[namespaced] !== undefined) {
      return this.cache[namespaced]
    }

    try {
      const raw = localStorage.getItem(namespaced)
      if (!raw) {
        const defVal = key === 'prompts' || key === 'folders' ? [] : {}
        this.cache[namespaced] = defVal
        return defVal
      }
      const val = JSON.parse(raw)
      this.cache[namespaced] = val
      return val
    } catch {
      const defVal = key === 'prompts' || key === 'folders' ? [] : {}
      this.cache[namespaced] = defVal
      return defVal
    }
  }

  async saveData(key: string, data: any): Promise<void> {
    const userId = this.getCurrentUserId()
    const namespaced = `${userId}:${key}`
    this.cache[namespaced] = data
    try {
      localStorage.setItem(namespaced, JSON.stringify(data))
    } catch {}
  }

  async deleteData(key: string): Promise<void> {
    const userId = this.getCurrentUserId()
    const namespaced = `${userId}:${key}`
    delete this.cache[namespaced]
    try {
      localStorage.removeItem(namespaced)
    } catch {}
  }

  clearCache() {
    this.cache = {}
  }
}

const localStorageService = new LocalStorageService()
export default localStorageService
