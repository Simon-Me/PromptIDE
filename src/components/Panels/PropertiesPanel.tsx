import React, { useState } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Settings, 
  Palette, 
  Camera, 
  Lightbulb,
  Monitor,
  Sliders,
  ChevronLeft
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface PropertiesPanelProps {}

interface PropertySection {
  id: string
  title: string
  icon: React.ComponentType<any>
  items: PropertyItem[]
}

interface PropertyItem {
  id: string
  label: string
  type: 'text' | 'select' | 'slider' | 'toggle' | 'color'
  value?: any
  options?: string[]
  min?: number
  max?: number
  step?: number
}

const propertySections: PropertySection[] = [
  {
    id: 'basic',
    title: 'Grundeinstellungen',
    icon: Settings,
    items: [
      { id: 'type', label: 'Prompt-Typ', type: 'select', value: 'image', options: ['image', 'video', 'text'] },
      { id: 'model', label: 'AI-Modell', type: 'select', value: 'midjourney', options: ['midjourney', 'dalle3', 'stable-diffusion', 'runway-ml', 'pika-labs'] },
      { id: 'quality', label: 'Qualität', type: 'select', value: 'high', options: ['low', 'medium', 'high', 'ultra'] }
    ]
  },
  {
    id: 'style',
    title: 'Stil & Optik',
    icon: Palette,
    items: [
      { id: 'style', label: 'Kunstrichtung', type: 'select', value: 'photorealistic', options: ['photorealistic', 'cinematic', 'anime', 'oil-painting', 'watercolor', 'digital-art', 'concept-art'] },
      { id: 'mood', label: 'Stimmung', type: 'select', value: 'neutral', options: ['happy', 'dramatic', 'mysterious', 'romantic', 'energetic', 'calm', 'dark', 'bright'] },
      { id: 'color-palette', label: 'Farbpalette', type: 'select', value: 'natural', options: ['natural', 'vibrant', 'muted', 'monochrome', 'warm', 'cool', 'neon'] }
    ]
  },
  {
    id: 'camera',
    title: 'Kamera & Komposition',
    icon: Camera,
    items: [
      { id: 'shot-type', label: 'Aufnahmetyp', type: 'select', value: 'medium-shot', options: ['extreme-wide', 'wide', 'medium', 'close-up', 'extreme-close-up', 'portrait', 'landscape'] },
      { id: 'angle', label: 'Kamerawinkel', type: 'select', value: 'eye-level', options: ['eye-level', 'low-angle', 'high-angle', 'dutch-angle', 'aerial', 'worms-eye'] },
      { id: 'lens', label: 'Objektiv', type: 'select', value: '50mm', options: ['14mm', '24mm', '35mm', '50mm', '85mm', '135mm', '200mm'] }
    ]
  },
  {
    id: 'lighting',
    title: 'Beleuchtung',
    icon: Lightbulb,
    items: [
      { id: 'lighting-type', label: 'Beleuchtungsart', type: 'select', value: 'natural', options: ['natural', 'studio', 'cinematic', 'dramatic', 'soft', 'hard', 'backlit', 'rim-light'] },
      { id: 'time-of-day', label: 'Tageszeit', type: 'select', value: 'midday', options: ['dawn', 'morning', 'midday', 'afternoon', 'golden-hour', 'twilight', 'night'] },
      { id: 'contrast', label: 'Kontrast', type: 'slider', value: 50, min: 0, max: 100, step: 5 }
    ]
  },
  {
    id: 'technical',
    title: 'Technische Parameter',
    icon: Monitor,
    items: [
      { id: 'aspect-ratio', label: 'Seitenverhältnis', type: 'select', value: '16:9', options: ['1:1', '4:3', '16:9', '21:9', '3:4', '9:16'] },
      { id: 'resolution', label: 'Auflösung', type: 'select', value: '4k', options: ['1080p', '4k', '8k', 'ultra-hd'] },
      { id: 'stylize', label: 'Stilisierung', type: 'slider', value: 100, min: 0, max: 1000, step: 50 },
      { id: 'chaos', label: 'Chaos/Variabilität', type: 'slider', value: 0, min: 0, max: 100, step: 10 }
    ]
  }
]

export function PropertiesPanel({}: PropertiesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'style'])
  const [properties, setProperties] = useState<Record<string, any>>({
    type: 'image',
    model: 'midjourney',
    quality: 'high',
    style: 'photorealistic',
    mood: 'neutral',
    'color-palette': 'natural',
    'shot-type': 'medium-shot',
    angle: 'eye-level',
    lens: '50mm',
    'lighting-type': 'natural',
    'time-of-day': 'midday',
    contrast: 50,
    'aspect-ratio': '16:9',
    resolution: '4k',
    stylize: 100,
    chaos: 0
  })

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const updateProperty = (propertyId: string, value: any) => {
    setProperties(prev => ({ ...prev, [propertyId]: value }))
  }

  const generatePromptParameters = () => {
    const params = []
    
    if (properties['aspect-ratio'] !== '1:1') {
      params.push(`--ar ${properties['aspect-ratio']}`)
    }
    
    if (properties.stylize !== 100) {
      params.push(`--s ${properties.stylize}`)
    }
    
    if (properties.chaos > 0) {
      params.push(`--c ${properties.chaos}`)
    }
    
    if (properties.quality === 'ultra') {
      params.push('--q 2')
    }
    
    return params.join(' ')
  }

  const renderPropertyItem = (item: PropertyItem, sectionId: string) => {
    const value = properties[item.id] || item.value
    
    switch (item.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateProperty(item.id, e.target.value)}
            className="w-full px-3 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {item.options?.map(option => (
              <option key={option} value={option}>
                {option.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        )
        
      case 'slider':
        return (
          <div className="space-y-1">
            <input
              type="range"
              min={item.min || 0}
              max={item.max || 100}
              step={item.step || 1}
              value={value}
              onChange={(e) => updateProperty(item.id, parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{item.min || 0}</span>
              <span className="font-mono font-bold">{value}</span>
              <span>{item.max || 100}</span>
            </div>
          </div>
        )
        
      case 'toggle':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateProperty(item.id, e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              'relative w-10 h-5 rounded-full transition-colors',
              value ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            )}>
              <div className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                value && 'translate-x-5'
              )} />
            </div>
          </label>
        )
        
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateProperty(item.id, e.target.value)}
            className="w-full px-3 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )
    }
  }

  return (
    <div className="h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Properties</h2>
      </div>
      
      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {propertySections.map(section => {
          const isExpanded = expandedSections.includes(section.id)
          
          return (
            <div key={section.id} className="border border-slate-200 dark:border-slate-700 rounded-lg">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-2 p-3 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <section.icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {section.title}
                </span>
              </button>
              
              {/* Section Content */}
              {isExpanded && (
                <div className="p-3 pt-0 space-y-3">
                  {section.items.map(item => (
                    <div key={item.id} className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {item.label}
                      </label>
                      {renderPropertyItem(item, section.id)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Generated Parameters */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Generierte Parameter:
          </label>
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
            {generatePromptParameters() || 'Keine Parameter'}
          </div>
        </div>
        
        <button className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          Parameter anwenden
        </button>
      </div>
    </div>
  )
}