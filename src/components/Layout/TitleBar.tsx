import React from 'react'

interface TitleBarProps {
  title?: string
  showTrafficLights?: boolean
}

export function TitleBar({ title = "Prompt IDE", showTrafficLights = true }: TitleBarProps) {
  const handleWindowAction = (action: 'close' | 'minimize' | 'maximize') => {
    // For now, we'll just log the action
    // In a real implementation, these would send IPC messages to the main process
    console.log(`Window ${action} action`)
  }

  return (
    <div className="mac-titlebar">
      {showTrafficLights && (
        <div className="mac-traffic-lights">
          <div
            className="mac-traffic-light close"
            onClick={() => handleWindowAction('close')}
            title="Close"
          />
          <div
            className="mac-traffic-light minimize"
            onClick={() => handleWindowAction('minimize')}
            title="Minimize"
          />
          <div
            className="mac-traffic-light maximize"
            onClick={() => handleWindowAction('maximize')}
            title="Maximize"
          />
        </div>
      )}
      <div className="title">
        {title}
      </div>
    </div>
  )
} 