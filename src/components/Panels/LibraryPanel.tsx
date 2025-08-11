import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, 
  Heart,
  Copy, 
  Eye, 
  Image, 
  Video, 
  Type,
  Grid,
  List,
  Sparkles,
  X
} from 'lucide-react'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'
import { listPrompts as fetchPrompts, toggleFavorite as toggleFav, incrementCopyCount, PromptListItem } from '../../lib/promptService'

interface LibraryPanelProps {
  section: string
}

const typeIcons = {
  image: Image,
  video: Video,
  text: Type
}

const typeColors = {
  image: 'text-blue-500',
  video: 'text-purple-500',
  text: 'text-green-500'
}

export function LibraryPanel({ section }: LibraryPanelProps) {
  const [prompts, setPrompts] = useState<PromptListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedPrompt, setSelectedPrompt] = useState<PromptListItem | null>(null)

  async function load() {
    try {
      setLoading(true)
      const items = await fetchPrompts({ section: section as any, searchTerm })
      setPrompts(items)
    } catch (error: any) {
      console.error('Error loading prompts:', error)
      toast.error(error?.message || 'Fehler beim Laden der Prompts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const copyPrompt = async (prompt: PromptListItem) => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      toast.success('Prompt kopiert!')
      await incrementCopyCount(prompt.id)
      setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, copy_count: (p.copy_count || 0) + 1 } : p))
    } catch (error) {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  const toggleFavorite = async (prompt: PromptListItem) => {
    try {
      const willBeFav = !prompt.is_favorite
      setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, is_favorite: willBeFav } : p))
      await toggleFav(prompt.id, willBeFav)
      toast.success(willBeFav ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt')
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Favoriten')
      // revert on error
      setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, is_favorite: !p.is_favorite } : p))
    }
  }

  const filtered = useMemo(() => prompts, [prompts])

  const getTitle = () => {
    switch (section) {
      case 'featured': return 'Empfohlene Prompts'
      case 'image-prompts': return 'Bild-Prompts'
      case 'video-prompts': return 'Video-Prompts'
      case 'text-prompts': return 'Text-Prompts'
      default: return 'Prompt-Bibliothek'
    }
  }

  const renderPromptCard = (prompt: PromptListItem) => {
    const IconComponent = typeIcons[prompt.type]
    const iconColor = typeColors[prompt.type]
    
    return (
      <div 
        key={prompt.id} 
        className={cn(
          'group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer',
          viewMode === 'grid' ? 'min-h-[220px]' : 'min-h-[120px]'
        )}
        onClick={() => setSelectedPrompt(prompt)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-900', iconColor)}>
              <IconComponent className={cn('w-3.5 h-3.5')} />
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
              {prompt.type}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(prompt) }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                prompt.is_favorite 
                  ? 'text-rose-500 hover:bg-rose-500/10' 
                  : 'text-slate-500 hover:bg-slate-500/10'
              )}
            >
              <Heart className={cn('w-4 h-4', prompt.is_favorite && 'fill-current')} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); copyPrompt(prompt) }}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-500/10"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 line-clamp-1">
          {prompt.title}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
          {prompt.description || prompt.content}
        </p>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3" />
            <span>{prompt.copy_count}</span>
          </div>
          <div className="flex items-center gap-1">
            {(prompt.tags || []).slice(0, 3).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-[10px]">#{tag}</span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 md:mb-6">
        <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">{getTitle()}</h2>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suche in Titeln und Inhalten"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700"
            />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-lg border', viewMode === 'grid' ? 'border-blue-500 text-blue-600' : 'border-slate-200 dark:border-slate-700')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 rounded-lg border', viewMode === 'list' ? 'border-blue-500 text-blue-600' : 'border-slate-200 dark:border-slate-700')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Lade Prompts...</div>
      ) : (
        <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1') }>
          {filtered.map(renderPromptCard)}
        </div>
      )}

      {selectedPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPrompt(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full p-6 border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedPrompt.title}</h3>
              <button onClick={() => setSelectedPrompt(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="prose prose-invert max-w-none text-sm">
              <pre className="whitespace-pre-wrap">{selectedPrompt.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}