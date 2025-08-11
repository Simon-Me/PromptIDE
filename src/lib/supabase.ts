import { createClient } from '@supabase/supabase-js'

const url = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://iffukxtuviogjknftvfk.supabase.co'
const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZnVreHR1dmlvZ2prbmZ0dmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzA5MDQsImV4cCI6MjA2ODc0NjkwNH0.UWaw_WaOVXNkBcYZqfwjjd3bo0YmaX-8a3i9wdKQRyI'

export const supabase = createClient(url, anon)

// Types for our database
export interface Profile {
  id: string
  user_id: string
  full_name?: string
  username?: string
  avatar_url?: string
  bio?: string
  website?: string
  github_url?: string
  twitter_url?: string
  preferences: Record<string, any>
  subscription_tier: 'free' | 'pro'
  created_at: string
  updated_at: string
}

export interface Prompt {
  id: string
  title: string
  content: string
  description?: string
  type: 'image' | 'video' | 'text'
  style_category?: string
  tags: string[]
  parameters: Record<string, any>
  negative_prompt?: string
  is_public: boolean
  is_featured: boolean
  version: string
  created_by: string
  created_at: string
  updated_at: string
  view_count: number
  copy_count: number
}

export interface Collection {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectTab {
  id: string
  name: string
  content: string
  type: string
  parameters: Record<string, any>
  is_saved: boolean
  position: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface PromptComment {
  id: string
  prompt_id: string
  user_id: string
  content: string
  parent_id?: string
  is_edited: boolean
  created_at: string
  updated_at: string
}

export interface PromptRating {
  id: string
  prompt_id: string
  user_id: string
  rating: number
  created_at: string
}