import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import { Editor } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'
import { chatGPTService } from '../../lib/chatgpt'
import { promptSuggestions, getSuggestionsForWord, searchSuggestions } from '../../lib/prompt-suggestions'
import { instantHighlighter } from '../../lib/instant-highlighter'
import { Sparkles, Wand2, Shuffle, Loader2, MessageSquare, X, Copy, BarChart3, Search, Edit3, Film as FilmIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { storage } from '../../lib/storage'
import { createPrompt as createDbPrompt, updatePrompt as updateDbPrompt, listMyPrompts as listDbMyPrompts } from '../../lib/promptService'
import { upsertMeta } from '../../lib/promptMetaService'
import { createPortal } from 'react-dom'

interface EditorAreaProps {
  section?: string
}

interface EditorAreaRef {
  createNewPrompt: (folderId?: string) => Promise<void>
  openPrompt: (prompt: any) => void
  insertTextAtCursor: (text: string) => void
  getContent: () => string
  setContent: (newContent: string) => void
  highlightNewContent: (oldContent: string, newContent: string) => void
  getLiveSelectedText: () => string
}

interface Prompt {
  id: string
  title: string
  content: string
  type: 'image' | 'video' | 'text'
  tags: string[]
  is_favorite: boolean
  usage_count: number
  folder?: string
  is_bookmarked?: boolean
}

export const EditorArea = forwardRef<EditorAreaRef, EditorAreaProps>(({ section = 'my-prompts' }, ref) => {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null)
  const [isUnsaved, setIsUnsaved] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false)
  const [isImprovingSelection, setIsImprovingSelection] = useState(false)
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false)
  const [isBeautifying, setIsBeautifying] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [promptScore, setPromptScore] = useState<{score: number, feedback: string, suggestions: string[]} | null>(null)
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugQuery, setDebugQuery] = useState('')
  const [isDebugging, setIsDebugging] = useState(false)
  const [debugResult, setDebugResult] = useState<{problem: string, location: string, solution: string, fixedPrompt: string} | null>(null)
  const [smartModifyQuery, setSmartModifyQuery] = useState('')
  const [isSmartModifying, setIsSmartModifying] = useState(false)
  const [smartEditMode, setSmartEditMode] = useState<'conservative' | 'creative'>('conservative')
  const [selectedText, setSelectedText] = useState('')
  const [showCustomPromptModal, setShowCustomPromptModal] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [isImprovingWithCustomPrompt, setIsImprovingWithCustomPrompt] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [isMakingShorter, setIsMakingShorter] = useState(false)
  const [dragPreviewImage, setDragPreviewImage] = useState<string | null>(null)
  const [cursorPosition, setCursorPosition] = useState<{lineNumber: number, column: number} | null>(null)
  const [editorDecorations, setEditorDecorations] = useState<string[]>([])
  const [mousePosition, setMousePosition] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [visionModel, setVisionModel] = useState('gpt-4o')
  const [visionPromptStyle, setVisionPromptStyle] = useState('detailed')
  const [showImageModeModal, setShowImageModeModal] = useState(false)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingImageMode, setPendingImageMode] = useState<'character' | 'style' | 'all' | null>(null)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const [statusCursor, setStatusCursor] = useState<{ lineNumber: number; column: number }>({ lineNumber: 1, column: 1 })
  const [isGeneratingShots, setIsGeneratingShots] = useState(false)
  const [shotMenuOpen, setShotMenuOpen] = useState(false)
  const shotButtonRef = useRef<HTMLButtonElement>(null)
  const shotMenuRef = useRef<HTMLDivElement>(null)
  const [shotMenuPos, setShotMenuPos] = useState<{ top: number; left: number; maxHeight: number; placement: 'down' | 'up' } | null>(null)

  type ShotVariant = { id: string; label: string; instruction: string }
  const shotVariants: ShotVariant[] = [
    {
      id: 'extreme_closeup',
      label: 'Extreme Close‑up',
      instruction:
        'Change only the SHOT SIZE/FRAMING language to EXTREME CLOSE‑UP. Update camera/framing words and remove contradictions (wide/expansive/establishing). Keep all other content (subject, style, lighting, environment, lists) UNCHANGED VERBATIM unless a phrase directly conflicts. Preserve the same // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'closeup',
      label: 'Close‑up',
      instruction:
        'Change only the SHOT SIZE/FRAMING to CLOSE‑UP (portrait). Adjust camera/framing words and subject scale; remove wide/ultra‑wide cues. Keep everything else UNCHANGED VERBATIM unless it conflicts with the new shot size. Maintain the same // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'medium_closeup',
      label: 'Medium Close‑up',
      instruction:
        'Switch the SHOT SIZE to MEDIUM CLOSE‑UP (head to mid‑chest). Update only framing/scale words and remove contradicting extremes; keep all other content UNCHANGED VERBATIM. Preserve the // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'medium',
      label: 'Medium',
      instruction:
        'Set the SHOT SIZE to MEDIUM (waist‑up). Update framing/scale terms only; keep subject, lighting, style, and environment text UNCHANGED VERBATIM unless directly conflicting. Keep the same // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'medium_long',
      label: 'Medium Long (Cowboy)',
      instruction:
        'Set the SHOT SIZE to MEDIUM LONG (cowboy, mid‑thigh up). Modify only framing/scale phrases and remove conflicts; keep all other wording UNCHANGED VERBATIM. Preserve // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'long',
      label: 'Long Shot',
      instruction:
        'Change only to LONG SHOT (full body, readable environment). Adjust camera/framing/scale wording; keep all other sections UNCHANGED VERBATIM unless a phrase directly contradicts. Maintain the same // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'wide',
      label: 'Wide',
      instruction:
        'Switch only the framing to WIDE SHOT (environment emphasized, subject smaller). Update framing/scale words and remove tight‑framing cues; keep the rest UNCHANGED VERBATIM. Keep the // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'extreme_wide',
      label: 'Extreme Wide',
      instruction:
        'Set only the framing to EXTREME WIDE / ESTABLISHING (vast environment, subject tiny). Update shot size and any contradictory close/tight words; keep all other content UNCHANGED VERBATIM. Preserve // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'topshot',
      label: 'Top Shot (Overhead)',
      instruction:
        'Change only angle/framing to TOP‑DOWN OVERHEAD (bird\'s‑eye). Update camera/angle/scale words and remove direct conflicts (e.g., eye‑level). Keep lighting/style/subject/environment text UNCHANGED VERBATIM otherwise. Maintain // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'highangle',
      label: 'High Angle',
      instruction:
        'Set only the angle to HIGH ANGLE (camera looking down). Adjust camera/angle and any directly conflicting phrases; keep everything else UNCHANGED VERBATIM. Keep // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'lowangle',
      label: 'Low Angle',
      instruction:
        'Set only the angle to LOW ANGLE (camera looking up). Update camera/angle/scale wording; keep all other content UNCHANGED VERBATIM unless conflicting. Preserve // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'dutch',
      label: 'Dutch Angle',
      instruction:
        'Change only to DUTCH ANGLE (tilted horizon). Adjust angle/framing wording; keep the rest UNCHANGED VERBATIM unless directly contradicting. Maintain // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'droneshot',
      label: 'Drone Shot',
      instruction:
        'Change only to an AERIAL DRONE SHOT. Update camera/angle/framing words (aerial, altitude, overhead/diagonal) and remove ground‑level contradictions (eye‑level, close/tight if conflicting). Keep subject, style, lighting, and environment descriptions UNCHANGED VERBATIM otherwise. Preserve the same // headers and order. Return ONLY the full revised prompt.'
    },
    {
      id: 'orbit',
      label: 'Orbit',
      instruction:
        'Change only to an ORBIT SHOT (camera circling the subject). Add/adjust minimal camera motion phrasing; keep all other text UNCHANGED VERBATIM unless conflicting. Preserve // headers and order. Return ONLY the full revised prompt.'
    }
  ]

  const generateShotVariant = async (variant: ShotVariant) => {
    if (!content.trim()) throw new Error('Kein Prompt vorhanden')
    const result = await chatGPTService.improveSelectedTextWithCustomPrompt(content, '', variant.instruction)
    if (!result.success || !result.content) throw new Error(result.error || 'Keine Antwort')
    const baseTitle = (currentPrompt?.title || 'Prompt').replace(/\s+\(.*\)$/,'').trim()
    const created = await createDbPrompt({
      title: `${baseTitle} (${variant.label})`,
      content: result.content.trim(),
      type: (currentPrompt?.type || 'image') as any,
      tags: currentPrompt?.tags || []
    })
    // Add to local state
    const newPrompt = {
      id: created.id,
      title: created.title,
      content: created.content,
      type: created.type as any,
      tags: created.tags || [],
      is_favorite: false,
      usage_count: created.copy_count || 0,
      folder: currentPrompt?.folder || 'all-prompts'
    }
    const updated = [...prompts, newPrompt as any]
    setPrompts(updated)
    try { await upsertMeta(created.id, { folder: newPrompt.folder }) } catch {}
    window.dispatchEvent(new CustomEvent('prompts-updated', { detail: { prompts: updated } }))
    return created.id
  }

  const handleGenerateCommonShots = async () => {
    if (!content.trim()) {
      toast.error('Kein Prompt vorhanden')
      return
    }
    setIsGeneratingShots(true)
    try {
      const results = [] as string[]
      for (const v of shotVariants) {
        try {
          const id = await generateShotVariant(v)
          results.push(id)
        } catch (err) {
          // continue
        }
      }
      toast.success(`Shots erstellt: ${results.length}/${shotVariants.length}`)
    } finally {
      setIsGeneratingShots(false)
    }
  }

  const handleGenerateSingleShot = async (id: ShotVariant['id']) => {
    const variant = shotVariants.find(s => s.id === id)
    if (!variant) return
    setIsGeneratingShots(true)
    try {
      if (!content.trim()) throw new Error('Kein Prompt vorhanden')
      const result = await chatGPTService.improveSelectedTextWithCustomPrompt(content, '', variant.instruction)
      if (!result.success || !result.content) throw new Error(result.error || 'Keine Antwort')
      const newText = result.content.trim()
      setContent(newText)
      if (currentPrompt) {
        try { await updateDbPrompt(currentPrompt.id, { content: newText }) } catch {}
      }
      toast.success(`${variant.label}: Prompt aktualisiert`)
    } catch (e: any) {
      toast.error(e?.message || 'Fehler beim Erstellen')
    } finally {
      setIsGeneratingShots(false)
    }
  }

    // 🎯 Helper function to get current live selection
  const getLiveSelectedText = React.useCallback(() => {
    const editor = editorRef.current
    const selection = editor?.getSelection()
    const model = editor?.getModel()
    return selection && model ? model.getValueInRange(selection) : ''
  }, [])



  // Load prompts (from Supabase) and settings from persistent storage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedPrompts = await listDbMyPrompts()
        setPrompts(savedPrompts as any)
        
        // Load vision settings
        const settings = await storage.loadData('settings') || {}
        setVisionModel(settings.vision_model || 'gpt-4o')
        setVisionPromptStyle(settings.vision_prompt_style || 'detailed')
      } catch (error) {
        console.error('Error loading saved data:', error)
      }
    }
    loadSavedData()
  }, [])

  // Listen for prompts updates
  useEffect(() => {
    const handlePromptsUpdated = (e: CustomEvent) => {
      const { prompts: updatedPrompts } = e.detail
      setPrompts(updatedPrompts)
      
      if (updatedPrompts.length === 0) {
        setCurrentPrompt(null)
        setContent('')
        setIsUnsaved(false)
      }
    }

    window.addEventListener('prompts-updated', handlePromptsUpdated as EventListener)
    return () => {
      window.removeEventListener('prompts-updated', handlePromptsUpdated as EventListener)
    }
  }, [])

  // FORCE DARK THEME AND APPLY MONACO STYLES
  useEffect(() => {
    // Force dark theme
    document.documentElement.classList.add('dark')
    
    // Remove existing styles
    const existingStyle = document.getElementById('monaco-editor-fixed-styles')
    if (existingStyle) {
      existingStyle.remove()
    }
    
    // Apply BULLETPROOF Monaco Editor styles
    const style = document.createElement('style')
    style.id = 'monaco-editor-fixed-styles'
    style.textContent = `
      /* MONACO EDITOR DARK THEME - BULLETPROOF FIX */
      .monaco-editor {
        background-color: #1e1e1e !important;
        color: #d4d4d4 !important;
      }
      
      .monaco-editor .view-line {
        background-color: transparent !important;
      }
      
      .monaco-editor .view-lines {
        background-color: transparent !important;
      }
      
      .monaco-editor .margin {
        background-color: #1e1e1e !important;
      }
      
      /* TEXT SELECTION - BULLETPROOF APPROACH */
      .monaco-editor .view-line span {
        color: #d4d4d4 !important;
      }
      
      .monaco-editor .view-line span::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk1::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk1::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk2::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk2::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      /* ⚡ INSTANT HIGHLIGHTING CATEGORIES - 8 COLORS */
      .monaco-editor .subject-highlight {
        color: #3B82F6 !important; /* Blue - Subjects & Characters */
        font-weight: bold !important;
        text-shadow: 0 0 2px #3B82F680 !important;
      }
      
      .monaco-editor .style-highlight {
        color: #8B5CF6 !important; /* Purple - Styles & Aesthetics */  
        font-weight: bold !important;
        text-shadow: 0 0 2px #8B5CF680 !important;
      }
      
      .monaco-editor .lighting-highlight {
        color: #F59E0B !important; /* Orange - Lighting & Atmosphere */
        font-weight: bold !important;
        text-shadow: 0 0 2px #F59E0B80 !important;
      }
      
      .monaco-editor .camera-highlight {
        color: #10B981 !important; /* Green - Camera & Composition */
        font-weight: bold !important;
        text-shadow: 0 0 2px #10B98180 !important;
      }
      
      .monaco-editor .quality-highlight {
        color: #06B6D4 !important; /* Cyan - Quality & Technical */
        font-weight: bold !important;
        text-shadow: 0 0 2px #06B6D480 !important;
      }
      
      .monaco-editor .color-highlight {
        color: #EC4899 !important; /* Pink - Colors & Palette */
        font-weight: bold !important;
        text-shadow: 0 0 2px #EC489980 !important;
      }
      
      .monaco-editor .emotion-highlight {
        color: #EAB308 !important; /* Yellow - Emotions & Mood */
        font-weight: bold !important;
        text-shadow: 0 0 2px #EAB30880 !important;
      }
      
      .monaco-editor .setting-highlight {
        color: #14B8A6 !important; /* Teal - Settings & Environments */
        font-weight: bold !important;
        text-shadow: 0 0 2px #14B8A680 !important;
      }
      
      /* 💬 COMMENT HIGHLIGHTING - IDE Style - HIGHEST PRIORITY */
      .monaco-editor .comment-highlight,
      .monaco-editor .comment-highlight.subject-highlight,
      .monaco-editor .comment-highlight.style-highlight,
      .monaco-editor .comment-highlight.lighting-highlight,
      .monaco-editor .comment-highlight.camera-highlight,
      .monaco-editor .comment-highlight.quality-highlight,
      .monaco-editor .comment-highlight.emotion-highlight,
      .monaco-editor .comment-highlight.setting-highlight {
        color: #6A9955 !important; /* VSCode comment green */
        font-weight: normal !important;
        opacity: 0.7 !important;
        font-style: italic !important;
        text-shadow: none !important;
        background-color: transparent !important;
      }

      /* 🆕 NEW CONTENT HIGHLIGHTING - Visible but elegant */
      .monaco-editor .new-content-highlight {
        background-color: rgba(34, 197, 94, 0.15) !important; /* Light green background */
        border: 1px solid rgba(34, 197, 94, 0.3) !important; /* Green border */
        border-radius: 3px !important;
        padding: 1px 3px !important;
        margin: 0 1px !important;
        position: relative !important;
      }

      /* Add a small close indicator */
      .monaco-editor .new-content-highlight::after {
        content: "×" !important;
        position: absolute !important;
        top: -8px !important;
        right: -8px !important;
        background: rgba(34, 197, 94, 0.8) !important;
        color: white !important;
        border-radius: 50% !important;
        width: 14px !important;
        height: 14px !important;
        font-size: 10px !important;
        line-height: 14px !important;
        text-align: center !important;
        cursor: pointer !important;
        opacity: 0.7 !important;
      }

      .monaco-editor .new-content-highlight:hover::after {
        opacity: 1 !important;
      }

      /* 🌑 DIMMED CONTENT - More noticeable dimming */
      .monaco-editor .dimmed-content {
        opacity: 0.4 !important;
        transition: all 0.2s ease !important;
      }

      /* 🎯 OVERRIDE ALL OTHER HIGHLIGHTS when new content is active */
      .monaco-editor .new-content-highlight.subject-highlight,
      .monaco-editor .new-content-highlight.style-highlight,
      .monaco-editor .new-content-highlight.lighting-highlight,
      .monaco-editor .new-content-highlight.camera-highlight,
      .monaco-editor .new-content-highlight.quality-highlight,
      .monaco-editor .new-content-highlight.emotion-highlight,
      .monaco-editor .new-content-highlight.setting-highlight {
        background-color: rgba(34, 197, 94, 0.15) !important;
        border: 1px solid rgba(34, 197, 94, 0.3) !important;
        border-radius: 3px !important;
        padding: 1px 3px !important;
        margin: 0 1px !important;
        position: relative !important;
      }
      
      .monaco-editor .view-line span.mtk3::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk3::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk4::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk4::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk5::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk5::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk6::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk6::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk7::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk7::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk8::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk8::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk9::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk9::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk10::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span.mtk10::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      /* WILDCARD SELECTION */
      .monaco-editor .view-line span[class*="mtk"]::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-line span[class*="mtk"]::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      /* FALLBACK SELECTION */
      .monaco-editor ::selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor ::-moz-selection {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      /* CURSOR AND LINE */
      .monaco-editor .cursor {
        background-color: #ffffff !important;
      }
      
      .monaco-editor .current-line {
        background-color: #2d2d3020 !important;
      }
      
      .monaco-editor .line-numbers {
        color: #858585 !important;
      }
      
      /* SCROLLBAR */
      .monaco-editor .scrollbar {
        background-color: #1e1e1e !important;
      }
      
      /* FORCE SELECTION HIGHLIGHTING */
      .monaco-editor .selected-text {
        background-color: #0078d4 !important;
        color: #ffffff !important;
      }
      
      .monaco-editor .view-overlay {
        pointer-events: none;
      }
      
      /* ADDITIONAL FIXES */
      .monaco-editor .view-overlays .current-line {
        background-color: #2d2d3020 !important;
      }
      
      .monaco-editor .decorationsOverviewRuler {
        background-color: #1e1e1e !important;
      }
      
      .monaco-editor .monaco-scrollable-element .scrollbar {
        background-color: #1e1e1e !important;
      }
      
      .monaco-editor .monaco-scrollable-element .scrollbar .slider {
        background-color: #424242 !important;
      }
      
      .monaco-editor .monaco-scrollable-element .scrollbar .slider:hover {
        background-color: #4f4f4f !important;
      }
      
      .monaco-editor .monaco-scrollable-element .scrollbar .slider.active {
        background-color: #646464 !important;
      }
    `
    document.head.appendChild(style)
    
    // FORCE SELECTION COLORS VIA JAVASCRIPT
    const applySelectionColors = () => {
      const monacoElements = document.querySelectorAll('.monaco-editor .view-line span')
      monacoElements.forEach(el => {
        const element = el as HTMLElement
        element.style.setProperty('--selection-bg', '#0078d4', 'important')
        element.style.setProperty('--selection-color', '#ffffff', 'important')
      })
    }
    
    // Apply selection colors immediately and on mutations
    applySelectionColors()
    
    const observer = new MutationObserver(applySelectionColors)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    
    console.log('✅ Monaco Editor BULLETPROOF styles applied!')
    
    // Cleanup observer on unmount
    return () => {
      observer.disconnect()
    }
  }, [])
  
  // 🆕 NEW CONTENT HIGHLIGHTING - Disabled (no more underlines)
  const highlightNewContent = (oldContent: string, newContent: string) => {
    // No-op - underlines feature removed
    console.log('✅ Content updated (underlines disabled)')
  }

  // 🔍 DIFF ALGORITHM - Find new content ranges
  const findNewContentRanges = (oldContent: string, newContent: string): {start: number, end: number}[] => {
    const ranges: {start: number, end: number}[] = []
    
    // Simple approach: look for new phrases/sentences
    const oldWords = oldContent.toLowerCase().split(/[,\s]+/).filter(w => w.length > 2)
    const newWords = newContent.toLowerCase().split(/[,\s]+/).filter(w => w.length > 2)
    
    // Find words that exist in new but not in old
    const addedWords = newWords.filter(word => !oldWords.includes(word))
    
    console.log('🔍 Added words:', addedWords)
    
    if (addedWords.length === 0) return ranges

    // Find positions of these new words in the new content
    addedWords.forEach(word => {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      let match
      
      while ((match = regex.exec(newContent)) !== null) {
        // Expand to include surrounding context (whole phrase)
        let start = match.index
        let end = match.index + match[0].length
        
        // Expand backwards to catch context
        while (start > 0 && !/[.,;!?\n]/.test(newContent[start - 1])) {
          start--
        }
        
        // Expand forwards to catch context  
        while (end < newContent.length && !/[.,;!?\n]/.test(newContent[end])) {
          end++
        }
        
        // Skip if range overlaps with existing ranges
        const overlaps = ranges.some(r => 
          (start >= r.start && start <= r.end) || 
          (end >= r.start && end <= r.end) ||
          (start <= r.start && end >= r.end)
        )
        
        if (!overlaps) {
          ranges.push({ start, end })
        }
      }
    })
    
    return ranges.sort((a, b) => a.start - b.start)
  }

  // 🎨 APPLY NEW CONTENT DECORATIONS - Disabled (no more underlines)
  const updateDecorationsWithNewContent = (newRanges: {start: number, end: number}[]) => {
    // No-op - underlines feature removed
  }
  
  // FIXED: Insert text at cursor position with proper multi-line handling
  const insertTextAtCursor = (text: string) => {
    if (!editorRef.current) return
    
    const editor = editorRef.current
    const selection = editor.getSelection()
    
    // Get current position
    const position = selection?.getStartPosition() || { lineNumber: 1, column: 1 }
    
    // Clean and format the text for insertion
    const cleanedText = text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Handle old Mac line endings
      .trim()                  // Remove leading/trailing whitespace
    
    // Split into lines for proper multi-line handling
    const lines = cleanedText.split('\n')
    
    // Create the insertion edit
    const edits = [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      },
      text: cleanedText
    }]
    
    // Apply the edit
    editor.executeEdits('insert-text', edits)
    
    // Calculate new cursor position after insertion
    const newLineNumber = position.lineNumber + lines.length - 1
    const newColumn = lines.length > 1 ? lines[lines.length - 1].length + 1 : position.column + cleanedText.length
    
    // Set cursor position at the end of inserted text
    editor.setPosition({
      lineNumber: newLineNumber,
      column: newColumn
    })
    
    // Focus the editor
    editor.focus()
    
    // Update content state
    setContent(editor.getValue())
    
    console.log('✅ Text inserted successfully:', { text: cleanedText, lines: lines.length })
  }

  const createNewPrompt = async (folderId?: string) => {
    const created = await createDbPrompt({ type: 'image' })
    const newPrompt: Prompt = {
      id: created.id,
      title: created.title,
      content: created.content,
      type: created.type as any,
      tags: created.tags || [],
      is_favorite: false,
      usage_count: created.copy_count || 0,
      folder: folderId || 'all-prompts'
    }
    const updated = [...prompts, newPrompt]
    setPrompts(updated)
    setContent(created.content)
    setCurrentPrompt(newPrompt)
    setIsUnsaved(false)
    window.dispatchEvent(new CustomEvent('prompts-updated', { detail: { prompts: updated } }))
    window.dispatchEvent(new CustomEvent('prompt-created', { detail: { promptId: newPrompt.id } }))
    toast.success('Neuer Prompt erstellt!')
  }

  const openPrompt = (prompt: Prompt) => {
    setContent(prompt.content)
    setCurrentPrompt(prompt)
    setIsUnsaved(false)
    toast.success(`Prompt "${prompt.title}" geöffnet`)
  }

  const handleContentChange = async (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value)
      
      // Auto-save after each character
      if (currentPrompt) {
        const updatedPrompts = prompts.map(p => p.id === currentPrompt.id ? { ...p, content: value } : p)
        setPrompts(updatedPrompts)
        try { await updateDbPrompt(currentPrompt.id, { content: value }) } catch {}
        
        // Update current prompt
        setCurrentPrompt({ ...currentPrompt, content: value })
        
        // Trigger storage event for sidebar refresh
        window.dispatchEvent(new CustomEvent('prompts-updated', { detail: { prompts: updatedPrompts } }))
      }
      
      // Update suggestions based on current word
      const words = value.split(/\s+/)
      const lastWord = words[words.length - 1]?.toLowerCase() || ''
      
      if (lastWord.length >= 1) {
        // 1. Search existing prompts first
        const matchingPrompts = prompts.filter(prompt => 
          prompt.title.toLowerCase().includes(lastWord) ||
          prompt.title.toLowerCase().startsWith(lastWord)
        )
        
        // 2. Get regular suggestions
        const regularSuggestions = getSuggestionsForWord(lastWord)
        
        // 3. Combine both, with prompt names first
        const allSuggestions = [
          ...matchingPrompts.map(p => p.title),
          ...regularSuggestions
        ]
        
        setSuggestions(allSuggestions)
      } else {
        setSuggestions([])
      }
    } else {
      setSuggestions([])
    }
  }

  // HELPER FUNCTION - Get real selection from Monaco Editor
  const getRealSelection = () => {
    if (editorRef.current) {
      const editor = editorRef.current
      const selection = editor.getSelection()
      const selectedText = editor.getModel()?.getValueInRange(selection) || ''
      return { selectedText: selectedText.trim(), selection }
    }
    return { selectedText: '', selection: null }
  }

  // IMAGE ANALYSIS - Drag & Drop with Vision AI
  const analyzeImageWithVision = async (imageFile: File, mode: 'character' | 'style' | 'all' = 'all') => {
    setIsAnalyzingImage(true)
    try {
      // Convert image to base64
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          resolve(result.split(',')[1]) // Remove data:image/... prefix
        }
        reader.readAsDataURL(imageFile)
      })

      // Load settings and API key
      const allSettings = await storage.loadData('settings') || {}
      const actualApiKey = allSettings?.chatgpt?.apiKey || allSettings?.openaiApiKey || allSettings?.apiKey

      if (!actualApiKey) {
        toast.error('OpenAI API Key nicht gefunden! Bitte in den Einstellungen konfigurieren.')
        return
      }

      console.log('🖼️ Analyzing image with Vision AI... Mode:', mode)

      // Get prompt style and create appropriate prompt
      const visionSettings = allSettings
      const selectedModel = visionSettings?.vision_model || 'gpt-4o'
      
      const promptTemplates = {
        detailed: 'Create a detailed description of this image for use as an AI image generation prompt. Include:\n\n1. SUBJECT: Ultra-detailed description including:\n   - Age range and gender\n   - Facial features (eyes, nose, mouth, jawline, cheekbones)\n   - Skin texture and tone (smooth, weathered, pale, tanned, etc.)\n   - Hair (color, style, texture, length)\n   - Body build and posture\n   - Clothing details (materials, colors, fit, style)\n   - Expression and mood\n   - Any distinctive features or characteristics\n\n2. COMPOSITION: Camera angle, framing, shot type\n3. LIGHTING: Type, direction, mood, shadows, highlights\n4. STYLE: Artistic style, color palette, mood, atmosphere\n5. ENVIRONMENT: Background, setting, context\n\nMake it vivid, specific, and comprehensive - use 5-7 detailed sentences. Use //SUBJECT:, //COMPOSITION:, //LIGHTING:, //STYLE:, //ENVIRONMENT: as section headers instead of ** format.',
        person: 'Describe ONLY the person in ultra-detail for an AI image generation prompt. Do NOT mention the background, scene, or environment at all. Focus on:\n\n- PHYSICAL APPEARANCE: Exact age range, gender, ethnicity if apparent\n- FACIAL FEATURES: Eyes (color, shape, expression), eyebrows, nose shape, mouth, jawline, cheekbones\n- SKIN: Texture and tone; details like freckles, wrinkles, scars\n- HAIR: Color, style, texture (curly/straight/wavy), length, styling\n- BODY BUILD: Height impression, build (slim/muscular/average), posture\n- CLOTHING: Materials, colors, fit, style, textures/patterns\n- EXPRESSION & MOOD: Facial expression, emotions, body language\n- LIGHTING EFFECTS ON SKIN/HAIR: highlights, shadows\n\nUse 5-6 sentences. Use //PHYSICAL APPEARANCE:, //FACIAL FEATURES:, //SKIN:, //HAIR:, //BODY BUILD:, //CLOTHING:, //EXPRESSION & MOOD:, //LIGHTING EFFECTS: as headers. Do NOT describe any scene or environment.',
        style_only: 'Describe ONLY the artistic style and visual treatment of this image. Do NOT describe any subjects, characters, objects, or scene content. Focus strictly on:\n\n- ARTISTIC STYLE & TECHNIQUE: (painting style, digital art, photo aesthetics, film emulation, etc.)\n- COLOR PALETTE & MOOD: (warm/cool, saturation, contrast, tonal range)\n- TEXTURE & GRAIN: (film grain, brush strokes, surface qualities)\n- COMPOSITIONAL FEEL: (symmetry/asymmetry, negative space, depth cues)\n- POST-PROCESSING LOOK: (grading, halation, bloom, vignette)\n\nWrite 3-4 sentences. Use //STYLE:, //COLOR PALETTE:, //TEXTURE:, //COMPOSITIONAL FEEL:, //POST-PROCESSING: headers. Absolutely avoid mentioning what is depicted.',
      }

      const promptStyle: 'detailed' | 'person' | 'style_only' =
        mode === 'character' ? 'person' : mode === 'style' ? 'style_only' : 'detailed'

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${actualApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: promptStyle === 'person' || promptStyle === 'detailed' ? 
                'You are an expert at capturing visual style characteristics only. Never describe scene content, subjects, or objects; focus solely on style properties. Use // headers when applicable.' :
                'You are an expert at creating detailed, vivid descriptions for AI image generation prompts. Use section headers with // format instead of ** format when applicable. Focus on specific visual details that would help recreate the image.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptTemplates[promptStyle as keyof typeof promptTemplates]
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: promptStyle === 'style_only' ? 500 : (promptStyle === 'detailed' ? 1200 : 1100),
          temperature: promptStyle === 'style_only' ? 0.4 : 0.3
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const description = data.choices[0]?.message?.content?.trim()

      if (description) {
        // Add description to editor at exact cursor position
        if (editorRef.current && monacoRef.current) {
          const editor = editorRef.current
          const monaco = monacoRef.current
          
          // Use the saved cursor position from drag over, or fallback to current position
          const targetPosition = cursorPosition || editor.getPosition()
          
          // Smart text insertion with spacing
          const model = editor.getModel()
          const currentLine = model?.getLineContent(targetPosition.lineNumber) || ''
          const charBefore = currentLine[targetPosition.column - 2] || ''
          const charAfter = currentLine[targetPosition.column - 1] || ''
          
          // Add spacing if needed
          let textToInsert = description
          if (charBefore && charBefore !== ' ' && charBefore !== '\n') {
            textToInsert = ' ' + textToInsert
          }
          if (charAfter && charAfter !== ' ' && charAfter !== '\n') {
            textToInsert = textToInsert + ' '
          }
          
          editor.executeEdits('image-description', [{
            range: new monaco.Range(targetPosition.lineNumber, targetPosition.column, targetPosition.lineNumber, targetPosition.column),
            text: textToInsert
          }])
          
          // Position cursor after inserted text
          const newPosition = {
            lineNumber: targetPosition.lineNumber,
            column: targetPosition.column + textToInsert.length
          }
          editor.setPosition(newPosition)
          editor.focus()
          
          setIsUnsaved(true)
          setCursorPosition(null) // Reset saved position
        }
        toast.success(`Bild beschrieben! (${description.length} Zeichen)`)
      } else {
        toast.error('Keine Beschreibung erhalten')
      }

    } catch (error) {
      console.error('❌ Image analysis failed:', error)
      toast.error('Fehler beim Analysieren des Bildes')
    } finally {
      setIsAnalyzingImage(false)
    }
  }

  // DRAG & DROP HANDLERS - PRECISION POSITIONING WITH PREVIEW
  const dragCounterRef = useRef(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only set drag over on first enter
    dragCounterRef.current++
    
    if (dragCounterRef.current === 1) {
      setIsDragOver(true)
      
      // Create image preview for first drag enter
      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find(file => file.type.startsWith('image/'))
      
      if (imageFile) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setDragPreviewImage(e.target?.result as string)
        }
        reader.readAsDataURL(imageFile)
        console.log('🎯 DRAG STARTED - image preview loaded')
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only remove drag over when leaving all elements
    dragCounterRef.current--
    
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
      setDragPreviewImage(null)
      setCursorPosition(null)
      setMousePosition({x: 0, y: 0})
      console.log('🎯 DRAG ENDED - preview cleared')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Track mouse position for drag preview
    setMousePosition({ x: e.clientX, y: e.clientY })
    
    // Track mouse position and convert to editor position
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current
      
      // Use Monaco's precise position detection
      try {
        const target = editor.getTargetAtClientPoint(e.clientX, e.clientY)
        
        if (target && target.position) {
          setCursorPosition(target.position)
        }
      } catch (error) {
        // Ignore; keep last known position
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Reset drag state but keep cursor position for precise insertion
    dragCounterRef.current = 0
    setIsDragOver(false)
    setDragPreviewImage(null)
    console.log('🎯 DROPPED - analyzing at position:', cursorPosition)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      toast.error('Bitte nur Bilddateien drag & drop!')
      return
    }

    if (imageFiles.length > 1) {
      toast.error('Bitte nur ein Bild gleichzeitig!')
      return
    }

    const imageFile = imageFiles[0]
    console.log('🖼️ Image dropped:', imageFile.name, imageFile.type, `${(imageFile.size / 1024).toFixed(1)}KB`)
    // Ask user for analysis mode
    setPendingImageFile(imageFile)
    setShowImageModeModal(true)
  }

  // SHORTER FUNCTION - Make text shorter
  const handleMakeShorter = async () => {
    if (!content.trim()) {
      toast.error('Bitte geben Sie Text ein!')
      return
    }

    // Get real selection
    const { selectedText: actualSelectedText, selection } = getRealSelection()

    console.log(`📝 SHORTER DEBUG: actualSelectedText="${actualSelectedText}"`)

    setIsMakingShorter(true)
    try {
      if (actualSelectedText) {
        // Make selection shorter
        console.log(`✂️ MAKING SELECTION SHORTER: "${actualSelectedText.substring(0, 50)}..."`)
        const result = await chatGPTService.improveSelectedTextWithCustomPrompt(
          actualSelectedText, 
          content, 
          'Make this text much shorter and more concise while keeping the essential meaning. Remove unnecessary words and phrases.'
        )
        
        if (result.success && result.content) {
          if (editorRef.current && selection) {
            const editor = editorRef.current
            editor.executeEdits('make-shorter-selection', [{
              range: selection,
              text: result.content
            }])
            setIsUnsaved(true)
          }
          toast.success(`Auswahl gekürzt! ${actualSelectedText.length} → ${result.content.length} Zeichen`)
        } else {
          toast.error(result.error || 'Fehler beim Kürzen')
        }
      } else {
        // Make entire text shorter
        console.log(`✂️ MAKING ENTIRE TEXT SHORTER: ${content.length} characters`)
        const result = await chatGPTService.improveSelectedTextWithCustomPrompt(
          content, 
          '', 
          'Make this text much shorter and more concise while keeping the essential meaning. Remove unnecessary words and phrases.'
        )
      
      if (result.success && result.content) {
        setContent(result.content)
        setIsUnsaved(true)
          toast.success(`Text gekürzt! ${content.length} → ${result.content.length} Zeichen`)
      } else {
          toast.error(result.error || 'Fehler beim Kürzen')
        }
      }
    } catch (error) {
      toast.error('Fehler beim Kürzen des Texts')
    } finally {
      setIsMakingShorter(false)
    }
  }

  // CHATGPT INTEGRATION - INTELLIGENT ENHANCE FUNCTIONS
  const handleSmartEnhance = async () => {
    if (!content.trim()) {
      toast.error('Bitte geben Sie einen Prompt ein!')
      return
    }

    // Get REAL selection from Monaco Editor directly
    const { selectedText: actualSelectedText, selection } = getRealSelection()

    console.log(`🎯 ENHANCE DEBUG: actualSelectedText="${actualSelectedText}"`)
    console.log(`🎯 ENHANCE DEBUG: selectedText state="${selectedText}"`)

    // Smart detection: if text is ACTUALLY selected, enhance selection; otherwise enhance all
    if (actualSelectedText) {
      // Enhance selection
      console.log(`🔵 ENHANCING SELECTION: "${actualSelectedText.substring(0, 50)}..."`)
    setIsImprovingSelection(true)
    try {
        const result = await chatGPTService.improveSelectedText(actualSelectedText, content)
      
      if (result.success && result.content) {
        // Replace selected text with improved version
          if (editorRef.current && selection) {
          const editor = editorRef.current
          
            editor.executeEdits('smart-enhance-selection', [{
            range: selection,
            text: result.content
          }])
          setIsUnsaved(true)
        }
          toast.success(`Auswahl verbessert! (${actualSelectedText.length} Zeichen)`)
      } else {
        toast.error(result.error || 'Fehler beim Verbessern des Texts')
      }
    } catch (error) {
      toast.error('Fehler beim Verbessern des Texts')
    } finally {
      setIsImprovingSelection(false)
      }
    } else {
      // Enhance entire text
      console.log(`🌍 ENHANCING ENTIRE TEXT: ${content.length} characters`)
      setIsImprovingPrompt(true)
      try {
        const result = await chatGPTService.improvePrompt(content)
        
        if (result.success && result.content) {
          setContent(result.content)
          setIsUnsaved(true)
          toast.success('Gesamter Prompt verbessert!')
        } else {
          toast.error(result.error || 'Fehler beim Verbessern des Prompts')
        }
      } catch (error) {
        toast.error('Fehler beim Verbessern des Prompts')
      } finally {
        setIsImprovingPrompt(false)
      }
    }
  }

  const handleImprovePrompt = async () => {
    if (!content.trim()) {
      toast.error('Bitte geben Sie einen Prompt ein!')
      return
    }

    setIsImprovingPrompt(true)
    try {
      const result = await chatGPTService.improvePrompt(content)
      
      if (result.success && result.content) {
        setContent(result.content)
        setIsUnsaved(true)
        toast.success('Prompt verbessert!')
      } else {
        toast.error(result.error || 'Fehler beim Verbessern des Prompts')
      }
    } catch (error) {
      toast.error('Fehler beim Verbessern des Prompts')
    } finally {
      setIsImprovingPrompt(false)
    }
  }

  const handleImproveSelection = async () => {
    if (!selectedText.trim()) {
      toast.error('Bitte wählen Sie Text aus!')
      return
    }

    setIsImprovingSelection(true)
    try {
      const result = await chatGPTService.improveSelectedText(selectedText, content)
      
      if (result.success && result.content) {
        // Replace selected text with improved version
        if (editorRef.current) {
          const editor = editorRef.current
          const selection = editor.getSelection()
          
          editor.executeEdits('improve-selection', [{
            range: selection,
            text: result.content
          }])
          setIsUnsaved(true)
        }
        toast.success('Auswahl verbessert!')
      } else {
        toast.error(result.error || 'Fehler beim Verbessern des Texts')
      }
    } catch (error) {
      toast.error('Fehler beim Verbessern des Texts')
    } finally {
      setIsImprovingSelection(false)
    }
  }

  // ✨ BEAUTIFY FUNCTION - Sort and add comments
  const handleBeautify = async () => {
    if (!content.trim()) {
      toast.error('Bitte geben Sie Text ein!')
      return
    }

    setIsBeautifying(true)
    try {
      console.log('✨ BEAUTIFYING text...')
      const result = await chatGPTService.improveSelectedTextWithCustomPrompt(
        content,
        '',
        'Organize and beautify this prompt by:\n1. Sorting sections logically (Subject → Composition → Lighting → Style → etc.)\n2. Adding helpful comments with // to explain what each section does\n3. Keep all original content but make it well-structured and documented\n4. Use clear section headers like //SUBJECT:, //COMPOSITION:, //LIGHTING:, //STYLE: etc.'
      )
      
      if (result.success && result.content) {
        console.log('✨ Text beautified successfully')
        
        // Highlight the beautified content as new
        const oldContent = content
        const newContent = result.content
        setContent(newContent)
        
        // Persist to prompts if a prompt is active
        if (currentPrompt) {
          const updatedPrompts = prompts.map(p => p.id === currentPrompt.id ? { ...p, content: newContent } : p)
          setPrompts(updatedPrompts)
          try { await updateDbPrompt(currentPrompt.id, { content: newContent }) } catch {}
          window.dispatchEvent(new CustomEvent('prompts-updated', { detail: { prompts: updatedPrompts } }))
        }
        
        // Show underlines for new organization
        setTimeout(() => {
          highlightNewContent(oldContent, newContent)
        }, 100)
        
        toast.success('Text wurde sortiert und mit Kommentaren versehen! ✨')
      } else {
        console.error('Beautify failed:', result.error)
        toast.error(result.error || 'Fehler beim Beautify')
      }
    } catch (error) {
      console.error('Beautify error:', error)
      toast.error('Fehler beim Beautify')
    } finally {
      setIsBeautifying(false)
    }
  }

  // 📋 COPY FUNCTION - Copy prompt without comments
  const handleCopyWithoutComments = async () => {
    if (!content.trim()) {
      toast.error('Kein Text zum Kopieren vorhanden!')
      return
    }

    setIsCopying(true)
    try {
      // Filter out comment lines (lines starting with //)
      const lines = content.split('\n')
      const filteredLines = lines.filter(line => {
        const trimmedLine = line.trim()
        return trimmedLine.length > 0 && !trimmedLine.startsWith('//')
      })
      
      // Join back and clean up extra whitespace
      const cleanedText = filteredLines
        .join('\n')
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple empty lines with max 2
        .trim()

      if (!cleanedText) {
        toast.error('Nur Kommentare gefunden - nichts zu kopieren!')
        return
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(cleanedText)
      
      console.log('📋 Copied without comments:', cleanedText.substring(0, 100) + '...')
      toast.success(`Prompt ohne Kommentare kopiert! (${cleanedText.length} Zeichen) 📋`, {
        duration: 2000
      })

    } catch (error) {
      console.error('Copy error:', error)
      toast.error('Fehler beim Kopieren in die Zwischenablage')
    } finally {
      setIsCopying(false)
    }
  }

  // 📊 PROMPT SCORE FUNCTION - AI rates prompt 1-10
  const handleScorePrompt = async () => {
    if (!content.trim()) {
      toast.error('Kein Prompt zum Bewerten vorhanden!')
      return
    }

    setIsScoring(true)
    try {
      console.log('📊 SCORING prompt...')
      const result = await chatGPTService.improveSelectedTextWithCustomPrompt(
        content,
        '',
        `You are an expert at evaluating IMAGE GENERATION prompts for AI models like Midjourney, DALL-E, Stable Diffusion.

Evaluate this IMAGE PROMPT focusing ONLY on visual/photographic elements:

SCORE CRITERIA (1-10):
- Subject clarity and description (2 points)
- Technical camera/photography terms (2 points) 
- Lighting and atmosphere details (2 points)
- Style and aesthetic direction (2 points)
- Overall visual clarity and specificity (2 points)

SUGGESTIONS should focus ONLY on:
- Camera angles, lens types, focal length
- Lighting setup, mood, atmosphere
- Visual style, art direction, aesthetics
- Subject details, poses, expressions
- Composition, framing, perspective

DO NOT suggest story elements, emotions, narrative, or environmental interactions.

Format your response as:
SCORE: X/10
FEEDBACK: [Focus on visual/photographic strengths and weaknesses]
SUGGESTIONS:
- [Visual/technical improvement 1]
- [Visual/technical improvement 2]
- [Visual/technical improvement 3]

Image prompt to evaluate: "${content.substring(0, 500)}"`
      )
      
      if (result.success && result.content) {
        // Parse the AI response
        const response = result.content
        const scoreMatch = response.match(/SCORE:\s*(\d+)\/10/)
        const feedbackMatch = response.match(/FEEDBACK:\s*(.*?)(?=SUGGESTIONS:|$)/s)
        const suggestionsMatch = response.match(/SUGGESTIONS:\s*((?:- .*(?:\n|$))*)/s)
        
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 5
        const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'Keine Bewertung verfügbar'
        const suggestions = suggestionsMatch 
          ? suggestionsMatch[1].split('\n').filter(s => s.trim().startsWith('- ')).map(s => s.trim().substring(2))
          : ['Keine Vorschläge verfügbar']

        setPromptScore({ score, feedback, suggestions })
        setShowScoreModal(true)
        
        console.log('📊 Prompt scored:', { score, feedback, suggestions })
        toast.success(`Prompt bewertet: ${score}/10! 📊`)
      } else {
        toast.error(result.error || 'Fehler beim Bewerten des Prompts')
      }
           } catch (error) {
      console.error('Scoring error:', error)
      toast.error('Fehler beim Bewerten des Prompts')
    } finally {
      setIsScoring(false)
    }
  }

  // 🎯 SMART IMPROVE BASED ON SCORE SUGGESTIONS
  const handleImproveWithSuggestions = async () => {
    if (!promptScore || !content.trim()) {
      toast.error('Keine Verbesserungsvorschläge verfügbar!')
      return
    }

    // KEEP modal open to show loading, set improving state first
    setIsImprovingPrompt(true)
    
    try {
      console.log('🎯 IMPROVING & BEAUTIFYING with AI suggestions...')
      
      // Convert suggestions to comprehensive improvement + beautify prompt
      const improvementInstructions = `Improve and beautify this image generation prompt by doing ALL of the following:

STEP 1 - IMPLEMENT THESE SPECIFIC SUGGESTIONS:
${promptScore.suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}

STEP 2 - ORGANIZE AND BEAUTIFY THE STRUCTURE:
- Sort sections logically: //SUBJECT: → //COMPOSITION: → //LIGHTING: → //STYLE: → //CAMERA: → //QUALITY:
- Add helpful comments with // to explain what each section does
- Break into clear, readable paragraphs
- Use consistent formatting and spacing
- Add section headers like //SUBJECT:, //COMPOSITION:, //LIGHTING:, //STYLE: etc.

STEP 3 - ENHANCE VISUAL/PHOTOGRAPHIC ELEMENTS:
- Add specific camera/photography terms (focal length, aperture, etc.)
- Improve lighting and atmosphere descriptions  
- Enhance visual style and aesthetic direction
- Make subject details more specific and visual
- Add composition and framing details

Keep all original content but make it well-structured, documented, and visually enhanced.

Original prompt: "${content}"`

      const result = await chatGPTService.improveSelectedTextWithCustomPrompt(
        content,
        '',
        improvementInstructions
      )
      
      if (result.success && result.content) {
        console.log('🎯 Prompt improved & beautified with suggestions')
        
        // Highlight the improvements as new content
        const oldContent = content
        setContent(result.content)
        
        // Show underlines for improvements
        setTimeout(() => {
          highlightNewContent(oldContent, result.content)
        }, 100)
        
        toast.success(`Prompt verbessert & strukturiert basierend auf ${promptScore.suggestions.length} AI-Vorschlägen! ✨📝`, {
          duration: 3000
        })
        
        // Close modal after successful improvement
        setTimeout(() => {
          setShowScoreModal(false)
        }, 1000) // Small delay to show success

      } else {
        console.error('Smart improvement failed:', result.error)
        toast.error(result.error || 'Fehler bei der Verbesserung')
      }
    } catch (error) {
      console.error('Smart improvement error:', error)
      toast.error('Fehler bei der automatischen Verbesserung')
    } finally {
      setIsImprovingPrompt(false)
    }
  }



  // 🔍 PROMPT DEBUG FUNCTION - AI analyzes and finds issues
  const handleDebugPrompt = async () => {
    if (!debugQuery.trim()) {
      toast.error('Bitte geben Sie Ihre Frage ein!')
      return
    }

    if (!content.trim()) {
      toast.error('Kein Prompt zum Debuggen vorhanden!')
      return
    }

    setIsDebugging(true)
    try {
      console.log('🔍 DEBUGGING prompt with query:', debugQuery)
      
      const debugPrompt = `You are an expert prompt engineer and debugger. Analyze this image generation prompt and answer the user's specific question about it.

USER QUESTION: "${debugQuery}"

PROMPT TO ANALYZE:
"${content}"

Please provide a detailed analysis in this EXACT format:

PROBLEM: [Describe what specific issue you found related to the user's question]
LOCATION: [Quote the exact text from the prompt that causes this issue]
SOLUTION: [Explain how to fix this specific problem]
FIXED_PROMPT: [Provide the corrected version of the entire prompt with the fix applied]

Be very specific and focus on the user's question. If the question is about why something appears wrong in generated images, identify the prompt elements that could cause that issue.`

      const result = await chatGPTService.improveSelectedTextWithCustomPrompt(
        content,
        '',
        debugPrompt
      )
      
      if (result.success && result.content) {
        // Parse the AI response
        const response = result.content
        const problemMatch = response.match(/PROBLEM:\s*(.*?)(?=LOCATION:|$)/s)
        const locationMatch = response.match(/LOCATION:\s*(.*?)(?=SOLUTION:|$)/s)
        const solutionMatch = response.match(/SOLUTION:\s*(.*?)(?=FIXED_PROMPT:|$)/s)
        const fixedPromptMatch = response.match(/FIXED_PROMPT:\s*(.*?)$/s)
        
        const debugAnalysis = {
          problem: problemMatch ? problemMatch[1].trim() : 'Analyse nicht verfügbar',
          location: locationMatch ? locationMatch[1].trim() : 'Stelle nicht gefunden',
          solution: solutionMatch ? solutionMatch[1].trim() : 'Lösung nicht verfügbar',
          fixedPrompt: fixedPromptMatch ? fixedPromptMatch[1].trim() : content
        }

        setDebugResult(debugAnalysis)
        console.log('🔍 Debug analysis completed:', debugAnalysis)
        toast.success('Prompt-Analyse abgeschlossen! 🔍')
      } else {
        toast.error(result.error || 'Fehler bei der Prompt-Analyse')
      }
    } catch (error) {
      console.error('Debug error:', error)
      toast.error('Fehler bei der Prompt-Analyse')
    } finally {
      setIsDebugging(false)
    }
  }

  // 🛠️ APPLY DEBUG FIX
  const handleApplyDebugFix = () => {
    if (!debugResult?.fixedPrompt) {
      toast.error('Keine Korrektur verfügbar!')
      return
    }

    const oldContent = content
    setContent(debugResult.fixedPrompt)
    
    // Show what was changed
    setTimeout(() => {
      highlightNewContent(oldContent, debugResult.fixedPrompt)
    }, 100)
    
    setShowDebugModal(false)
    setDebugQuery('')
    setDebugResult(null)
    
    toast.success('Prompt wurde basierend auf der Analyse korrigiert! ✨')
  }

  // 🎨 SMART MODIFY FUNCTION - Intelligent prompt modification
  function buildSmartModifyInstruction(original: string, userRequest: string, mode: 'conservative' | 'creative'): string {
    if (mode === 'conservative') {
      return `You are a precise prompt editor. Modify the prompt according to the user's request while keeping everything else EXACTLY the same.

CRITICAL RULES:
- Make minimal, targeted changes only to address the request
- Preserve the same sections and order using // headers (e.g. //SUBJECT:, //COMPOSITION:, //LIGHTING:, //STYLE:, etc.)
- Keep the same wording wherever possible; do not rephrase unrelated parts
- Remove or replace ONLY elements that conflict with the requested change (e.g. if "close-up" is requested, adjust composition accordingly)
- Maintain tone, style, and technical specifics unless they clearly contradict the request

RETURN ONLY the modified prompt (no commentary).

USER REQUEST: "${userRequest}"

ORIGINAL PROMPT:
${original}`
    }
    // creative
    return `You are an expert prompt writer. Transform the prompt according to the user's request, allowing improvements while keeping strong parallels to the original.

GUIDELINES:
- Maintain the same sections using // headers (//SUBJECT:, //COMPOSITION:, //LIGHTING:, //STYLE:, etc.) and keep section intent intact
- Preserve subject identity, mood, core style direction, and key technical terms if still relevant (camera/lighting/composition tags)
- Keep at least 60% of unchanged wording where it does not conflict; reword only to clarify or to satisfy the request
- Remove or adjust contradictory elements introduced by the change (e.g., switch from extreme wide to close-up in composition and related phrases)
- Avoid generic rewriting; retain distinctive phrases, proper nouns, tags, and structure unless they clearly clash with the request

RETURN ONLY the final prompt (no commentary).

USER REQUEST: "${userRequest}"

ORIGINAL PROMPT:
${original}`
  }

  function buildSmartModifyInstructionForSelection(
    fullPrompt: string,
    selectedFragment: string,
    userRequest: string,
    mode: 'conservative' | 'creative'
  ): string {
    if (mode === 'conservative') {
      return `You are a precise text editor. The user selected a fragment inside a larger prompt.

TASK: Modify ONLY the selected fragment to satisfy the user's request. DO NOT change anything outside the fragment. Keep the fragment's format and style; change the minimum necessary.

STRICT RULES:
- Output ONLY the replacement text for the fragment (no preface, no postscript, no code fences)
- Keep headers/tags present INSIDE the fragment; do not invent new sections
- Do not duplicate the rest of the prompt and do not append extra content

USER REQUEST: "${userRequest}"

FULL PROMPT (context):
${fullPrompt}

SELECTED FRAGMENT (edit only this):
${selectedFragment}`
    }
    // creative
    return `You are a careful rewriter. The user selected a fragment inside a larger prompt.

TASK: Improve the selected fragment to satisfy the user's request while keeping strong parallels to the original fragment. Do NOT change anything outside the fragment.

GUIDELINES:
- Keep the fragment's role and style consistent with the full prompt
- Preserve distinctive phrases if still relevant; replace contradictory parts only
- Output ONLY the replacement text for the fragment (no commentary, no extra sections, no code fences)

USER REQUEST: "${userRequest}"

FULL PROMPT (context):
${fullPrompt}

SELECTED FRAGMENT (edit only this):
${selectedFragment}`
  }

  const handleSmartModify = async () => {
    if (!smartModifyQuery.trim()) {
      toast.error('Bitte geben Sie Ihre Änderungswünsche ein!')
      return
    }

    if (!content.trim()) {
      toast.error('Kein Prompt zum Bearbeiten vorhanden!')
      return
    }

    setIsSmartModifying(true)
    try {
      const { selectedText: actualSelectedText, selection } = getRealSelection()
      let targetText = actualSelectedText || content
      let instruction = ''
      if (actualSelectedText) {
        instruction = buildSmartModifyInstructionForSelection(content, actualSelectedText, smartModifyQuery, smartEditMode)
      } else {
        instruction = buildSmartModifyInstruction(content, smartModifyQuery, smartEditMode)
      }
      const result = await chatGPTService.improveSelectedTextWithCustomPrompt(targetText, '', instruction)

      if (result.success && result.content) {
        const oldContent = content
        const newContent = result.content.trim()
        if (actualSelectedText && editorRef.current && selection) {
          const editor = editorRef.current
          // Replace only the selected range
          editor.executeEdits('smart-modify-selection', [{ range: selection, text: newContent }])
          const whole = editor.getValue()
          setContent(whole)
          setIsUnsaved(true)
          setTimeout(() => {
            highlightNewContent(oldContent, whole)
          }, 100)
        } else {
          // No selection -> replace entire content
          setContent(newContent)
          setTimeout(() => {
            highlightNewContent(oldContent, newContent)
          }, 100)
        }

        setSmartModifyQuery('')

        console.log('🎨 Smart modification completed')
        toast.success('Prompt intelligent angepasst! ✨')
      } else {
        toast.error(result.error || 'Fehler bei der intelligenten Bearbeitung')
      }
    } catch (error) {
      console.error('Smart modify error:', error)
      toast.error('Fehler bei der intelligenten Bearbeitung')
    } finally {
      setIsSmartModifying(false)
    }
  }

  const handleGenerateVariations = async () => {
    if (!content.trim()) {
      toast.error('Bitte geben Sie einen Prompt ein!')
       return
    }
    
    setIsGeneratingVariations(true)
    try {
      console.log('🎲 GENERATING variations for:', content.substring(0, 50) + '...')
      
      const result = await chatGPTService.improveSelectedTextWithCustomPrompt(
        content,
        '',
        `Generate 3 creative variations of this image generation prompt. Keep the same overall concept but vary interesting details like lighting, style, composition, or mood. Each variation should be distinct and engaging.

Original prompt: "${content}"

Please provide exactly 3 variations as comments with descriptive titles:
// [descriptive title]: [variation]
// [descriptive title]: [variation] 
// [descriptive title]: [variation]

Make the titles descriptive (like "Golden Hour Version" or "Minimalist Take"). Each variation should be a complete prompt.`
      )
      
      if (result.success && result.content) {
        const variations = result.content.trim()
        const oldContent = content
        
        // Add variations as comments UNDER the original prompt
        const newContent = `${content}\n\n${variations}`
        
        setContent(newContent)
        setIsUnsaved(true)
        
        // Show what was added
        setTimeout(() => {
          highlightNewContent(oldContent, newContent)
        }, 100)
        
        console.log('🎲 Variations generated and appended as comments')
        toast.success('3 Variationen wurden als Kommentare hinzugefügt! 🎲✨')
      } else {
        toast.error(result.error || 'Fehler beim Generieren der Variationen')
      }
    } catch (error) {
      console.error('Variations generation error:', error)
      toast.error('Fehler beim Generieren der Variationen')
    } finally {
      setIsGeneratingVariations(false)
    }
  }

  const handleImproveSelectionWithCustomPrompt = async () => {
    if (!customPrompt.trim()) {
      toast.error('Bitte geben Sie einen Prompt ein!')
      return
    }

    // Get REAL selection from Monaco Editor directly
    const { selectedText: actualSelectedText, selection } = getRealSelection()

    console.log(`🎯 CUSTOM ENHANCE DEBUG: actualSelectedText="${actualSelectedText}"`)
    console.log(`🎯 CUSTOM ENHANCE DEBUG: selectedText state="${selectedText}"`)

    setIsImprovingWithCustomPrompt(true)
    try {
      // Smart detection: if text is ACTUALLY selected, enhance selection with custom prompt; otherwise enhance all with custom prompt
      if (actualSelectedText) {
        // Enhance selection with custom prompt
        console.log(`🟣 CUSTOM ENHANCING SELECTION: "${actualSelectedText.substring(0, 50)}..."`)
        const result = await chatGPTService.improveSelectedTextWithCustomPrompt(actualSelectedText, content, customPrompt)
      
      if (result.success && result.content) {
        // Replace selected text with improved version
          if (editorRef.current && selection) {
          const editor = editorRef.current
          
            editor.executeEdits('improve-selection-custom', [{
            range: selection,
            text: result.content
          }])
          setIsUnsaved(true)
        }
          toast.success(`Auswahl mit Custom Prompt verbessert! (${actualSelectedText.length} Zeichen)`)
        setShowCustomPromptModal(false)
        setCustomPrompt('')
      } else {
        toast.error(result.error || 'Fehler beim Verbessern des Texts')
        }
      } else {
        // Enhance entire text with custom prompt
        console.log(`🌍 CUSTOM ENHANCING ENTIRE TEXT: ${content.length} characters`)
        const result = await chatGPTService.improveSelectedTextWithCustomPrompt(content, '', customPrompt)
        
        if (result.success && result.content) {
          setContent(result.content)
          setIsUnsaved(true)
          toast.success('Gesamter Text mit Custom Prompt verbessert!')
          setShowCustomPromptModal(false)
          setCustomPrompt('')
        } else {
          toast.error(result.error || 'Fehler beim Verbessern des Prompts')
        }
      }
    } catch (error) {
      toast.error('Fehler beim Verbessern des Texts')
    } finally {
      setIsImprovingWithCustomPrompt(false)
    }
  }

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    createNewPrompt,
    openPrompt,
    insertTextAtCursor,
    getContent: () => content,
    setContent: (newContent: string) => {
      setContent(newContent)
      if (editorRef.current) {
        editorRef.current.setValue(newContent)
      }
    },
    highlightNewContent,
    getLiveSelectedText: getLiveSelectedText
  }))

  // Event handlers for Monaco editor
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Initialize status cursor from current position
    const initPos = editor.getPosition()
    if (initPos) setStatusCursor({ lineNumber: initPos.lineNumber, column: initPos.column })

    // Language registration for prompt highlighting
    monaco.languages.register({ id: 'prompt' })
    
    // 🎨 Custom dark theme
    monaco.editor.defineTheme('dark-theme-semantic', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'ffffff' }
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4'
      }
    })
    monaco.editor.setTheme('dark-theme-semantic')

    // 💡 CRITICAL SUCCESS FACTOR: High-specificity CSS injection
    console.log('✅ Monaco Editor BULLETPROOF styles applied!')

    // BULLETPROOF CSS with maximum specificity and TEXT COLORS
    const highlightStyle = document.createElement('style')
    highlightStyle.id = 'prompt-highlighting-styles'
    highlightStyle.textContent = `
      /* CHARACTER (Blue) - Text color with MAXIMUM specificity */
      .monaco-editor .view-line .character-highlight,
      .view-line .character-highlight,
      span.character-highlight,
      .monaco-editor div.view-line span.character-highlight,
      .monaco-editor .view-lines .view-line span.character-highlight,
      div.monaco-editor div.view-line span.character-highlight {
        color: #4FC3F7 !important; 
        font-weight: bold !important; 
        text-shadow: 0 0 1px #4FC3F7 !important;
      }
      
      /* MOTION (Yellow) - Text color with MAXIMUM specificity */
      .monaco-editor .view-line .motion-highlight,
      .view-line .motion-highlight,
      span.motion-highlight,
      .monaco-editor div.view-line span.motion-highlight,
      .monaco-editor .view-lines .view-line span.motion-highlight,
      div.monaco-editor div.view-line span.motion-highlight {
        color: #FFD54F !important; 
        font-weight: bold !important; 
        text-shadow: 0 0 1px #FFD54F !important;
      }
      
      /* ENVIRONMENT (Green) - Text color with MAXIMUM specificity */
      .monaco-editor .view-line .environment-highlight,
      .view-line .environment-highlight,
      span.environment-highlight,
      .monaco-editor div.view-line span.environment-highlight,
      .monaco-editor .view-lines .view-line span.environment-highlight,
      div.monaco-editor div.view-line span.environment-highlight {
        color: #81C784 !important; 
        font-weight: bold !important; 
        text-shadow: 0 0 1px #81C784 !important;
      }
      
      /* STYLE (Cyan) - Text color with MAXIMUM specificity */
      .monaco-editor .view-line .style-highlight,
      .view-line .style-highlight,
      span.style-highlight,
      .monaco-editor div.view-line span.style-highlight,
      .monaco-editor .view-lines .view-line span.style-highlight,
      div.monaco-editor div.view-line span.style-highlight {
        color: #4DD0E1 !important; 
        font-weight: bold !important; 
        text-shadow: 0 0 1px #4DD0E1 !important;
      }
      
      /* COLORS (Orange) - Text color with MAXIMUM specificity */
      .monaco-editor .view-line .colors-highlight,
      .view-line .colors-highlight,
      span.colors-highlight,
      .monaco-editor div.view-line span.colors-highlight,
      .monaco-editor .view-lines .view-line span.colors-highlight,
      div.monaco-editor div.view-line span.colors-highlight {
        color: #FF8A65 !important; 
        font-weight: bold !important; 
        text-shadow: 0 0 1px #FF8A65 !important;
      }
      
      /* Catch-all for any highlight class */
      [class*="-highlight"] {
        font-weight: bold !important; 
      }
      
      /* ULTRA HIGH SPECIFICITY FOR GRAMMAR HIGHLIGHTING */
      .monaco-editor .view-line .mtk1.noun-highlight,
      .monaco-editor .mtk1.noun-highlight { 
        color: #4FC3F7 !important; 
        font-weight: bold !important; 
        background: transparent !important;
      }
      .monaco-editor .view-line .mtk1.verb-highlight,
      .monaco-editor .mtk1.verb-highlight { 
        color: #FFD54F !important; 
        font-weight: bold !important; 
        background: transparent !important;
      }
      .monaco-editor .view-line .mtk1.adjective-highlight,
      .monaco-editor .mtk1.adjective-highlight { 
        color: #FF8A65 !important; 
        font-weight: bold !important; 
        background: transparent !important;
      }
      .monaco-editor .view-line .mtk1.preposition-highlight,
      .monaco-editor .mtk1.preposition-highlight { 
        color: #81C784 !important; 
        font-weight: bold !important; 
        background: transparent !important;
      }
             .monaco-editor .view-line .mtk1.pronoun-highlight,
       .monaco-editor .mtk1.pronoun-highlight { 
         color: #FFFFFF !important; 
         font-weight: normal !important; 
         background: transparent !important;
       }
             .monaco-editor .view-line .mtk1.article-highlight,
       .monaco-editor .mtk1.article-highlight { 
         color: #FFFFFF !important; 
         font-weight: normal !important; 
         background: transparent !important;
       }
       .monaco-editor .view-line .mtk1.conjunction-highlight,
       .monaco-editor .mtk1.conjunction-highlight { 
         color: #FFFFFF !important; 
         font-weight: normal !important; 
         background: transparent !important;
       }
      .monaco-editor .view-line .mtk1.adverb-highlight,
      .monaco-editor .mtk1.adverb-highlight { 
        color: #4DD0E1 !important; 
        font-weight: bold !important; 
        background: transparent !important;
      }
    `
    // Remove existing style if it exists
    const existingStyle = document.getElementById('prompt-highlighting-styles')
    if (existingStyle) {
      existingStyle.remove()
    }
    document.head.appendChild(highlightStyle)
    
    console.log('🎨 CSS styles added to document head')
    
    // Keep track of current decorations for updating
    let currentDecorations: string[] = []
    
    // 🚀 INSTANT REGEX-BASED HIGHLIGHTING - MILLISECOND PERFORMANCE!
    const updateDecorationsInstant = () => {
      const model = editor.getModel()
      if (!model) return
      
      const text = model.getValue()
      console.log('⚡ INSTANT highlighting for text:', text.length, 'characters')

      if (!text.trim()) {
        currentDecorations = editor.deltaDecorations(currentDecorations, [])
        return
      }
           
      try {
        // 🚀 INSTANT ANALYSIS - No waiting!
        const spans = instantHighlighter.highlight(text)
        console.log(`⚡ INSTANT analysis found ${spans.length} spans`)
        
        const decorations = spans.map((span) => {
          const startPos = model.getPositionAt(span.start)
          const endPos = model.getPositionAt(span.end)
          
          return {
            range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
            options: {
              inlineClassName: `${span.category}-highlight`,
              hoverMessage: { 
                value: `**${span.category.toUpperCase()}**: ${span.text}` 
              }
            }
          }
        })

        console.log(`🎨 Applying ${decorations.length} instant decorations`)
        currentDecorations = editor.deltaDecorations(currentDecorations, decorations)
        
        // Force better color application
        setTimeout(() => {
          const editorDOM = editor.getDomNode()
          if (editorDOM) {
            const highlightedElements = editorDOM.querySelectorAll('[class*="-highlight"]')
            console.log(`⚡ Applied colors to ${highlightedElements.length} elements`)
            
            highlightedElements.forEach((el: any) => {
              // Get the category from class name
              const classList = Array.from(el.classList) as string[]
              const highlightClass = classList.find(cls => cls.endsWith('-highlight'))
              
              if (highlightClass) {
                const category = highlightClass.replace('-highlight', '')
                const color = instantHighlighter.getCategoryColor(category)
                
                console.log(`🎨 Coloring ${category}: ${color}`)
                
                if (category === 'comment') {
                  // Special styling for comments - already handled by CSS
                  // The comment-highlight CSS class handles color, opacity, italic, etc.
                } else {
                  // Regular highlighting for other categories
                  el.style.setProperty('color', color, 'important')
                  el.style.setProperty('font-weight', 'bold', 'important')
                  el.style.setProperty('text-shadow', `0 0 1px ${color}80`, 'important')
                }
              }
            })
          }
        }, 50)

      } catch (error) {
        console.error('❌ Instant highlighting failed:', error)
        currentDecorations = editor.deltaDecorations(currentDecorations, [])
      }
    }
          // SMART DEBOUNCED HIGHLIGHTING
      let decorationTimeout: NodeJS.Timeout | null = null
      const updateDecorationsDebounced = () => {
        if (decorationTimeout) {
          clearTimeout(decorationTimeout)
        }
        decorationTimeout = setTimeout(() => {
          console.log('🔥 TRIGGERING INSTANT HIGHLIGHT')
          updateDecorationsInstant()
        }, 100) // Faster debounce for instant feel
      }
    
    editor.onDidChangeModelContent(() => {
      console.log('📝 Text changed - triggering highlighting')
      updateDecorationsDebounced()
    })

    // Also trigger on content changes from props
    editor.getModel()?.onDidChangeContent(() => {
      console.log('📝 Model content changed - triggering highlighting') 
      updateDecorationsDebounced()
    })
    
    // Set model language  
    const model = editor.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, 'prompt')
    }
    
    // Prevent duplicate registrations
    try {
      monaco.languages.registerCompletionItemProvider('prompt', {
        provideCompletionItems: () => ({
          suggestions: [
            {
              label: 'woman',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: 'woman',
              detail: 'Character'
            },
            {
              label: 'beautiful',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: 'beautiful',
              detail: 'Descriptor'
            },
            {
              label: 'walking',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: 'walking',
              detail: 'Action'
            },
            {
              label: 'park',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: 'park',
              detail: 'Environment'
            }
          ]
        })
      })
    } catch (e) {
      console.log('Autocomplete already registered')
    }
    
    // Initial decoration update
    setTimeout(() => {
      console.log('🎯 INITIAL HIGHLIGHTING')
      updateDecorationsInstant()
    }, 100)

    // Keep line/column in sync even after paste/undo/etc.
    editor.onDidChangeCursorPosition((e: any) => {
      setStatusCursor({ lineNumber: e.position.lineNumber, column: e.position.column })
    })
    editor.onDidChangeModelContent(() => {
      const pos = editor.getPosition()
      if (pos) setStatusCursor({ lineNumber: pos.lineNumber, column: pos.column })
    })

    // Normalize clipboard text on paste to keep real line breaks
    editor.onDidPaste((e: any) => {
      try {
        const original = e.text as string
        if (!original) return
        let fixed = original.replace(/\r\n?/g, '\n')

        // If the paste has no newlines but contains section markers, add them
        if (!fixed.includes('\n')) {
          fixed = fixed
            .replace(/\s*\/\/\s*SUBJECT:/gi, '\n//SUBJECT:')
            .replace(/\s*\/\/\s*COMPOSITION:/gi, '\n//COMPOSITION:')
            .replace(/\s*\/\/\s*LIGHTING:/gi, '\n//LIGHTING:')
            .replace(/\s*\/\/\s*STYLE:/gi, '\n//STYLE:')
            .replace(/\s*\/\/\s*ENVIRONMENT:/gi, '\n//ENVIRONMENT:')
        }

        // If we changed anything, replace the pasted range with fixed text
        if (fixed !== original) {
          editor.executeEdits('normalize-paste', [{ range: e.range, text: fixed }])
          // Move cursor to end of replacement
          const endPos = editor.getModel()?.modifyPosition(e.range.getStartPosition(), fixed.length)
          if (endPos) editor.setPosition(endPos)
        }
      } catch (_) {
        // ignore
      }
    })
 
    console.log('✅ Monaco Editor BULLETPROOF styles applied!')
  }

  // Monaco Editor configuration - FIXED WITH PROPER LANGUAGE
  const editorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
    fontSize: 14,
    automaticLayout: true,
    theme: 'dark-theme-semantic',
    language: 'prompt',  // CRITICAL: This must be set for semantic highlighting to work
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    selectOnLineNumbers: true,
    selectionHighlight: true,
    occurrencesHighlight: 'singleFile' as const,
    renderWhitespace: 'none' as const,
    renderControlCharacters: false,
    smoothScrolling: true,
    cursorBlinking: 'blink' as const,
    cursorStyle: 'line' as const,
    cursorWidth: 2,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontLigatures: true,
    // Use a fixed pixel lineHeight to keep Monaco's gutter and wrapping correct
    lineHeight: 22, 
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: true,
    formatOnPaste: true,
    formatOnType: true,
    mouseWheelZoom: true,
    contextmenu: true,
    copyWithSyntaxHighlighting: true,
    links: true,
    multiCursorModifier: 'alt' as const,
    multiCursorMergeOverlapping: true,
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'on' as const,
    suggestFontSize: 14,
    suggestLineHeight: 24,
    suggestSelection: 'first' as const,
    tabCompletion: 'on' as const,
    wordBasedSuggestions: 'matchingDocuments' as const,
    snippetSuggestions: 'top' as const,
    emptySelectionClipboard: true,
    useTabStops: true,
    matchBrackets: 'always' as const,
    autoClosingBrackets: 'always' as const,
    autoClosingOvertype: 'always' as const,
    autoClosingQuotes: 'always' as const,
    autoIndent: 'advanced' as const,
    autoSurround: 'brackets' as const,
    codeLens: false,
    colorDecorators: true,
    dragAndDrop: true,
    readOnly: false,
    renderLineHighlight: 'line' as const,
    renderFinalNewline: 'on' as const,
    renderValidationDecorations: 'editable' as const,
    folding: false,
    showFoldingControls: 'never' as const,
    showUnused: true,
    showDeprecated: true,
    bracketPairColorization: { enabled: false },
    hover: { enabled: true, delay: 300, sticky: true },
    find: { autoFindInSelection: 'never' as const },
    guides: { indentation: false, bracketPairs: false },
    // ENABLE semantic highlighting
    'semanticHighlighting.enabled': true
  }

  const computeShotMenuPosition = () => {
    const btn = shotButtonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const menuWidth = 260
    const gap = 8
    const bottomSpace = window.innerHeight - rect.bottom
    const topSpace = rect.top
    const placement: 'down' | 'up' = bottomSpace >= 240 || bottomSpace >= topSpace ? 'down' : 'up'
    let top: number
    if (placement === 'down') {
      top = rect.bottom + gap
    } else {
      // Try to show above; anchor so the menu stays within viewport
      const desiredHeight = Math.min(288, rect.top - 16)
      top = rect.top - gap - desiredHeight
    }
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))
    const maxHeight = placement === 'down' ? Math.min(288, window.innerHeight - top - 16) : Math.min(288, rect.top - 16)
    setShotMenuPos({ top, left, maxHeight, placement })
  }

  useEffect(() => {
    if (!shotMenuOpen) return
    computeShotMenuPosition()
    const onResize = () => computeShotMenuPosition()
    const onScroll = () => computeShotMenuPosition()
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (shotButtonRef.current?.contains(target)) return
      if (shotMenuRef.current?.contains(target)) return
      setShotMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [shotMenuOpen])

  return (
    <div className="h-full flex bg-slate-900 relative">
      {/* Main Editor Container */}
      <div className="h-full flex flex-col min-h-0 w-full overflow-y-auto">
        {/* Header */}
        <div className="h-12 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between px-4 backdrop-blur-xl" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-slate-100">
              {prompts.length === 0 && !currentPrompt ? 'Prompt IDE' : (currentPrompt ? currentPrompt.title : 'Neuer Prompt')}
            </h2>
            {(prompts.length > 0 || currentPrompt) ? (
              <span className="text-xs text-green-400">● Auto-gespeichert</span>
            ) : null}
          </div>
          
          {/* ENHANCE BUTTONS - CLEAR FUNCTIONALITY */}
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={handleSmartEnhance}
              disabled={isImprovingPrompt || isImprovingSelection || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600/40 bg-white/5 hover:bg-white/10 text-slate-200 text-xs disabled:opacity-50 transition-colors backdrop-blur-sm"
              title={selectedText.trim() ? "Enhance nur die Auswahl" : "Enhance ganzen Text"}
            >
              {(isImprovingPrompt || isImprovingSelection) ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>Enhance</span>
            </button>
            
            <button
              onClick={() => setShowCustomPromptModal(true)}
              disabled={isImprovingWithCustomPrompt || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600/40 bg-white/5 hover:bg-white/10 text-slate-200 text-xs disabled:opacity-50 transition-colors backdrop-blur-sm"
              title={getLiveSelectedText().trim() ? "Custom Enhance nur die Auswahl" : "Custom Enhance ganzen Text"}
            >
              {isImprovingWithCustomPrompt ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              <span>Custom</span>
            </button>
            
            <button
              onClick={handleMakeShorter}
              disabled={isMakingShorter || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600/40 bg-white/5 hover:bg-white/10 text-slate-200 text-xs disabled:opacity-50 transition-colors backdrop-blur-sm"
              title={selectedText.trim() ? "Auswahl kürzen" : "Ganzen Text kürzen"}
            >
              {isMakingShorter ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span className="text-xs font-bold">✂️</span>
              )}
              <span>Shorter</span>
            </button>
            
            <button
              onClick={handleGenerateVariations}
              disabled={isGeneratingVariations || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600/40 bg-white/5 hover:bg-white/10 text-slate-200 text-xs disabled:opacity-50 transition-colors backdrop-blur-sm"
              title="Variations generieren"
            >
              {isGeneratingVariations ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Shuffle className="w-3 h-3" />
              )}
              <span>Variations</span>
            </button>
            
            <button
              onClick={handleBeautify}
              disabled={isBeautifying || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600/40 bg-white/5 hover:bg-white/10 text-slate-200 text-xs disabled:opacity-50 transition-colors backdrop-blur-sm"
              title="Text sortieren und mit Kommentaren versehen"
            >
              {isBeautifying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span className="text-xs">✨</span>
              )}
              <span>Beautify</span>
            </button>
            
            <button
              onClick={handleScorePrompt}
              disabled={isScoring || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600/40 bg-white/5 hover:bg-white/10 text-slate-200 text-xs disabled:opacity-50 transition-colors backdrop-blur-sm"
              title="Prompt von KI bewerten lassen (1-10)"
            >
              {isScoring ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <BarChart3 className="w-3 h-3" />
              )}
              <span>Score</span>
            </button>
            
            <button
              onClick={() => setShowDebugModal(true)}
              disabled={!content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600/40 bg-white/5 hover:bg-white/10 text-slate-200 text-xs disabled:opacity-50 transition-colors backdrop-blur-sm"
              title="Prompt debuggen und Probleme finden"
            >
              <Search className="w-3 h-3" />
              <span>Debug</span>
            </button>
            
          </div>
        </div>

        {/* Editor with Drag & Drop */}
        <div 
          className={`flex-1 overflow-hidden relative ${isDragOver ? 'ring-4 ring-blue-500 ring-opacity-50' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Preview with Precise Positioning */}
          {isDragOver && (
            <>
              <div className="absolute inset-0 bg-blue-600 bg-opacity-10 backdrop-blur-[2px] z-40 pointer-events-none">
                {/* Precise Drop Position Indicator - Cross Hair */}
                {cursorPosition && editorRef.current && (() => {
                  const pos = editorRef.current.getScrolledVisiblePosition(cursorPosition)
                  if (!pos) return null
                  const left = pos.left + 8 // slight offset
                  const top = pos.top + 6
                  return (
                  <div className="absolute" style={{ left, top, zIndex: 41 }}>
                    {/* Vertical cursor line */}
                    <div className="w-0.5 h-6 bg-blue-500/80" />
                    {/* Position tag */}
                    <div className="mt-1 px-1 py-0.5 text-[10px] bg-blue-600 text-white rounded shadow">
                      L{cursorPosition.lineNumber}:C{cursorPosition.column}
                    </div>
                  </div>)
                })()}
              </div>
              
              {/* Drag Preview - follows mouse cursor */}
              {dragPreviewImage && (
                <div 
                  className="fixed z-50 pointer-events-none"
                  style={{
                    left: `${mousePosition.x + 15}px`,
                    top: `${mousePosition.y - 30}px`,
                    transform: 'translateY(-100%)'
                  }}
                >
                  <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border-2 border-blue-400 p-2 max-w-xs">
                    <div className="flex items-center gap-2">
                      <img 
                        src={dragPreviewImage} 
                        alt="Drag Preview" 
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="text-xs flex-1 min-w-0">
                        <div className="font-bold text-blue-600 flex items-center gap-1">
                          🖼️ <span className="truncate">GPT-4o Vision</span>
                        </div>
                        <div className="text-gray-600 truncate">Auto-Beschreibung</div>
                        {cursorPosition && (
                          <div className="text-xs text-emerald-600 font-mono mt-1">
                            L{cursorPosition.lineNumber}:C{cursorPosition.column}
                          </div>
                        )}
                      </div>
                      <div className="text-blue-500 text-lg">📍</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Helper Text */}
              <div className="absolute top-4 right-4 z-50 pointer-events-none">
                <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
                  <div className="font-bold">🎯 Präzises Drag & Drop</div>
                  <div className="text-xs opacity-80">Ziehe an die exakte Position im Text</div>
                </div>
              </div>
            </>
          )}
          
          {/* Image Analysis Loading */}
          {isAnalyzingImage && (
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-40">
              <div className="text-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                <div className="text-lg font-bold mb-2">🤖 GPT-4o Vision Analyse...</div>
                <div className="text-sm opacity-80">Bild wird beschrieben...</div>
              </div>
            </div>
          )}
          
          {!currentPrompt ? (
             <div className="flex flex-col items-center justify-center h-full p-8 text-center">
               <div className="max-w-md floating-card p-6">
                 <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                   <Sparkles className="w-8 h-8 text-white" />
                 </div>
                 <h3 className="text-xl font-semibold text-slate-100 mb-2">
                   Kein Prompt ausgewählt
                 </h3>
                 <p className="text-slate-300 mb-6">
                   {prompts.length === 0
                     ? 'Klicke links auf „Neuer Prompt" um einen neuen Prompt zu erstellen.'
                     : 'Wähle links einen Prompt aus oder klicke auf „Neuer Prompt", um einen neuen zu erstellen.'}
                 </p>
                 <div className="text-sm text-slate-400 mt-4 border-t border-slate-700/60 pt-4">
                   🎯 <strong>Tipp:</strong> Du kannst Inhalte jederzeit per Drag & Drop hinzufügen.
                 </div>
               </div>
             </div>
           ) : (
             <div className="h-full flex flex-col">
              {/* Monaco Editor - Upper Part (Larger) */}
              <div className="flex-1 min-h-0 relative bg-slate-900/80 border-b border-slate-700/60 backdrop-blur">
                <Editor
                  value={content}
                  onChange={handleContentChange}
                  onMount={handleEditorDidMount}
                  language="prompt"
                  theme="dark-theme-semantic"
                  options={editorOptions}
                  loading={<div className="flex items-center justify-center h-full text-white">Loading editor...</div>}
                />
                
                {/* 📋 Floating Copy Button - Bottom Right */}
                {content.trim() && (
                  <button
                    onClick={handleCopyWithoutComments}
                    disabled={isCopying}
                    className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-50 text-white text-sm rounded-lg shadow-xl border border-emerald-400 transition-all duration-200 hover:scale-105 font-medium backdrop-blur-sm"
                    title="Prompt ohne Kommentare kopieren"
                  >
                    {isCopying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-emerald-100">Copying...</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Clean</span>
                      </>
                    )}
                  </button>
                )}

                {/* Image Mode Modal */}
                {showImageModeModal && pendingImageFile && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
                    <div className="floating-card p-5 w-[420px]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-base font-semibold text-slate-100">Bild analysieren – Was soll beschrieben werden?</div>
                        <button
                          onClick={() => { setShowImageModeModal(false); setPendingImageFile(null) }}
                          className="p-1 rounded hover:bg-slate-700/60 text-slate-300"
                          title="Abbrechen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          className="w-full p-3 rounded-lg border border-slate-600/60 hover:bg-slate-700/40 text-left"
                          onClick={async () => {
                            const f = pendingImageFile
                            setShowImageModeModal(false)
                            setPendingImageFile(null)
                            if (f) await analyzeImageWithVision(f, 'character')
                          }}
                        >
                          <div className="font-medium text-slate-100">Nur der Character</div>
                          <div className="text-xs text-slate-400">Aussehen, Kleidung, Alter, Haut, Haare, Merkmale. Keine Szene.</div>
                        </button>
                        <button
                          className="w-full p-3 rounded-lg border border-slate-600/60 hover:bg-slate-700/40 text-left"
                          onClick={async () => {
                            const f = pendingImageFile
                            setShowImageModeModal(false)
                            setPendingImageFile(null)
                            if (f) await analyzeImageWithVision(f, 'style')
                          }}
                        >
                          <div className="font-medium text-slate-100">Nur der Style</div>
                          <div className="text-xs text-slate-400">Nur Stil, Farbpalette, Textur, Komposition, Grading. Keine Inhalte.</div>
                        </button>
                        <button
                          className="w-full p-3 rounded-lg border border-slate-600/60 hover:bg-slate-700/40 text-left"
                          onClick={async () => {
                            const f = pendingImageFile
                            setShowImageModeModal(false)
                            setPendingImageFile(null)
                            if (f) await analyzeImageWithVision(f, 'all')
                          }}
                        >
                          <div className="font-medium text-slate-100">Alles</div>
                          <div className="text-xs text-slate-400">Subjekt, Komposition, Licht, Stil und Umgebung.</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 🎨 SMART EDIT PANEL - Better Positioned */}
              <div className="bg-slate-800/80 border-t border-slate-600/60 backdrop-blur">
                {/* Smart Edit Header */}
                <div className="h-10 bg-slate-700/60 border-b border-slate-600/60 flex items-center justify-between px-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-purple-400" />
                    Smart Edit
                  </h3>
                  <div className="flex items-center gap-2">
                    {isSmartModifying && (
                      <div className="flex items-center gap-2 text-xs text-purple-300">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>KI arbeitet...</span>
                      </div>
                    )}
                    {/* Shots dropdown */}
                    <div className="relative hidden sm:block mr-2">
                      <button
                        ref={shotButtonRef}
                        onClick={() => setShotMenuOpen(prev => {
                          const next = !prev
                          if (next) computeShotMenuPosition()
                          return next
                        })}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md border border-slate-600/60 hover:bg-slate-800/70 active:bg-slate-800/90"
                        title="Shot-Varianten"
                      >
                        <FilmIcon className="w-3 h-3" />
                        <span>Shots</span>
                        {isGeneratingShots && <Loader2 className="w-3 h-3 animate-spin text-slate-300 ml-1" />}
                      </button>
                    </div>
                    {shotMenuOpen && shotMenuPos && createPortal(
                      <div
                        ref={shotMenuRef}
                        style={{ position: 'fixed', top: shotMenuPos.top, left: shotMenuPos.left, maxHeight: shotMenuPos.maxHeight, width: 260, zIndex: 1000 }}
                        className="rounded-md border border-slate-600/60 bg-slate-800/95 shadow-lg py-1 overflow-y-auto"
                      >
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-400">Framing</div>
                        {shotVariants.filter(v => ['extreme_closeup','closeup','medium_closeup','medium','medium_long','long','wide','extreme_wide'].includes(v.id)).map(v => (
                          <button
                            key={v.id}
                            onClick={async () => { setShotMenuOpen(false); await handleGenerateSingleShot(v.id) }}
                            disabled={isGeneratingShots}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700/60 disabled:opacity-50"
                          >{v.label}</button>
                        ))}
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-400">Angles / Camera</div>
                        {shotVariants.filter(v => ['topshot','highangle','lowangle','dutch','droneshot','orbit'].includes(v.id)).map(v => (
                          <button
                            key={v.id}
                            onClick={async () => { setShotMenuOpen(false); await handleGenerateSingleShot(v.id) }}
                            disabled={isGeneratingShots}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700/60 disabled:opacity-50"
                          >{v.label}</button>
                        ))}
                      </div>,
                      document.body
                    )}
                    <button
                      onClick={() => setSmartModifyQuery('')}
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                      title="Eingabe löschen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Smart Edit Content */}
                <div className="p-3 flex flex-col">
                  {/* Main Input */}
                  <div className="flex gap-2">
                    <textarea
                      value={smartModifyQuery}
                      onChange={(e) => setSmartModifyQuery(e.target.value)}
                      placeholder={smartEditMode === 'conservative' 
                        ? "z.B. 'mach daraus eine Nahaufnahme / Close-up' (alles andere beibehalten)"
                        : "z.B. 'mach daraus eine Nahaufnahme / Close-up und modernisiere Stil & Licht'"}
                      className="flex-1 h-20 px-3 py-2 bg-slate-700/60 border border-slate-600/60 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          handleSmartModify()
                        }
                      }}
                    />
                    <button
                      onClick={handleSmartModify}
                      disabled={isSmartModifying || !smartModifyQuery.trim() || !content.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white rounded-md transition-colors text-sm h-fit self-end"
                    >
                      {isSmartModifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Edit3 className="w-4 h-4" />
                      )}
                      {isSmartModifying ? 'Arbeitet...' : 'Anwenden'}
                    </button>
                  </div>

                  {/* Keyboard Shortcut Hint */}
                  <div className="text-xs text-slate-400 text-center mt-2">
                    💡 <kbd className="px-1 py-0.5 bg-slate-600 rounded">⌘ + Enter</kbd> zum schnellen Anwenden
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Prompt Modal */}
        {showCustomPromptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-96 max-w-[90vw]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100">Custom Enhance</h3>
                <button
                  onClick={() => setShowCustomPromptModal(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="bg-slate-700 rounded-md p-3 mb-3">
                  <div className="text-sm text-slate-300 mb-1">
                    {(() => {
                      const liveSelectedText = getLiveSelectedText()
                      
                      return liveSelectedText.trim() ? (
                        <div>
                          <span className="text-blue-400">🎯 Markierter Text:</span>
                          <div className="text-xs text-slate-100 mt-2 p-2 bg-slate-800 rounded border-l-2 border-blue-400 max-h-32 overflow-y-auto">
                            "{liveSelectedText}"
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-green-400">🌍 Modus:</span> Gesamter Text wird verbessert
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ihr Custom Prompt:
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="z.B. 'Mache den Text kreativer und lebendiger'"
                  className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCustomPromptModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleImproveSelectionWithCustomPrompt}
                  disabled={isImprovingWithCustomPrompt || !customPrompt.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-md transition-colors"
                >
                  {isImprovingWithCustomPrompt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  {getLiveSelectedText().trim() ? 'Auswahl enhancen' : 'Ganzen Text enhancen'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📊 SCORE MODAL */}
        {showScoreModal && promptScore && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-[500px] max-w-[90vw] max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  Prompt Score
                </h3>
                <button
                  onClick={() => setShowScoreModal(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
          </div>
              
              {/* Score Display */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-3">
                  <span className="text-3xl font-bold text-white">
                    {promptScore.score}
                  </span>
                </div>
                <div className="text-lg text-slate-300">
                  <span className="text-amber-400 font-semibold">{promptScore.score}/10</span> - {
                    promptScore.score >= 8 ? '🌟 Excellent' :
                    promptScore.score >= 6 ? '👍 Good' :
                    promptScore.score >= 4 ? '⚠️ Needs Work' :
                    '❌ Poor'
                  }
                </div>
              </div>

              {/* Feedback */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  💬 Feedback
                </h4>
                <div className="bg-slate-700 rounded-lg p-4 text-sm text-slate-300 leading-relaxed">
                  {promptScore.feedback}
                </div>
              </div>

              {/* Suggestions */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  💡 Verbesserungsvorschläge
                </h4>
                <div className="space-y-2">
                  {promptScore.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                      <span className="text-amber-400 font-bold text-sm">{index + 1}.</span>
                      <span className="text-sm text-slate-300 flex-1">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowScoreModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Schließen
                </button>
                <button
                  onClick={handleImproveWithSuggestions}
                  disabled={isImprovingPrompt || !content.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-md transition-colors"
                >
                  {isImprovingPrompt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isImprovingPrompt ? 'Verbessere & strukturiere...' : 'Jetzt verbessern & strukturieren'}
                </button>
              </div>
            </div>
          </div>
               )}

        {/* 🔍 DEBUG MODAL */}
        {showDebugModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-[600px] max-w-[90vw] max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                  <Search className="w-5 h-5 text-teal-400" />
                  Prompt Debugger
                </h3>
                <button
                  onClick={() => {
                    setShowDebugModal(false)
                    setDebugQuery('')
                    setDebugResult(null)
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {!debugResult ? (
                // Debug Query Input
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Was ist das Problem mit Ihrem Prompt?
                    </label>
                    <textarea
                      value={debugQuery}
                      onChange={(e) => setDebugQuery(e.target.value)}
                      placeholder="z.B. 'Warum ist die Jeans immer dreckig vom Hauptdarsteller?' oder 'Warum sehen die Augen immer komisch aus?'"
                      className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                      💡 Beispiel-Fragen
                    </h4>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>• "Warum sind die Haare immer unscharf?"</div>
                      <div>• "Warum sieht das Gesicht plastisch aus?"</div>
                      <div>• "Warum sind die Farben immer zu dunkel?"</div>
                      <div>• "Warum ist der Hintergrund immer unscharf?"</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowDebugModal(false)
                        setDebugQuery('')
                      }}
                      className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleDebugPrompt}
                      disabled={isDebugging || !debugQuery.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:opacity-50 text-white rounded-md transition-colors"
                    >
                      {isDebugging ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      {isDebugging ? 'Analysiere...' : 'Prompt analysieren'}
                    </button>
                  </div>
                </div>
              ) : (
                // Debug Results
                <div className="space-y-6">
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                      🚨 Problem gefunden
                    </h4>
                    <p className="text-sm text-slate-300">{debugResult.problem}</p>
                  </div>

                  <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                      📍 Problematische Stelle
                    </h4>
                    <div className="text-sm text-slate-300 font-mono bg-slate-800 p-2 rounded border-l-2 border-orange-400">
                      "{debugResult.location}"
                    </div>
                  </div>

                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                      💡 Lösung
                    </h4>
                    <p className="text-sm text-slate-300">{debugResult.solution}</p>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      ✨ Korrigierter Prompt
                    </h4>
                    <div className="text-sm text-slate-300 bg-slate-800 p-3 rounded max-h-32 overflow-y-auto">
                      {debugResult.fixedPrompt}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setDebugResult(null)
                        setDebugQuery('')
                      }}
                      className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      Neue Analyse
                    </button>
                    <button
                      onClick={handleApplyDebugFix}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                    >
                      <Wand2 className="w-4 h-4" />
                      Jetzt reparieren
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtle Status Bar - Redesigned */}
        <div className="h-6 bg-slate-900/50 border-t border-slate-700/30 flex items-center justify-between px-3 text-xs text-slate-500 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="opacity-60">{content.length} chars</span>
            <span className="opacity-60">Ln {statusCursor.lineNumber}, Col {statusCursor.column}</span>
            {(() => {
              const liveSelected = getLiveSelectedText()
              return liveSelected && <span className="text-blue-400/70">Selected: {liveSelected.length}</span>
            })()}
            <span className="text-green-400/60">⚡ {instantHighlighter.getStats().totalKeywords}+ keywords</span>
            <span className="opacity-40">|</span>
            <span className="text-blue-400/60">Model: GPT‑5</span>
            <div className="flex items-center gap-1 ml-4">
              <button 
                onClick={() => {
                  const text = content || "A cinematic portrait // SUBJECT: beautiful woman with golden hour lighting"
                  console.log(instantHighlighter.debugHighlight(text))
                  toast.success("🔍 Debug output")
                }}
                className="px-1 py-0.5 bg-slate-700/30 hover:bg-slate-600/50 rounded text-xs opacity-70 hover:opacity-100 transition-all"
                title="Debug highlighting"
              >
                🔍
              </button>
              <select
                className="px-1 py-0.5 bg-slate-700/30 border border-slate-600/30 rounded text-xs opacity-70 hover:opacity-100 transition-all focus:opacity-100"
                onChange={async (e) => {
                  const settings = await storage.loadData('settings') || {}
                  settings.vision_model = e.target.value
                  await storage.saveData('settings', settings)
                  setVisionModel(e.target.value)
                  toast.success(`Model: ${e.target.value}`)
                }}
                value={visionModel}
                title="Vision model"
              >
                <option value="gpt-4o">4o</option>
                <option value="gpt-4o-mini">4o-mini</option>
                <option value="gpt-4-turbo">4-turbo</option>
              </select>
              <select
                className="px-1 py-0.5 bg-slate-700/30 border border-slate-600/30 rounded text-xs opacity-70 hover:opacity-100 transition-all focus:opacity-100"
                onChange={async (e) => {
                  const settings = await storage.loadData('settings') || {}
                  settings.vision_prompt_style = e.target.value
                  await storage.saveData('settings', settings)
                  setVisionPromptStyle(e.target.value)
                  toast.success(`Style: ${e.target.value}`)
                }}
                value={visionPromptStyle}
                title="Prompt style"
              >
                <option value="detailed">Detailed</option>
                <option value="person">Person</option>
                <option value="artistic">Artistic</option>
                <option value="photography">Photo</option>
                <option value="concise">Concise</option>
              </select>
            </div>
            {isAnalyzingImage && (
              <div className="flex items-center space-x-1 text-blue-400/70 ml-4">
                <div className="animate-spin rounded-full h-2 w-2 border border-blue-400/70 border-t-transparent"></div>
                <span className="text-xs">Analyzing...</span>
              </div>
            )}
            {isMakingShorter && (
              <div className="flex items-center space-x-1 text-orange-400/70 ml-4">
                <div className="animate-spin rounded-full h-2 w-2 border border-orange-400/70 border-t-transparent"></div>
                <span className="text-xs">Shortening...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 opacity-60">
            <span>{prompts.length} prompts</span>
            {currentPrompt && <span>{currentPrompt.usage_count} uses</span>}
          </div>
        </div>
      </div>
    </div>
  )
});
 
EditorArea.displayName = 'EditorArea'

