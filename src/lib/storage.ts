// Global storage service instance
import remoteStorage from './supabaseStorage'

// Export the singleton instance
export const storage = remoteStorage

// Helper functions for common operations
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