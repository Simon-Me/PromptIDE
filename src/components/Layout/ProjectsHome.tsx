import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Folder, Pencil, Trash2, ChevronRight, Star, Search } from 'lucide-react'
import { storage } from '../../lib/storage'
import { listMyPrompts } from '../../lib/promptService'
import { loadAllMeta } from '../../lib/promptMetaService'

interface Project {
  id: string
  name: string
  iconName?: string
}

export function ProjectsHome({ onOpen }: { onOpen: (projectId: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [promptCountByProject, setPromptCountByProject] = useState<Record<string, number>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent'|'name'|'count'>('recent')
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      const savedProjects = await storage.loadData('projects')
      setProjects(Array.isArray(savedProjects) ? savedProjects : [])
      const favs = await storage.loadData('projects_favorites')
      setFavorites(favs || {})

      // Count prompts per project using Supabase + meta
      try {
        const prompts = await listMyPrompts()
        const meta = await loadAllMeta()
        const counts: Record<string, number> = {}
        for (const p of prompts as any[]) {
          const m = meta[p.id] || {}
          const pid = m.projectId || 'project_default'
          counts[pid] = (counts[pid] || 0) + 1
        }
        setPromptCountByProject(counts)
      } catch {
        setPromptCountByProject({})
      }
    }
    load()
  }, [])

  const addProject = async () => {
    const p: Project = { id: `proj_${Date.now()}`, name: 'Neues Projekt', iconName: 'folder' }
    const updated = [...projects, p]
    setProjects(updated)
    await storage.saveData('projects', updated)
    setEditingId(p.id)
    setNewName(p.name)
  }

  const renameProject = async (projectId: string) => {
    if (!newName.trim()) return
    const updated = projects.map(p => p.id === projectId ? { ...p, name: newName.trim() } : p)
    setProjects(updated)
    await storage.saveData('projects', updated)
    setEditingId(null)
  }

  const deleteProject = async (projectId: string) => {
    if ((promptCountByProject[projectId] || 0) > 0) return
    const updated = projects.filter(p => p.id !== projectId)
    setProjects(updated)
    await storage.saveData('projects', updated)
  }

  const toggleFav = async (id: string) => {
    const next = { ...favorites, [id]: !favorites[id] }
    setFavorites(next)
    await storage.saveData('projects_favorites', next)
  }

  const filtered = useMemo(() => (
    projects
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a,b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'count') return (promptCountByProject[b.id] || 0) - (promptCountByProject[a.id] || 0)
        return 0
      })
  ), [projects, query, sort, promptCountByProject])

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl">
        <div className="text-xl font-semibold flex-1">Projekte</div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Suchen…" className="pl-8 pr-3 py-1.5 rounded-md border border-slate-300/60 dark:border-slate-600/60 bg-transparent" />
        </div>
        <select value={sort} onChange={e=>setSort(e.target.value as any)} className="px-2 py-1.5 rounded-md border border-slate-300/60 dark:border-slate-600/60 bg-transparent">
          <option value="recent">Zuletzt</option>
          <option value="name">Name</option>
          <option value="count">Anzahl</option>
        </select>
        <button onClick={addProject} className="px-3 py-1.5 rounded-md border border-slate-300/60 dark:border-slate-600/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Neu
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl">
          <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-slate-500">Noch keine Projekte – erstelle mit „Neu“ dein erstes Projekt.</div>
            )}
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                <Folder className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {editingId === p.id ? (
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameProject(p.id) }}
                    className="flex-1 bg-transparent border-b border-slate-300/60 dark:border-slate-600/60 outline-none"
                  />
                ) : (
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-500">{promptCountByProject[p.id] || 0} Prompts</div>
                  </div>
                )}
                <button onClick={() => toggleFav(p.id)} className={`p-2 rounded-md ${favorites[p.id] ? 'text-yellow-500' : 'text-slate-400'} hover:bg-slate-100/60 dark:hover:bg-slate-700/60`} title="Favorit">
                  <Star className="w-4 h-4" />
                </button>
                {editingId === p.id ? (
                  <button onClick={() => renameProject(p.id)} className="px-2 py-1 text-xs rounded-md border">Fertig</button>
                ) : (
                  <button onClick={() => { setEditingId(p.id); setNewName(p.name) }} className="p-2 rounded-md hover:bg-slate-100/60 dark:hover:bg-slate-700/60" title="Umbenennen">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => deleteProject(p.id)} disabled={(promptCountByProject[p.id] || 0) > 0} className="p-2 rounded-md hover:bg-slate-100/60 dark:hover:bg-slate-700/60 disabled:opacity-40" title="Löschen">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => onOpen(p.id)} className="ml-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1">
                  Öffnen <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 