import { storage } from './storage'

export type PromptType = 'image' | 'video' | 'text'

export interface PromptListItem {
  id: string
  title: string
  content: string
  description?: string
  type: PromptType
  style_category?: string | null
  tags: string[]
  parameters: Record<string, any>
  negative_prompt?: string | null
  is_public: boolean
  is_featured: boolean
  version: string
  created_by?: string
  created_at?: string
  updated_at?: string
  view_count?: number
  copy_count?: number
  is_favorite?: boolean
}

function newId() {
  return `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export interface ListPromptsOptions {
  section?: 'featured' | 'image-prompts' | 'video-prompts' | 'text-prompts' | string
  searchTerm?: string
  limit?: number
}

export async function listPrompts(options: ListPromptsOptions = {}): Promise<PromptListItem[]> {
  const { section, searchTerm } = options
  const all: PromptListItem[] = (await storage.loadData('prompts')) || []
  let data = [...all]

  if (section === 'featured') data = data.filter(p => p.is_featured)
  if (section === 'image-prompts') data = data.filter(p => p.type === 'image')
  if (section === 'video-prompts') data = data.filter(p => p.type === 'video')
  if (section === 'text-prompts') data = data.filter(p => p.type === 'text')

  if (searchTerm && searchTerm.trim()) {
    const t = searchTerm.trim().toLowerCase()
    data = data.filter(p => (p.title || '').toLowerCase().includes(t) || (p.content || '').toLowerCase().includes(t))
  }

  data.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
  return data
}

export async function listMyPrompts(): Promise<PromptListItem[]> {
  const all: PromptListItem[] = (await storage.loadData('prompts')) || []
  all.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
  return all
}

export async function createPrompt(init?: Partial<PromptListItem>): Promise<PromptListItem> {
  const prompts: PromptListItem[] = (await storage.loadData('prompts')) || []
  const p: PromptListItem = {
    id: newId(),
    title: init?.title || `Neuer Prompt ${new Date().toLocaleDateString()}`,
    content: init?.content || '',
    description: init?.description || '',
    type: (init?.type || 'text') as PromptType,
    tags: Array.isArray(init?.tags) ? init!.tags : [],
    parameters: init?.parameters || {},
    negative_prompt: init?.negative_prompt || null,
    is_public: !!init?.is_public,
    is_featured: !!init?.is_featured,
    version: init?.version || '1.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    view_count: 0,
    copy_count: 0,
  }
  prompts.unshift(p)
  await storage.saveData('prompts', prompts)
  return p
}

export async function updatePrompt(id: string, patch: Partial<PromptListItem>): Promise<PromptListItem> {
  const prompts: PromptListItem[] = (await storage.loadData('prompts')) || []
  const idx = prompts.findIndex(p => p.id === id)
  if (idx < 0) throw new Error('Prompt not found')
  const merged = { ...prompts[idx], ...patch, updated_at: new Date().toISOString() }
  prompts[idx] = merged
  await storage.saveData('prompts', prompts)
  return merged
}

export async function deletePrompt(id: string): Promise<void> {
  const prompts: PromptListItem[] = (await storage.loadData('prompts')) || []
  const next = prompts.filter(p => p.id !== id)
  await storage.saveData('prompts', next)
}

export async function toggleFavorite(promptId: string, makeFavorite: boolean): Promise<void> {
  const prompts: PromptListItem[] = (await storage.loadData('prompts')) || []
  const idx = prompts.findIndex(p => p.id === promptId)
  if (idx < 0) return
  prompts[idx] = { ...prompts[idx], is_favorite: !!makeFavorite, updated_at: new Date().toISOString() }
  await storage.saveData('prompts', prompts)
}

export async function incrementCopyCount(promptId: string): Promise<void> {
  const prompts: PromptListItem[] = (await storage.loadData('prompts')) || []
  const idx = prompts.findIndex(p => p.id === promptId)
  if (idx < 0) return
  const current = prompts[idx].copy_count || 0
  prompts[idx] = { ...prompts[idx], copy_count: current + 1, updated_at: new Date().toISOString() }
  await storage.saveData('prompts', prompts)
} 