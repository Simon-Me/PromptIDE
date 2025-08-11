import React, { useState, useEffect, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { EditorArea } from '../Editor/EditorArea'
import { PromptLibraryPanel } from '../Panels/PromptLibraryPanel'
import { LibraryPanel } from '../Panels/LibraryPanel'
import { SettingsPanel } from '../Panels/SettingsPanel'
import { chatGPTService } from '../../lib/chatgpt'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { AuthScreen } from '../Auth/AuthScreen'
import { Loader2 } from 'lucide-react'

interface Prompt {
  id: string
  title: string
  content: string
  type: 'image' | 'video' | 'text'
  tags: string[]
  is_favorite: boolean
  usage_count: number
}

export function MainLayout() {
  const { user, loading } = useAuth()
  const [activeSection, setActiveSection] = useState('my-prompts')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [previousSection, setPreviousSection] = useState('my-prompts')
  const [activeWorkflow, setActiveWorkflow] = useState<'image' | 'video'>('image')
  const editorAreaRef = useRef<any>(null)
  const [appBooting, setAppBooting] = useState(true)
  const [isPresetLoading, setIsPresetLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Initialisiere…')

  useEffect(() => {
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark')
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setAppBooting(false), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const cleanup = (window as any).electronAPI.onMenuAction((action: string) => {
        switch (action) {
          case 'toggle-sidebar':
            setSidebarCollapsed(!sidebarCollapsed)
            break
          case 'open-preferences':
            handleSectionChange('settings')
            break
        }
      })
      return cleanup
    }
  }, [sidebarCollapsed])

  const handleSectionChange = (newSection: string) => {
    if (newSection !== 'settings') {
      setPreviousSection(activeSection)
    }
    setActiveSection(newSection)
  }

  const handleCloseSettings = () => {
    setActiveSection(previousSection)
  }

  const handleNewPrompt = async (folderId?: string) => {
    if (!['my-prompts', 'collections', 'favorites'].includes(activeSection)) {
      handleSectionChange('my-prompts')
    }
    if (editorAreaRef.current && editorAreaRef.current.createNewPrompt) {
      try {
        await editorAreaRef.current.createNewPrompt(folderId)
      } catch (error) {
        console.error('Error creating new prompt:', error)
      }
    }
  }

  const handleOpenPrompt = (prompt: Prompt) => {
    if (!['my-prompts', 'collections', 'favorites'].includes(activeSection)) {
      handleSectionChange('my-prompts')
    }
    if (editorAreaRef.current && editorAreaRef.current.openPrompt) {
      editorAreaRef.current.openPrompt(prompt)
    }
  }

  const isEditorSection = ['my-prompts', 'collections', 'favorites'].includes(activeSection)

  const handleInsertPrompt = (text: string) => {
    if (editorAreaRef.current && editorAreaRef.current.insertTextAtCursor) {
      const oldContent = editorAreaRef.current.getContent ? editorAreaRef.current.getContent() : ''
      editorAreaRef.current.insertTextAtCursor(text)
      if (editorAreaRef.current.getContent && editorAreaRef.current.highlightNewContent) {
        setTimeout(() => {
          const newContent = editorAreaRef.current.getContent()
          editorAreaRef.current.highlightNewContent(oldContent, newContent)
        }, 100)
      }
    }
  }

  const handleSmartInsertPrompt = async (element: string, category: string) => {
    if (!editorAreaRef.current) {
      console.error('Editor reference not available for smart insertion')
      return
    }

    try {
      const currentContent = editorAreaRef.current.getContent ? editorAreaRef.current.getContent() : ''
      if (!currentContent.trim()) {
        handleInsertPrompt(element)
        return
      }
      const toastId = toast.loading('🤖 Integrating intelligently...')
      const result = await chatGPTService.intelligentlyIntegratePromptElement(
        currentContent, 
        element, 
        category
      )
      toast.dismiss(toastId)
      if (result.success && result.content) {
        if (editorAreaRef.current && 'setContent' in editorAreaRef.current) {
          (editorAreaRef.current as any).setContent(result.content)
        }
        if (editorAreaRef.current && 'highlightNewContent' in editorAreaRef.current) {
          setTimeout(() => {
            (editorAreaRef.current as any).highlightNewContent(currentContent, result.content)
          }, 100)
        }
        toast.success(`✨ Intelligently integrated "${category}" element!`)
      } else {
        handleInsertPrompt(element)
        toast.error('Smart integration failed - using simple insertion')
      }
    } catch (error) {
      console.error('Smart insertion error:', error)
      handleInsertPrompt(element)
      toast.error('Error during smart integration - using simple insertion')
    }
  }

  if (!loading && !user) {
    return <AuthScreen />
  }

  const renderMainContent = () => {
    switch (activeSection) {
      case 'my-prompts':
      case 'persons':
      case 'locations':
      case 'movements':
      case 'collections':
      case 'favorites':
        return (
          <div className="flex h-full">
            <div className="flex-1 h-full">
              <EditorArea ref={editorAreaRef} section={activeSection} />
            </div>
            <div className="w-96 h-full border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
              <PromptLibraryPanel 
                activeWorkflow={activeWorkflow} 
                onInsertPrompt={handleInsertPrompt}
                onWorkflowChange={setActiveWorkflow}
                onSmartInsertPrompt={handleSmartInsertPrompt}
              />
            </div>
          </div>
        )
      case 'featured':
      case 'image-prompts':
      case 'video-prompts':
      case 'text-prompts':
        return <LibraryPanel section={activeSection} />
      case 'settings':
        return <SettingsPanel onClose={handleCloseSettings} />
      default:
        return (
          <div className="flex h-full">
            <div className="flex-1 h-full">
              <EditorArea ref={editorAreaRef} section={activeSection} />
            </div>
            <div className="w-96 h-full border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
              <PromptLibraryPanel 
                activeWorkflow={activeWorkflow} 
                onInsertPrompt={handleInsertPrompt}
                onWorkflowChange={setActiveWorkflow}
                onSmartInsertPrompt={handleSmartInsertPrompt}
              />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden relative">
      {(loading || appBooting || !dataLoaded) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <div className="w-[420px] max-w-[90vw] px-5 py-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/80 shadow-xl">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{loadingMessage || 'Wird geladen…'}</div>
            <div className="w-full h-2 rounded bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, Math.round(loadingProgress * 100)))}%` }} />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{Math.min(100, Math.max(0, Math.round(loadingProgress * 100)))}%</div>
          </div>
        </div>
      )}
      {isPresetLoading && !loading && !appBooting && dataLoaded && (
        <div className="absolute top-16 right-6 z-40">
          <div className="px-2 py-2 rounded-full border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/70 shadow-lg backdrop-blur-md">
            <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300" />
          </div>
        </div>
      )}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewPrompt={handleNewPrompt}
        onOpenPrompt={handleOpenPrompt}
        onLoaded={() => setDataLoaded(true)}
        onProgress={(p, msg) => { setLoadingProgress(p); if (msg) setLoadingMessage(msg) }}
      />
      <div className="flex-1 h-full overflow-hidden">
        {renderMainContent()}
      </div>
    </div>
  )
}