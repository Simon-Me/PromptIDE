import React from 'react'
import { Image, Video } from 'lucide-react'
import { cn } from '../../lib/utils'

interface WorkflowTabsProps {
  activeWorkflow: 'image' | 'video'
  onWorkflowChange: (workflow: 'image' | 'video') => void
}

export function WorkflowTabs({ activeWorkflow, onWorkflowChange }: WorkflowTabsProps) {
  const tabs = [
    { id: 'image' as const, icon: Image, label: 'Photo' },
    { id: 'video' as const, icon: Video, label: 'Video' }
  ]

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20">
      <div className="segmented">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeWorkflow === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onWorkflowChange(tab.id)}
              className={cn('segment flex items-center gap-2', isActive && 'active')}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
} 