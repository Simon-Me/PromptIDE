import React, { useState } from 'react'
import { 
  Plus, 
  X, 
  Save, 
  MoreHorizontal,
  Image,
  Video,
  Type,
  Edit3
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface EditorTab {
  id: string
  name: string
  content: string
  type: 'image' | 'video' | 'text'
  isUnsaved: boolean
  isSaved: boolean
}

interface TabBarProps {
  tabs: EditorTab[]
  activeTabId: string
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabCreate: () => void
  onTabRename: (tabId: string, name: string) => void
  onTabTypeChange: (tabId: string, type: 'image' | 'video' | 'text') => void
  onTabSave: (tab: EditorTab) => void
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

export function TabBar({ 
  tabs, 
  activeTabId, 
  onTabSelect, 
  onTabClose, 
  onTabCreate, 
  onTabRename,
  onTabTypeChange,
  onTabSave 
}: TabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)

  const startRename = (tab: EditorTab) => {
    setEditingTabId(tab.id)
    setEditingName(tab.name)
  }

  const finishRename = () => {
    if (editingTabId && editingName.trim()) {
      onTabRename(editingTabId, editingName.trim())
    }
    setEditingTabId(null)
    setEditingName('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishRename()
    } else if (e.key === 'Escape') {
      setEditingTabId(null)
      setEditingName('')
    }
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const isEditing = editingTabId === tab.id
          const TypeIcon = typeIcons[tab.type]
          
          return (
            <div
              key={tab.id}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-r border-slate-200 dark:border-slate-700 min-w-0 group relative',
                isActive 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-750'
              )}
            >
              {/* Type Icon */}
              <TypeIcon className={cn('w-4 h-4 flex-shrink-0', typeColors[tab.type])} />
              
              {/* Tab Name */}
              {isEditing ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={handleKeyPress}
                  className="bg-transparent border border-blue-500 rounded px-1 text-sm min-w-0 flex-1"
                  autoFocus
                />
              ) : (
                <span
                  className="text-sm truncate cursor-pointer min-w-0 flex-1"
                  onClick={() => onTabSelect(tab.id)}
                  onDoubleClick={() => startRename(tab)}
                >
                  {tab.name}
                </span>
              )}
              
              {/* Status Indicators */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {tab.isUnsaved && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full" title="Nicht gespeichert" />
                )}
                
                {/* Tab Actions (visible on hover or active) */}
                <div className={cn(
                  'flex items-center gap-1 transition-opacity',
                  isActive || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}>
                  {/* Type Change Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowTypeMenu(showTypeMenu === tab.id ? null : tab.id)
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Typ ändern"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                  
                  {/* Rename Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(tab)
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Umbenennen"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  
                  {/* Save Button */}
                  {tab.isUnsaved && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onTabSave(tab)
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-blue-600"
                      title="Speichern"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                  )}
                  
                  {/* Close Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onTabClose(tab.id)
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Schließen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* Type Menu */}
              {showTypeMenu === tab.id && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 min-w-[120px]">
                  {(['image', 'video', 'text'] as const).map((type) => {
                    const Icon = typeIcons[type]
                    return (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation()
                          onTabTypeChange(tab.id, type)
                          setShowTypeMenu(null)
                        }}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white dark:hover:bg-slate-700 transition-colors first:rounded-t-lg last:rounded-b-lg',
                          tab.type === type && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', typeColors[type])} />
                        <span className="capitalize">{type}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        
        {/* New Tab Button */}
        <button
          onClick={onTabCreate}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-750 transition-colors flex-shrink-0"
          title="Neuen Tab erstellen"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      {/* Click outside to close type menu */}
      {showTypeMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowTypeMenu(null)}
        />
      )}
    </div>
  )
}