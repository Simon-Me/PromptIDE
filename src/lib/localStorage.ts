// Local storage service for Electron app
// Replaces Supabase functionality with local file storage

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface ProjectTab {
  id: string
  user_id: string
  name: string
  content: string
  type: 'image' | 'video' | 'text'
  created_at: string
  updated_at: string
  is_active: boolean
  order_index: number
}

export interface Prompt {
  id: string
  user_id: string
  title: string
  content: string
  type: 'image' | 'video' | 'text'
  tags: string[]
  created_at: string
  updated_at: string
  is_public: boolean
  is_favorite: boolean
  rating: number
  usage_count: number
  collection_id?: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  is_public: boolean
  cover_image?: string
  prompt_count: number
}

export interface CollectionPrompt {
  id: string
  collection_id: string
  prompt_id: string
  order_index: number
  created_at: string
}

export interface Profile {
  id: string
  user_id: string
  display_name?: string
  bio?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  settings: {
    theme: 'light' | 'dark' | 'system'
    editor_font_size: number
    auto_save: boolean
    show_line_numbers: boolean
    word_wrap: boolean
  }
}

class LocalStorageService {
  private electronAPI: any
  private currentUser: User | null = null
  private cache: Map<string, any> = new Map()

  constructor() {
    // Check if we're in Electron context
    this.electronAPI = (window as any).electronAPI
    console.log('🔍 STORAGE DEBUG: electronAPI available?', !!this.electronAPI)
    console.log('🔍 STORAGE DEBUG: window.electronAPI:', (window as any).electronAPI)
    
    // Initialize with default user for local app
    this.initializeDefaultUser()
  }

  private async initializeDefaultUser() {
    const defaultUser: User = {
      id: 'local-user',
      email: 'local@promptide.app',
      name: 'Local User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Check if user exists, create if not
    const existingUser = await this.loadData('user')
    if (!existingUser) {
      await this.saveData('user', defaultUser)
    }
    
    this.currentUser = existingUser || defaultUser
  }

  async saveData(key: string, data: any): Promise<void> {
    console.log(`💾 SAVING ${key}:`, data)
    if (this.electronAPI) {
      console.log('📁 Using Electron file storage')
      const result = await this.electronAPI.saveData(key, data)
      console.log(`✅ Electron save result for ${key}:`, result)
    } else {
      console.log('🌐 Using localStorage fallback')
      // Fallback to localStorage for development
      window.localStorage.setItem(key, JSON.stringify(data))
    }
    this.cache.set(key, data)
  }

  async loadData(key: string): Promise<any> {
    if (this.cache.has(key)) {
      console.log(`📋 Loading ${key} from cache`)
      return this.cache.get(key)
    }

    let data = null
    if (this.electronAPI) {
      console.log(`📁 Loading ${key} from Electron storage`)
      const result = await this.electronAPI.loadData(key)
      console.log(`📊 Electron load result for ${key}:`, result)
      data = result.success ? result.data : null
    } else {
      console.log(`🌐 Loading ${key} from localStorage fallback`)
      // Fallback to localStorage for development
      const stored = window.localStorage.getItem(key)
      data = stored ? JSON.parse(stored) : null
    }

    if (data) {
      this.cache.set(key, data)
    }
    console.log(`📖 Loaded ${key}:`, data)
    return data
  }

  async deleteData(key: string): Promise<void> {
    if (this.electronAPI) {
      await this.electronAPI.deleteData(key)
    } else {
      window.localStorage.removeItem(key)
    }
    this.cache.delete(key)
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Auth methods
  async getCurrentUser(): Promise<User | null> {
    return this.currentUser
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    // For local app, always return the default user
    return { user: this.currentUser, error: null }
  }

  async signUp(email: string, password: string, name?: string): Promise<{ user: User | null; error: string | null }> {
    // For local app, always return the default user
    return { user: this.currentUser, error: null }
  }

  async signOut(): Promise<void> {
    // For local app, do nothing (always signed in)
  }

  // Project tabs methods
  async getProjectTabs(): Promise<ProjectTab[]> {
    const tabs = await this.loadData('project_tabs') || []
    return tabs.sort((a: ProjectTab, b: ProjectTab) => a.order_index - b.order_index)
  }

  async saveProjectTab(tab: Omit<ProjectTab, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectTab> {
    const tabs = await this.getProjectTabs()
    const newTab: ProjectTab = {
      ...tab,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    tabs.push(newTab)
    await this.saveData('project_tabs', tabs)
    return newTab
  }

  async updateProjectTab(id: string, updates: Partial<ProjectTab>): Promise<ProjectTab | null> {
    const tabs = await this.getProjectTabs()
    const index = tabs.findIndex(tab => tab.id === id)
    
    if (index === -1) return null
    
    const updatedTab = {
      ...tabs[index],
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    tabs[index] = updatedTab
    await this.saveData('project_tabs', tabs)
    return updatedTab
  }

  async deleteProjectTab(id: string): Promise<boolean> {
    const tabs = await this.getProjectTabs()
    const filtered = tabs.filter(tab => tab.id !== id)
    
    if (filtered.length === tabs.length) return false
    
    await this.saveData('project_tabs', filtered)
    return true
  }

  // Prompts methods
  async getPrompts(): Promise<Prompt[]> {
    const prompts = await this.loadData('prompts') || []
    return prompts.sort((a: Prompt, b: Prompt) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }

  async savePrompt(prompt: Omit<Prompt, 'id' | 'created_at' | 'updated_at'>): Promise<Prompt> {
    const prompts = await this.getPrompts()
    const newPrompt: Prompt = {
      ...prompt,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    prompts.push(newPrompt)
    await this.saveData('prompts', prompts)
    return newPrompt
  }

  async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt | null> {
    const prompts = await this.getPrompts()
    const index = prompts.findIndex(prompt => prompt.id === id)
    
    if (index === -1) return null
    
    const updatedPrompt = {
      ...prompts[index],
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    prompts[index] = updatedPrompt
    await this.saveData('prompts', prompts)
    return updatedPrompt
  }

  async deletePrompt(id: string): Promise<boolean> {
    const prompts = await this.getPrompts()
    const filtered = prompts.filter(prompt => prompt.id !== id)
    
    if (filtered.length === prompts.length) return false
    
    await this.saveData('prompts', filtered)
    return true
  }

  // Collections methods
  async getCollections(): Promise<Collection[]> {
    const collections = await this.loadData('collections') || []
    return collections.sort((a: Collection, b: Collection) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }

  async saveCollection(collection: Omit<Collection, 'id' | 'created_at' | 'updated_at'>): Promise<Collection> {
    const collections = await this.getCollections()
    const newCollection: Collection = {
      ...collection,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    collections.push(newCollection)
    await this.saveData('collections', collections)
    return newCollection
  }

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    const collections = await this.getCollections()
    const index = collections.findIndex(collection => collection.id === id)
    
    if (index === -1) return null
    
    const updatedCollection = {
      ...collections[index],
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    collections[index] = updatedCollection
    await this.saveData('collections', collections)
    return updatedCollection
  }

  async deleteCollection(id: string): Promise<boolean> {
    const collections = await this.getCollections()
    const filtered = collections.filter(collection => collection.id !== id)
    
    if (filtered.length === collections.length) return false
    
    await this.saveData('collections', filtered)
    return true
  }

  // Profile methods
  async getProfile(): Promise<Profile | null> {
    const profile = await this.loadData('profile')
    if (!profile && this.currentUser) {
      // Create default profile
      const defaultProfile: Profile = {
        id: this.generateId(),
        user_id: this.currentUser.id,
        display_name: this.currentUser.name || 'Local User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {
          theme: 'dark',
          editor_font_size: 14,
          auto_save: true,
          show_line_numbers: true,
          word_wrap: true
        }
      }
      await this.saveData('profile', defaultProfile)
      return defaultProfile
    }
    return profile
  }

  async updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
    const profile = await this.getProfile()
    if (!profile) return null
    
    const updatedProfile = {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    await this.saveData('profile', updatedProfile)
    return updatedProfile
  }

  // Settings methods
  async getSettings(): Promise<any> {
    const profile = await this.getProfile()
    return profile?.settings || {}
  }

  async updateSettings(settings: any): Promise<void> {
    const profile = await this.getProfile()
    if (profile) {
      await this.updateProfile({ settings: { ...profile.settings, ...settings } })
    }
  }

  // Search methods
  async searchPrompts(query: string): Promise<Prompt[]> {
    const prompts = await this.getPrompts()
    const lowercaseQuery = query.toLowerCase()
    
    return prompts.filter(prompt => 
      prompt.title.toLowerCase().includes(lowercaseQuery) ||
      prompt.content.toLowerCase().includes(lowercaseQuery) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }

  async searchCollections(query: string): Promise<Collection[]> {
    const collections = await this.getCollections()
    const lowercaseQuery = query.toLowerCase()
    
    return collections.filter(collection => 
      collection.name.toLowerCase().includes(lowercaseQuery) ||
      (collection.description && collection.description.toLowerCase().includes(lowercaseQuery))
    )
  }

  // Export/Import methods
  async exportData(): Promise<any> {
    const data = {
      user: this.currentUser,
      profile: await this.getProfile(),
      prompts: await this.getPrompts(),
      collections: await this.getCollections(),
      project_tabs: await this.getProjectTabs(),
      exported_at: new Date().toISOString()
    }
    return data
  }

  async importData(data: any): Promise<void> {
    if (data.profile) await this.saveData('profile', data.profile)
    if (data.prompts) await this.saveData('prompts', data.prompts)
    if (data.collections) await this.saveData('collections', data.collections)
    if (data.project_tabs) await this.saveData('project_tabs', data.project_tabs)
  }
}

// Export singleton instance
export const localStorage = new LocalStorageService()
export default localStorage 