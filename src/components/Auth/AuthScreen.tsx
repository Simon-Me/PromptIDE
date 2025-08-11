import React, { useState } from 'react'
import { 
  Code, 
  Sparkles, 
  Users, 
  Zap, 
  BookOpen,
  Eye,
  EyeOff,
  LogIn,
  UserPlus
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      return
    }
    
    if (isSignUp && !fullName) {
      return
    }
    
    try {
      setLoading(true)
      
      if (isSignUp) {
        await signUp(email, password, fullName)
      } else {
        await signIn(email, password)
      }
    } catch (error) {
      // Error is handled in auth context
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Code,
      title: 'IDE-ähnlicher Editor',
      description: 'Monaco Editor mit Syntax-Highlighting und Auto-Vervollständigung'
    },
    {
      icon: BookOpen,
      title: 'Umfangreiche Prompt-Bibliothek',
      description: 'Kuratierte Sammlung von Prompts für Midjourney, DALL-E, Stable Diffusion'
    },
    {
      icon: Users,
      title: 'Community-Features',
      description: 'Teilen Sie Prompts, bewerten Sie Inhalte und lernen Sie von anderen'
    },
    {
      icon: Zap,
      title: 'Intelligente Tools',
      description: 'Auto-Vervollständigung, Parameter-Assistent und Prompt-Optimierung'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex min-h-screen">
        {/* Left Side - Features */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 py-24 text-white">
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                Prompt IDE
              </h1>
              <p className="text-xl text-blue-100">
                Die professionelle Entwicklungsumgebung für AI-Prompt Engineering
              </p>
            </div>
            
            <div className="space-y-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-blue-100">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 p-6 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>1000+ Prompts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>50+ Creator</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>AI-Tools</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                <Sparkles className="w-8 h-8 text-blue-600" />
                Prompt IDE
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Die professionelle Entwicklungsumgebung für AI-Prompts
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {isSignUp ? 'Konto erstellen' : 'Willkommen zurück'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  {isSignUp 
                    ? 'Erstellen Sie Ihr kostenloses Konto' 
                    : 'Melden Sie sich in Ihrem Konto an'
                  }
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {isSignUp && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Vollständiger Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Max Mustermann"
                      required
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ihre@email.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Passwort
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                    loading
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  )}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                      {isSignUp ? 'Konto erstellen' : 'Anmelden'}
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  {isSignUp 
                    ? 'Haben Sie bereits ein Konto? Anmelden' 
                    : 'Noch kein Konto? Registrieren'
                  }
                </button>
              </div>
              
              {/* Demo Access */}
              <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-2">
                  Demo-Zugang:
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-500 text-center space-y-1">
                  <div>E-Mail: demo@prompt-ide.com</div>
                  <div>Passwort: demo123</div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
              <p>
                Mit der Anmeldung stimmen Sie unseren{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  Nutzungsbedingungen
                </a>{' '}
                und der{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  Datenschutzerklärung
                </a>{' '}
                zu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}