// 🤖 ChatGPT-based Intelligent Prompt Classifier
// Optimized for cost efficiency with caching and batching

import { loadSettings, saveSettings } from './storage'

interface ClassificationSpan {
  start: number
  end: number
  text: string
  category: string
}

interface ClassificationResult {
  spans: ClassificationSpan[]
}

class ChatGPTClassifier {
  private cache = new Map<string, ClassificationResult>()
  private apiKey: string | null = null
  
  constructor() {
    this.loadApiKey()
    // Clear cache for new grammar-based system
    console.log('🧹 Clearing cache for new WORD-BY-WORD grammar system...')
    this.cache.clear()
  }
  
  private async loadApiKey() {
    try {
      const settings = await loadSettings()
      this.apiKey = settings?.chatgpt?.apiKey || null
      if (this.apiKey) {
        console.log('✅ OpenAI API key loaded successfully')
      } else {
        console.warn('⚠️ No OpenAI API key found in settings')
      }
    } catch (error) {
      console.error('❌ Error loading API key:', error)
      this.apiKey = null
    }
  }
  
  async setApiKey(key: string) {
    this.apiKey = key
    try {
      const settings = await loadSettings()
      const newSettings = { ...(settings || {}), chatgpt: { ...(settings?.chatgpt || {}), apiKey: key } }
      await saveSettings(newSettings)
    } catch (error) {
      console.error('❌ Error saving API key:', error)
    }
  }
  
  async classifyText(text: string): Promise<ClassificationResult> {
    // Handle empty or very short text
    if (!text || text.trim().length < 2) {
      return { spans: [] }
    }

    // Limit text length for performance (ChatGPT works better with shorter texts)
    let processText = text.trim()
    const MAX_TEXT_LENGTH = 800 // Increased limit for better coverage
    
    if (processText.length > MAX_TEXT_LENGTH) {
      console.log(`⚠️ Text too long (${processText.length} chars), truncating to ${MAX_TEXT_LENGTH} chars`)
      processText = processText.substring(0, MAX_TEXT_LENGTH)
    }

    // Check cache first
    const cacheKey = processText
    if (this.cache.has(cacheKey)) {
      console.log('💾 Cache hit for:', JSON.stringify(cacheKey.substring(0, 50) + '...'))
      return this.cache.get(cacheKey)!
    }
    
    try {
      const apiKey = this.apiKey
      if (!apiKey) {
        console.warn('⚠️ No API key found')
        return { spans: [] }
      }

      console.log('✅ OpenAI API key loaded successfully')
      
      // Shorter, more focused prompt for better performance
      const prompt = `
Analyze this text and classify each word by its grammatical role. Return JSON format with exact word positions.

IMPORTANT GRAMMAR RULES:
- Words ending in -ed/-ing can be adjectives (e.g., "oversized", "exciting", "painted")
- Words ending in -ly are usually adverbs (e.g., "delicately", "quickly", "softly") 
- Compound adjectives count as adjectives (e.g., "world-class", "high-end", "eye-catching")
- Past participles used as adjectives (e.g., "broken", "finished", "detailed")

Categories to classify:
- noun: person, place, thing, concept
- verb: action, state, existence  
- adjective: descriptive words, size, color, quality (including -ed/-ing forms)
- adverb: manner, time, place, degree (usually -ly ending)
- preposition: in, on, at, by, with, through, etc.
- pronoun: I, you, he, she, it, they, this, that, etc.
- article: a, an, the
- conjunction: and, or, but, because, etc.

Text to analyze: "${text}"

Return ONLY valid JSON in this exact format:
{"spans": [{"start": 0, "end": 5, "word": "Paint", "category": "verb"}, {"start": 6, "end": 7, "word": "a", "category": "article"}]}

Be very careful with word boundaries and positions. Each word must be classified correctly.`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2500  // MUCH higher for long texts to avoid truncation
        })
      })
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }
      
      const data = await response.json()
      const content = data.choices[0]?.message?.content?.trim()
      
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      // Parse JSON response with robust error handling
      let phrases: Array<{word: string, category: string, start?: number, end?: number}>
      try {
        // Try to clean up the JSON if it's truncated
        let cleanContent = content.trim()
        
        // Handle new {"spans": [...]} format or old array format
        const parsed = JSON.parse(cleanContent)
        
        if (parsed.spans) {
          // New format: {"spans": [{"word": "...", "category": "...", "start": 0, "end": 5}]}
          phrases = parsed.spans
          console.log(`✅ Parsed ${phrases.length} words from ChatGPT (new format)`) 
        } else if (Array.isArray(parsed)) {
          // Old format: [{"word": "...", "category": "..."}]
          phrases = parsed
          console.log(`✅ Parsed ${phrases.length} words from ChatGPT (old format)`) 
        } else {
          throw new Error('Unexpected JSON format')
        }
    } catch (error) {
        console.error('❌ Failed to parse ChatGPT JSON:', content.substring(0, 200) + '...')
        console.error('❌ Error:', error)
        
        // SUPER ROBUST JSON REPAIR - handles all truncation cases
        try {
          let cleanContent = content.trim()
          console.log(`🔧 REPAIRING TRUNCATED JSON: "${cleanContent.slice(-200)}..."`)
          
          if (cleanContent.includes('"spans":[')) {
            // Step 1: Find the last complete JSON object
            let lastCompleteEntry = cleanContent.lastIndexOf('},')
            
            // Step 2: If we have at least one complete entry, use it
            if (lastCompleteEntry > 0) {
              // Extract everything before the incomplete entry
              cleanContent = cleanContent.substring(0, lastCompleteEntry) + '}]}'
              console.log('🔧 Method 1: Cut at last complete entry')
            } else {
              // Step 3: Look for incomplete entries and try to complete them
              const incompleteEntry = cleanContent.lastIndexOf('{"start":')
              if (incompleteEntry > 0) {
                // Cut before the incomplete entry
                cleanContent = cleanContent.substring(0, incompleteEntry) + ']}'
                console.log('🔧 Method 2: Cut before incomplete entry')
              } else {
                // Step 4: Minimal repair - just close the JSON structure
                if (cleanContent.endsWith(',')) {
                  cleanContent = cleanContent.slice(0, -1) + ']}'
                } else if (cleanContent.includes('[') && !cleanContent.endsWith(']}')) {
                  cleanContent = cleanContent + ']}'
                }
                console.log('🔧 Method 3: Basic structure repair')
              }
            }
            
            // Step 5: Try to parse the repaired JSON
            const repaired = JSON.parse(cleanContent)
            phrases = repaired.spans || []
            console.log(`✅ JSON REPAIR SUCCESS! Got ${phrases.length} complete words`)
          } else {
            console.warn('❌ No spans structure found in JSON')
            return { spans: [] }
      }
        } catch (repairError) {
          console.error('❌ Could not repair JSON:', repairError)
          return { spans: [] }
        }
  }
  
      // Convert phrases to spans - use ChatGPT positions if available
      const spans: ClassificationSpan[] = []
      let searchOffset = 0
      
      for (const item of phrases) {
        if (!item.word || !item.category) continue
        
        // Use ChatGPT-provided positions if available (more accurate!)
        if (typeof item.start === 'number' && typeof item.end === 'number') {
          // Validate positions are within text bounds AND text matches
          const positionValid = item.start >= 0 && item.end <= text.length && item.start < item.end
          const textAtPosition = text.substring(item.start, item.end).toLowerCase()
          const wordMatches = textAtPosition === item.word.toLowerCase()
          
          if (positionValid && wordMatches) {
            spans.push({
              text: text.substring(item.start, item.end),
              category: item.category,
              start: item.start,
              end: item.end
            })
            console.log(`✅ Using ChatGPT position for "${item.word}" (${item.category}) at ${item.start}-${item.end}`)
            continue
          } else {
            console.warn(`⚠️ Invalid ChatGPT positions for "${item.word}": ${item.start}-${item.end}, expected "${item.word}" but got "${textAtPosition}"`)
          }
        }
        
        // Fallback: Find the word in the text starting from searchOffset (IMPROVED)
        let wordFound = false
        
        // Try exact word match first (case-insensitive)
        const exactRegex = new RegExp(`\\b${item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}\\b`, 'i')
        const exactMatch = text.substring(searchOffset).match(exactRegex)
        
        if (exactMatch && exactMatch.index !== undefined) {
          const actualStart = searchOffset + exactMatch.index
          const actualEnd = actualStart + exactMatch[0].length
          
          spans.push({
            text: exactMatch[0], // Use actual matched text 
            category: item.category,
            start: actualStart,
            end: actualEnd
          })
          
          searchOffset = actualEnd
          wordFound = true
          console.log(`✅ Found word "${exactMatch[0]}" (${item.category}) at ${actualStart}-${actualEnd}`)
    }
    
        // If exact match fails, try flexible search (without word boundaries)
        if (!wordFound) {
          const flexIndex = text.toLowerCase().indexOf(item.word.toLowerCase(), searchOffset)
          if (flexIndex !== -1) {
            const actualEnd = flexIndex + item.word.length
            
            spans.push({
              text: text.substring(flexIndex, actualEnd),
              category: item.category,
              start: flexIndex,
              end: actualEnd
            })
            
            searchOffset = actualEnd
            wordFound = true
            console.log(`✅ Found word "${item.word}" (${item.category}) at ${flexIndex}-${actualEnd} (flexible search)`)
          }
        }
        
        if (!wordFound) {
          console.warn(`❌ Could not find word "${item.word}" in text after position ${searchOffset}`)
        }
      }

      const result: ClassificationResult = { spans }
      
      // Cache the result
      this.cache.set(cacheKey, result)
      
      console.log('🤖 AI classified:', JSON.stringify(cacheKey), result)
      return result

    } catch (error) {
      console.error('❌ ChatGPT classification error:', error)
      return { spans: [] }
    }
  }

  // Batch processing for multiple texts (future optimization)
  async classifyBatch(texts: string[]): Promise<ClassificationResult[]> {
    const results = await Promise.all(texts.map(text => this.classifyText(text)))
    return results
  }
  
  clearCache() {
    console.log('🧹 Clearing ChatGPT cache...')
    this.cache.clear()
  }
}

// Singleton instance
const classifier = new ChatGPTClassifier()

// Main export function for easy usage
export async function classifyPromptText(text: string): Promise<ClassificationResult> {
  return classifier.classifyText(text)
} 

export { classifier as ChatGPTClassifier } 