import React, { useState, useEffect } from 'react'
import { storage } from '../../lib/storage'
import { chatGPTService } from '../../lib/chatgpt'
import { 
  Settings, 
  User, 
  Palette, 
  Monitor, 
  Save, 
  LogOut,
  Moon,
  Sun,
  Globe,
  Key,
  Bell,
  Shield,
  Download,
  Upload,
  Trash2,
  Check,
  X
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

interface SettingsPanelProps {
  onClose?: () => void
}

const settingSections = [
  {
    id: 'profile',
    title: 'Profil',
    icon: User,
    description: 'Verwalten Sie Ihre persönlichen Informationen'
  },
  {
    id: 'appearance',
    title: 'Darstellung',
    icon: Palette,
    description: 'Theme, Sprache und UI-Einstellungen'
  },
  {
    id: 'editor',
    title: 'Editor',
    icon: Monitor,
    description: 'Editor-Verhalten und Tastenkürzel'
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    icon: Key,
    description: 'ChatGPT API-Integration für Prompt-Verbesserung'
  },
  {
    id: 'notifications',
    title: 'Benachrichtigungen',
    icon: Bell,
    description: 'E-Mail und Push-Benachrichtigungen'
  },
  {
    id: 'privacy',
    title: 'Datenschutz',
    icon: Shield,
    description: 'Datenschutz und Sicherheitseinstellungen'
  },
  {
    id: 'data',
    title: 'Daten',
    icon: Download,
    description: 'Import, Export und Backup'
  }
]

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { user, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('appearance')
  const [language, setLanguage] = useState('de')
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: false,
    lineNumbers: true,
    autoSave: true,
    autoComplete: true
  })
  const [notifications, setNotifications] = useState({
    email: true,
    community: true,
    updates: false,
    marketing: false
  })
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    website: '',
    github_url: '',
    twitter_url: ''
  })
  const [chatGptSettings, setChatGptSettings] = useState({
    apiKey: '',
    model: 'gpt-5',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: false
  })

  // Einstellungen aus persistentem Speicher laden
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await storage.loadData('settings')
        if (savedSettings) {
          console.log('Loaded settings:', savedSettings)
          
          setLanguage(savedSettings.language || 'de')
          setEditorSettings(savedSettings.editor || editorSettings)
          setNotifications(savedSettings.notifications || notifications)
          setChatGptSettings({
            ...(savedSettings.chatgpt || chatGptSettings),
            model: 'gpt-5'
          })
        }
        
        // Force dark theme always
        document.documentElement.classList.add('dark')
        document.body.classList.add('dark')
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    
    loadSettings()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      // Error is handled in signOut
    }
  }

  // Einstellungen speichern
  const saveSettings = async () => {
    try {
      const settings = {
        theme: 'dark', // Always dark theme
        language,
        editor: editorSettings,
        notifications,
        chatgpt: { ...chatGptSettings, model: 'gpt-5' }
      }
      
      await storage.saveData('settings', settings)
      // Ensure the in-memory ChatGPT service picks up the latest key immediately
      try { chatGPTService.updateSettings() } catch {}
      
      console.log('Settings saved:', settings)
      toast.success('Einstellungen gespeichert!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Fehler beim Speichern der Einstellungen')
    }
  }

  const exportData = () => {
    toast.success('Datenexport wird vorbereitet...')
    // Implementation would export user's prompts and settings
  }

  const importData = () => {
    toast.success('Import-Funktion wird bald verfügbar sein')
    // Implementation would allow importing prompts
  }

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Profilinformationen</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Vollständiger Name
            </label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Benutzername
            </label>
            <input
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Bio
            </label>
            <textarea
              value={profileForm.bio}
              onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Erzählen Sie uns etwas über sich..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={profileForm.website}
              onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              GitHub
            </label>
            <input
              type="url"
              value={profileForm.github_url}
              onChange={(e) => setProfileForm(prev => ({ ...prev, github_url: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://github.com/username"
            />
          </div>
        </div>
      </div>
      
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Konto</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">E-Mail-Adresse</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
            </div>
            <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Ändern
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Passwort</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Zuletzt geändert vor 3 Monaten</p>
            </div>
            <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Ändern
            </button>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </div>
    </div>
  )

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Theme</h3>
        
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <Moon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Dunkles Theme</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Aktiv (nicht änderbar)</p>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Sprache</h3>
        
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </select>
      </div>
      
      <div className="mt-6">
        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Anwenden
        </button>
      </div>
    </div>
  )

  const renderEditorSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Editor-Einstellungen</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Schriftgröße
            </label>
            <input
              type="range"
              min="10"
              max="24"
              value={editorSettings.fontSize}
              onChange={(e) => setEditorSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10px</span>
              <span className="font-mono font-bold">{editorSettings.fontSize}px</span>
              <span>24px</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tab-Größe
            </label>
            <select
              value={editorSettings.tabSize}
              onChange={(e) => setEditorSettings(prev => ({ ...prev, tabSize: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2">2 Leerzeichen</option>
              <option value="4">4 Leerzeichen</option>
              <option value="8">8 Leerzeichen</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {Object.entries({
            wordWrap: 'Zeilenumbruch',
            minimap: 'Minimap anzeigen',
            lineNumbers: 'Zeilennummern',
            autoSave: 'Automatisch speichern',
            autoComplete: 'Auto-Vervollständigung'
          }).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editorSettings[key as keyof typeof editorSettings] as boolean}
                onChange={(e) => setEditorSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Anwenden
        </button>
      </div>
    </div>
  )

  const renderChatGptSection = () => {
    const isApiKeyValid = chatGptSettings.apiKey && chatGptSettings.apiKey.startsWith('sk-')
    const isConfigured = isApiKeyValid && chatGptSettings.enabled
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">ChatGPT API Integration</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Konfigurieren Sie die ChatGPT API-Integration, um Prompts automatisch zu verbessern und zu optimieren.
          </p>
          
          {/* Status Indicator */}
          <div className={`p-4 rounded-lg mb-6 ${isConfigured ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-amber-500'}`}></div>
              <span className={`font-medium ${isConfigured ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
                {isConfigured ? 'ChatGPT Integration ist aktiv' : 'ChatGPT Integration ist inaktiv'}
              </span>
            </div>
            {!isConfigured && (
              <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                {!isApiKeyValid ? 'Bitte geben Sie einen gültigen API-Key ein' : 'Bitte aktivieren Sie die Integration unten'}
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={chatGptSettings.apiKey}
                onChange={(e) => setChatGptSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${isApiKeyValid ? 'border-green-300 dark:border-green-600' : 'border-slate-300 dark:border-slate-600'}`}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ihr API-Key wird lokal gespeichert und nicht übertragen.
              </p>
              {chatGptSettings.apiKey && !isApiKeyValid && (
                <p className="text-xs text-red-500 mt-1">
                  Der API-Key muss mit "sk-" beginnen
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Modell
              </label>
              <div className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                GPT‑5 (fest eingestellt)
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Kreativität (Temperature): {chatGptSettings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={chatGptSettings.temperature}
                onChange={(e) => setChatGptSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Präzise</span>
                <span>Kreativ</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                min="100"
                max="4000"
                value={chatGptSettings.maxTokens}
                onChange={(e) => setChatGptSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            
            {/* Prominente Aktivierung */}
            <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="chatgpt-enabled"
                  checked={chatGptSettings.enabled}
                  onChange={(e) => setChatGptSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="chatgpt-enabled" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  ChatGPT Integration aktivieren <span className="text-red-500">*</span>
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-8">
                Diese Option muss aktiviert werden, um ChatGPT-Funktionen zu nutzen
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-3">Funktionen</h4>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              <span>Prompts automatisch verbessern</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              <span>Textabschnitte optimieren</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              <span>Grammatik und Stil korrigieren</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              <span>Kreative Vorschläge generieren</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={saveSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Anwenden
          </button>
          {!isConfigured && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              Vergessen Sie nicht, nach dem Eingeben des API-Keys die Integration zu aktivieren und zu speichern!
            </p>
          )}
        </div>
      </div>
    )
  }

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Benachrichtigungen</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Konfigurieren Sie Ihre E-Mail- und Push-Benachrichtigungen.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">E-Mail-Benachrichtigungen</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Erhalten Sie E-Mails, wenn neue Prompts hinzugefügt werden.
              </p>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Community-Updates</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Erhalten Sie Updates über neue Funktionen und Verbesserungen.
              </p>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifications.community}
                onChange={(e) => setNotifications(prev => ({ ...prev, community: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Marketing-Updates</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Erhalten Sie Marketing-Updates und Angebote.
              </p>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifications.marketing}
                onChange={(e) => setNotifications(prev => ({ ...prev, marketing: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Anwenden
        </button>
      </div>
    </div>
  )

  const renderPrivacySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Datenschutz</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Konfigurieren Sie Ihre Datenschutzeinstellungen.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Sicherheit</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Aktivieren Sie zwei-Faktor-Authentifizierung und andere Sicherheitsfunktionen.
              </p>
            </div>
            <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Sicherheitseinstellungen
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Datenspeicherung</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Konfigurieren Sie, wie lange Ihre Daten gespeichert werden.
              </p>
            </div>
            <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Datenspeicherung
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Anwenden
        </button>
      </div>
    </div>
  )

  const renderDataSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Daten verwalten</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={exportData}
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors text-left"
          >
            <Download className="w-6 h-6 text-blue-500 mb-2" />
            <h4 className="font-medium text-slate-900 dark:text-white">Daten exportieren</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Laden Sie alle Ihre Prompts und Einstellungen herunter</p>
          </button>
          
          <button
            onClick={importData}
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors text-left"
          >
            <Upload className="w-6 h-6 text-green-500 mb-2" />
            <h4 className="font-medium text-slate-900 dark:text-white">Daten importieren</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Importieren Sie Prompts aus anderen Quellen</p>
          </button>
        </div>
      </div>
      
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Gefahrenzone
        </h3>
        
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Konto löschen</h4>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Daten werden permanent gelöscht.
          </p>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            Konto löschen
          </button>
        </div>
      </div>
    </div>
  )

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection()
      case 'appearance':
        return renderAppearanceSection()
      case 'editor':
        return renderEditorSection()
      case 'chatgpt':
        return renderChatGptSection()
      case 'notifications':
        return renderNotificationsSection()
      case 'privacy':
        return renderPrivacySection()
      case 'data':
        return renderDataSection()
      default:
        return renderProfileSection()
    }
  }

  return (
    <div className="h-full flex bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
      {/* Settings Navigation */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Einstellungen
          </h1>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Einstellungen schließen"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>
        
        <nav className="space-y-2">
          {settingSections.map(section => {
            const isActive = activeSection === section.id
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left',
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                )}
              >
                <section.icon className={cn(
                  'w-5 h-5 flex-shrink-0 mt-0.5',
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                )} />
                
                <div className="flex-1">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {section.description}
                  </p>
                </div>
              </button>
            )
          })}
        </nav>
      </div>
      
      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
        {renderSectionContent()}
      </div>
    </div>
  )
}