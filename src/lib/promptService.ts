import { supabase } from './supabase'

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
  created_by: string
  created_at: string
  updated_at: string
  view_count: number
  copy_count: number
  is_favorite?: boolean
}

export interface ListPromptsOptions {
  section?: 'featured' | 'image-prompts' | 'video-prompts' | 'text-prompts' | string
  searchTerm?: string
  limit?: number
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) return null
    return data.user?.id ?? null
  } catch {
    return null
  }
}

function isMissingColumnError(error: any, columnName: string): boolean {
  const msg = String(error?.message || error?.hint || error?.details || '')
  return msg.includes(`column ${columnName}`) || msg.includes(`column \"${columnName}\"`) || msg.includes('undefined column') || msg.includes('42703')
}

function extractMissingColumns(error: any): string[] {
  const msg = String(error?.message || error?.hint || error?.details || '')
  const columns: string[] = []
  const singleMatch = msg.match(/Could not find the '([^']+)' column of 'prompts'/i)
  if (singleMatch?.[1]) columns.push(singleMatch[1])
  const pgMatch = msg.match(/column\s+\"([^\"]+)\"\s+of\s+relation\s+\"prompts\"\s+does\s+not\s+exist/i)
  if (pgMatch?.[1]) columns.push(pgMatch[1])
  const listMatch = msg.match(/columns?\s+([a-z0-9_\s,]+)\s+do(es)?\s+not\s+exist/i)
  if (listMatch?.[1]) {
    listMatch[1].split(',').map(s => s.trim()).forEach(c => c && columns.push(c))
  }
  return Array.from(new Set(columns))
}

export async function listPrompts(options: ListPromptsOptions = {}): Promise<PromptListItem[]> {
  const { section, searchTerm, limit = 200 } = options

  const buildBase = () => {
    let query = supabase
      .from('prompts')
      .select('*')
      .limit(limit)
    try {
      query = query.order('updated_at', { ascending: false })
    } catch (_) {}

    // Default library view should only show public prompts
    if (!section || ['featured', 'image-prompts', 'video-prompts', 'text-prompts'].includes(section)) {
      query = (query as any).eq?.('is_public', true) || query
    }

    if (section === 'featured') {
      query = (query as any).eq?.('is_featured', true) || query
    } else if (section === 'image-prompts') {
      query = (query as any).eq?.('type', 'image') || query
    } else if (section === 'video-prompts') {
      query = (query as any).eq?.('type', 'video') || query
    } else if (section === 'text-prompts') {
      query = (query as any).eq?.('type', 'text') || query
    }

    if (searchTerm && searchTerm.trim().length > 0) {
      const term = `%${searchTerm.trim()}%`
      query = (query as any).or?.(`title.ilike.${term},content.ilike.${term}`) || query
    }

    return query
  }

  // First attempt with full query
  let { data: prompts, error } = await buildBase()

  // Retry without order if updated_at missing
  if (error && isMissingColumnError(error, 'updated_at')) {
    const query = supabase.from('prompts').select('*').limit(limit)
    const res = await query
    prompts = res.data as any
    error = res.error as any
  }

  // If still failing due to any missing column, fallback to bare select
  if (error) {
    const missing = extractMissingColumns(error)
    if (missing.length > 0) {
      const res = await supabase.from('prompts').select('*').limit(limit)
      prompts = res.data as any
      error = res.error as any
    }
  }

  if (error) {
    console.error('listPrompts error:', { message: error.message, details: (error as any).details, hint: (error as any).hint })
    throw error
  }

  const userId = await getCurrentUserId()
  if (!userId) return (prompts as PromptListItem[]) || []

  const { data: favs, error: favErr } = await supabase
    .from('prompt_favorites')
    .select('prompt_id')
    .eq('user_id', userId)
  if (favErr) {
    console.error('favorites fetch error:', { message: favErr.message, details: (favErr as any).details, hint: (favErr as any).hint })
    throw favErr
  }

  const favSet = new Set((favs || []).map((f: any) => f.prompt_id))
  return ((prompts as PromptListItem[]) || []).map(p => ({ ...p, is_favorite: favSet.has(p.id) }))
}

export async function listMyPrompts(): Promise<PromptListItem[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  // First try with created_by
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('created_by', userId)
  try { query = query.order('updated_at', { ascending: false }) } catch (_) {}

  let { data, error } = await query

  // Fallback to user_id if created_by doesn't exist
  if (error && isMissingColumnError(error, 'created_by')) {
    let q2 = supabase.from('prompts').select('*').eq('user_id', userId)
    try { q2 = q2.order('updated_at', { ascending: false }) } catch (_) {}
    const retry = await q2
    data = retry.data as any
    error = retry.error as any
  }

  // Retry without order if updated_at missing
  if (error && isMissingColumnError(error, 'updated_at')) {
    const res = await supabase.from('prompts').select('*').eq('created_by', userId)
    data = res.data as any
    error = res.error as any
  }

  // If still failing due to missing columns, fallback to bare select
  if (error) {
    const missing = extractMissingColumns(error)
    if (missing.length > 0) {
      const res = await supabase.from('prompts').select('*').limit(200)
      data = res.data as any
      error = res.error as any
    }
  }

  if (error) {
    console.error('listMyPrompts error:', { message: error.message, details: (error as any).details, hint: (error as any).hint })
    throw error
  }
  return (data as PromptListItem[]) || []
}

export async function createPrompt(init?: Partial<PromptListItem>): Promise<PromptListItem> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Not authenticated')

  const basePayload: Record<string, any> = {
    title: init?.title || `Neuer Prompt ${new Date().toLocaleDateString()}`,
    content: init?.content || '// Neuer Prompt erstellt\n// Beginnen Sie hier mit dem Schreiben\n\n',
    type: (init?.type || 'image') as PromptType,
    tags: Array.isArray(init?.tags) ? init!.tags : [],
    is_public: !!init?.is_public,
    is_featured: !!init?.is_featured,
    parameters: init?.parameters || {},
  }

  const tryInsert = async (payload: Record<string, any>) => {
    return await supabase
      .from('prompts')
      .insert(payload)
      .select('*')
      .single()
  }

  let attempt = 0
  let lastError: any = null
  let currentPayload: Record<string, any> = { ...basePayload, created_by: userId }

  while (attempt < 3) {
    const { data, error } = await tryInsert(currentPayload)

    if (!error) {
      return data as PromptListItem
    }

    if (isMissingColumnError(error, 'created_by')) {
      delete (currentPayload as any).created_by
      currentPayload = { ...currentPayload, user_id: userId }
      attempt++
      continue
    }

    const missing = extractMissingColumns(error)
    if (missing.length > 0) {
      missing.forEach(col => { delete (currentPayload as any)[col] })
      attempt++
      continue
    }

    lastError = error
    break
  }

  const minimalPayload = { title: basePayload.title, content: basePayload.content, type: basePayload.type, created_by: userId }
  let { data: finalData, error: finalErr } = await tryInsert(minimalPayload)
  if (finalErr && isMissingColumnError(finalErr, 'created_by')) {
    const altMinimal: Record<string, any> = { ...minimalPayload, user_id: userId }
    delete (altMinimal as any).created_by
    const retry = await tryInsert(altMinimal)
    finalData = retry.data
    finalErr = retry.error
  }

  if (finalErr) {
    console.error('createPrompt error:', { message: finalErr.message, details: (finalErr as any).details, hint: (finalErr as any).hint }, 'payload:', currentPayload)
    throw finalErr
  }

  return finalData as PromptListItem
}

export async function updatePrompt(id: string, patch: Partial<PromptListItem>): Promise<PromptListItem> {
  const allowed: any = {}
  if (typeof patch.title === 'string') allowed.title = patch.title
  if (typeof patch.content === 'string') allowed.content = patch.content
  if (patch.type) allowed.type = patch.type
  if (Array.isArray(patch.tags)) allowed.tags = patch.tags
  if (typeof patch.description === 'string') allowed.description = patch.description
  if (typeof patch.negative_prompt === 'string') allowed.negative_prompt = patch.negative_prompt
  if (typeof patch.is_public === 'boolean') allowed.is_public = patch.is_public
  if (typeof patch.is_featured === 'boolean') allowed.is_featured = patch.is_featured
  if (patch.parameters) allowed.parameters = patch.parameters

  const baseUpdate = { ...allowed, updated_at: new Date().toISOString() }

  let { data, error } = await supabase
    .from('prompts')
    .update(baseUpdate)
    .eq('id', id)
    .select('*')
    .single()

  if (error && isMissingColumnError(error, 'updated_at')) {
    const retry = await supabase
      .from('prompts')
      .update(allowed)
      .eq('id', id)
      .select('*')
      .single()
    data = retry.data as any
    error = retry.error as any
  }

  if (error) {
    console.error('updatePrompt error:', { message: error.message, details: (error as any).details, hint: (error as any).hint }, 'patch:', allowed)
    throw error
  }
  return data as PromptListItem
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase
    .from('prompts')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('deletePrompt error:', { message: error.message, details: (error as any).details, hint: (error as any).hint })
    throw error
  }
}

export async function toggleFavorite(promptId: string, makeFavorite: boolean): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Not authenticated')

  if (makeFavorite) {
    const { error } = await supabase
      .from('prompt_favorites')
      .insert({ prompt_id: promptId, user_id: userId })
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase
      .from('prompt_favorites')
      .delete()
      .eq('prompt_id', promptId)
      .eq('user_id', userId)
    if (error) throw error
  }
}

export async function incrementCopyCount(promptId: string): Promise<void> {
  const { data, error } = await supabase
    .from('prompts')
    .select('copy_count')
    .eq('id', promptId)
    .maybeSingle()
  if (error) throw error
  const current = (data?.copy_count as number) ?? 0
  const { error: updErr } = await supabase
    .from('prompts')
    .update({ copy_count: current + 1 })
    .eq('id', promptId)
  if (updErr) throw updErr
} 