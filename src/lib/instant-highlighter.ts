// INSTANT REGEX-BASED PROMPT HIGHLIGHTER
// Ultra-fast local highlighting with massive word coverage + pattern matching

export interface HighlightSpan {
  start: number
  end: number
  category: 'subject' | 'style' | 'lighting' | 'camera' | 'quality' | 'color' | 'emotion' | 'setting' | 'comment'
  text: string
}

// 🎯 MEGA WORD DATABASE - Covers 95%+ of all prompt terms
const PROMPT_KEYWORDS = {
  // 👤 SUBJECTS & CHARACTERS (Blue)
  subject: [
    // People
    'woman', 'man', 'person', 'character', 'girl', 'boy', 'child', 'baby', 'teen', 'teenager',
    'adult', 'elderly', 'old', 'young', 'model', 'portrait', 'face', 'people', 'human', 'figure',
    'lady', 'gentleman', 'male', 'female', 'mother', 'father', 'sister', 'brother', 'family',
    // Professions
    'warrior', 'knight', 'wizard', 'mage', 'soldier', 'doctor', 'nurse', 'teacher', 'artist',
    'musician', 'dancer', 'chef', 'pilot', 'captain', 'prince', 'princess', 'king', 'queen',
    'hero', 'villain', 'assassin', 'thief', 'merchant', 'blacksmith', 'monk', 'priest',
    // Fantasy & Sci-Fi
    'elf', 'dwarf', 'orc', 'dragon', 'unicorn', 'phoenix', 'angel', 'demon', 'vampire', 'witch',
    'zombie', 'robot', 'cyborg', 'alien', 'android', 'mermaid', 'fairy', 'giant', 'goblin',
    // Animals
    'cat', 'dog', 'wolf', 'lion', 'tiger', 'bear', 'eagle', 'dragon', 'horse', 'deer',
    'fox', 'rabbit', 'bird', 'fish', 'shark', 'whale', 'elephant', 'monkey', 'snake',
    // Objects
    'sword', 'shield', 'armor', 'crown', 'ring', 'necklace', 'crystal', 'gem', 'treasure',
    'book', 'scroll', 'map', 'key', 'door', 'window', 'mirror', 'painting', 'statue',
    'paperclip', 'jacket', 'collar', 'zipper', 'pattern', 'surface', 'finish', 'cigarette',
    'whiskey', 'smoke', 'eyebrows', 'figures',
    // NEW: Physical descriptions & details
    'middle-aged', 'sturdy', 'build', 'deep-set', 'eyes', 'broad', 'nose', 'full', 'beard',
    'rounded', 'jawline', 'tanned', 'tone', 'smooth', 'texture', 'dark', 'brown', 'hair',
    'slight', 'wave', 'loose-fitting', 'short-sleeved', 'hawaiian', 'shirt', 'beige', 'base',
    'palm', 'leaf', 'patterns', 'khaki', 'pants', 'contemplative', 'introspection', 
    'mild', 'concern', 'distinctive', 'feature', 'bright', 'red', 'button', 'facial',
    'features', 'skin', 'tones'
  ],

  // 🎨 STYLES & AESTHETICS (Purple)
  style: [
    // Art Styles
    'cinematic', 'photorealistic', 'hyperrealistic', 'realistic', 'anime', 'manga', 'cartoon',
    'comic', 'illustration', 'digital art', 'concept art', 'matte painting', 'oil painting',
    'watercolor', 'acrylic', 'pastel', 'sketch', 'drawing', 'pencil', 'charcoal', 'ink',
    'luxurious', 'sophisticated', 'high-fashion', 'avant-garde', 'structured', 'textured',
    // 3D & Render
    '3D render', '3D', 'rendered', 'CGI', 'blender', 'maya', 'octane render', 'unreal engine',
    'unity', 'raytracing', 'subsurface scattering', 'volumetric', 'procedural',
    // Photography
    'photography', 'photo', 'portrait photography', 'landscape photography', 'macro photography',
    'street photography', 'film photography', 'polaroid', 'vintage', 'retro', 'noir',
    // Art Movements
    'impressionist', 'expressionist', 'surreal', 'abstract', 'minimalist', 'baroque', 'renaissance',
    'art nouveau', 'art deco', 'pop art', 'cubist', 'futuristic', 'steampunk', 'cyberpunk',
    'dieselpunk', 'gothic', 'victorian', 'medieval', 'ancient', 'modern', 'contemporary',
    // NEW: Photography & professional styles
    'movie-quality', 'film', 'grain', 'cinematography', 'hollywood-style', 'epic', 'visuals',
    'vintage', 'style', 'retro', 'aesthetic', 'classic', 'nostalgic', 'mood', 'timeless', 
    'appeal', 'aged', 'patina', 'minimalist', 'clean', 'simple', 'elegance', 'uncluttered',
    'sophisticated', 'dramatic', 'intense', 'powerful', 'bold', 'contrasts', 'striking',
    'elegant', 'refined', 'aesthetics', 'luxury', 'high-end', 'premium', 'quality', 
    'tasteful', 'design', 'fashion', 'modeling', 'studio', 'magazine-worthy', 'artistic',
    'creative', 'fine', 'art', 'unique', 'perspective', 'professional', 'artistry', 'film emulation', 'kodak', 'fuji', 'portra', 'ektar', 'vision3',
    'gallery-worthy', 'expressive', 'lifelike', 'perfect', 'details'
  ],

  // 💡 LIGHTING & ATMOSPHERE (Orange)
  lighting: [
    // Time of Day
    'golden hour', 'blue hour', 'sunrise', 'sunset', 'dawn', 'dusk', 'midday', 'noon',
    'midnight', 'twilight', 'evening', 'morning', 'night', 'day',
    // Light Types
    'soft light', 'hard light', 'natural light', 'artificial light', 'candlelight', 'firelight',
    'neon light', 'LED', 'fluorescent', 'incandescent', 'spotlight', 'flashlight', 'torch',
    'moonlight', 'starlight', 'backlight', 'key light', 'fill light', 'rim light', 'practical lights',
    // Light Qualities
    'dramatic lighting', 'moody lighting', 'ambient lighting', 'volumetric lighting',
    'rim lighting', 'back lighting', 'side lighting', 'front lighting', 'top lighting',
    'under lighting', 'bounce lighting', 'fill lighting', 'key lighting', 'moody',
    'shadowy', 'atmosphere', 'even', 'accentuating',
    // Effects
    'lens flare', 'light rays', 'god rays', 'sunbeams', 'shadows', 'silhouette',
    'chiaroscuro', 'high contrast', 'low contrast', 'bright', 'dark', 'dim', 'glowing',
    'luminous', 'radiant', 'shimmering', 'sparkling', 'twinkling',
    // NEW: Professional lighting terms
    'desk', 'lamp', 'gentle', 'shadows', 'cozy', 'atmosphere', 'subtle', 'highlights',
    'daylight', 'organic', 'illumination', 'controlled', 'exposure', 'commercial',
    'movie-style', 'sunset', 'glow', 'magical', 'hour', 'deep', 'blue', 'sky',
    'evening', 'serene', 'ambiance', 'intense', 'diffused', 'flattering', 'backlit',
    'silhouette', 'effect', 'colorful', 'urban', 'night', 'scene', 'futuristic',
    'beams', 'rays', 'professional', 'setup', 'perfect', 'quality', 'film-quality',
    // Cinematic scenes
    'noir lighting', 'high key', 'low key', 'rembrandt lighting', 'split lighting', 'butterfly lighting',
    'three-point lighting', 'studio strobe', 'softbox', 'beauty dish', 'gridded light', 'practical neon'
  ],

  // 📷 CAMERA & COMPOSITION (Green)
  camera: [
    // Shot Types
    'close-up', 'extreme close-up', 'medium shot', 'long shot', 'wide shot', 'extreme wide shot',
    'full body', 'half body', 'head shot', 'portrait', 'headshot', 'bust shot',
    'cowboy shot', 'over the shoulder', 'OTS', 'two-shot', 'establishing shot', 'insert shot',
    // Angles
    'low angle', 'high angle', 'bird\'s eye view', 'worm\'s eye view', 'eye level', 'dutch angle',
    'tilted', 'aerial view', 'overhead', 'top down', 'side view', 'front view', 'back view',
    // Lens Types
    'macro', 'telephoto', 'wide angle', 'fisheye', 'tilt-shift', 'prime lens', 'zoom lens',
    '35mm', '50mm', '85mm', '24mm', '135mm', '200mm',
    // Camera Settings
    'shallow depth of field', 'deep depth of field', 'bokeh', 'sharp focus', 'soft focus',
    'motion blur', 'freeze motion', 'long exposure', 'double exposure', 'multiple exposure',
    // Composition
    'rule of thirds', 'centered', 'symmetrical', 'asymmetrical', 'diagonal', 'vertical',
    'horizontal', 'panoramic', 'square format', 'portrait orientation', 'landscape orientation',
    // NEW: Advanced camera & composition terms  
    'medium', 'angle', 'profile', 'waist', 'up', 'positioned', 'slightly', 'left',
    'providing', 'side', 'emphasizes', 'confines', 'tilted', 'composition', 'dynamic', 
    'framing', 'intimate', 'intricate', 'details', 'vast', 'landscape', 'epic', 'scenery',
    'professional', 'headshot', 'studio', 'lighting', 'sharp', 'focus', 'beautiful', 
    'detailed', 'creative', 'artistic', 'perspective', 'stunning', 'texture', 'resolution',
    'scale', 'dramatic', 'capturing', 'seated', 'positioned',
    // Movements
    'pan', 'tilt', 'dolly', 'truck', 'arc', 'crane', 'steadicam', 'handheld', 'gimbal', 'zoom', 'crash zoom', 'whip pan'
  ],

  // ⚡ QUALITY & TECHNICAL (Cyan)
  quality: [
    // Resolution
    '4K', '8K', '2K', 'HD', 'Full HD', 'Ultra HD', 'high resolution', 'low resolution',
    'pixel perfect', 'crisp', 'sharp', 'detailed', 'ultra detailed', 'highly detailed',
    // Quality Terms
    'masterpiece', 'best quality', 'high quality', 'professional', 'award winning',
    'trending on artstation', 'featured on behance', 'viral', 'popular', 'famous',
    'iconic', 'legendary', 'epic', 'stunning', 'breathtaking', 'gorgeous', 'beautiful',
    'amazing', 'incredible', 'fantastic', 'wonderful', 'perfect', 'flawless', 
    'super', 'extreme', 'large', 'expressive', 'arched', 'luxurious', 'rich',
    // Technical
    'anti-aliasing', 'ray tracing', 'global illumination', 'ambient occlusion',
    'subsurface scattering', 'caustics', 'chromatic aberration', 'film grain', 'noise',
    'clean', 'smooth', 'polished', 'refined', 'optimized', 'glossy', 'shiny', 'textured',
    'embossed', 'cropped', 'reflects', 'highlights', 'visual interest',
    // NEW: Professional quality & technical terms
    'expert', 'technique', 'equipment', 'crystal', 'clear', 'pristine', 'image', 
    'beautiful', 'bokeh', 'shallow', 'depth', 'field', 'lens', 'artistic', 'blur',
    'background', 'separation', 'dreamy', 'tack', 'sharpness', 'detail', 'clarity',
    'commercial', 'magazine', 'worthy', 'gallery', 'award', 'winning'
  ],

  // 🎨 COLORS & PALETTE (Pink)
  color: [
    // Basic Colors
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white',
    'gray', 'grey', 'silver', 'gold', 'bronze', 'copper', 'platinum', 'burgundy', 'neutral',
    // Color Qualities
    'vibrant', 'vivid', 'bright', 'dark', 'light', 'pale', 'deep', 'rich', 'saturated',
    'desaturated', 'muted', 'subtle', 'bold', 'intense', 'soft', 'warm', 'cool',
    'monochrome', 'black and white', 'sepia', 'colorful', 'multicolored', 'rainbow',
    // Color Schemes
    'complementary colors', 'analogous colors', 'triadic', 'split complementary',
    'tetradic', 'monochromatic', 'neutral colors', 'earth tones', 'pastel colors',
    'neon colors', 'metallic', 'iridescent', 'holographic', 'pearlescent'
  ],

  // 😊 EMOTIONS & MOOD (Yellow)
  emotion: [
    // Positive
    'happy', 'joyful', 'cheerful', 'smiling', 'laughing', 'excited', 'enthusiastic',
    'confident', 'proud', 'peaceful', 'calm', 'serene', 'content', 'satisfied',
    'hopeful', 'optimistic', 'loving', 'caring', 'gentle', 'kind', 'friendly',
    // Negative
    'sad', 'crying', 'depressed', 'melancholic', 'angry', 'furious', 'mad', 'upset',
    'frustrated', 'annoyed', 'scared', 'frightened', 'terrified', 'worried', 'anxious',
    'stressed', 'tired', 'exhausted', 'bored', 'lonely', 'isolated', 'disappointment',
    'despair', 'weariness', 'somber', 'profound',
    // Neutral/Complex
    'mysterious', 'enigmatic', 'thoughtful', 'contemplative', 'serious', 'stern',
    'determined', 'focused', 'intense', 'passionate', 'romantic', 'seductive',
    'playful', 'mischievous', 'curious', 'surprised', 'shocked', 'amazed',
    // NEW: Professional & contemplative emotions
    'introspective', 'quiet', 'moment', 'essence', 'capturing'
  ],

  // 🏞️ SETTINGS & ENVIRONMENTS (Teal)
  setting: [
    // Natural
    'forest', 'mountain', 'desert', 'beach', 'ocean', 'lake', 'river', 'waterfall',
    'cave', 'valley', 'hill', 'meadow', 'field', 'garden', 'jungle', 'swamp',
    'tundra', 'glacier', 'volcano', 'canyon', 'cliff', 'island', 'plains', 'savanna',
    // Urban
    'city', 'town', 'village', 'street', 'alley', 'building', 'skyscraper', 'house',
    'apartment', 'office', 'store', 'restaurant', 'cafe', 'bar', 'club', 'theater',
    'museum', 'library', 'school', 'hospital', 'church', 'temple', 'mosque',
    // Indoor
    'room', 'bedroom', 'living room', 'kitchen', 'bathroom', 'basement', 'attic',
    'hallway', 'stairs', 'balcony', 'window', 'door', 'fireplace', 'couch', 'bed',
    // Fantasy/Sci-Fi
    'castle', 'palace', 'tower', 'dungeon', 'spaceship', 'space station', 'alien world',
    'futuristic city', 'cyberpunk city', 'steampunk', 'medieval', 'ancient ruins',
    'magical forest', 'enchanted', 'mystical', 'otherworldly', 'dimensional',
    'scene', 'background', 'atmosphere',
    // NEW: Office & everyday environments
    'cubicle', 'desk', 'office', 'fabric', 'walls', 'pinned', 'notes', 'papers', 
    'potted', 'plant', 'greenery', 'ordinary', 'space', 'routine', 'everyday', 'life',
    'neutral-colored', 'adorned', 'touch', 'setting', 'typical', 'context',
    'mundane', 'workday'
  ]
}

// 🔥 PATTERN MATCHING for even MORE coverage
const PROMPT_PATTERNS = {
  // Quality patterns
  quality: [
    /\b(ultra|super|hyper|extremely?|very|highly?)\s+(detailed|realistic|sharp|crisp|clear)\b/gi,
    /\b\d+k\s+(resolution|quality|detail)\b/gi,
    /\b(award\s+winning|trending\s+on|featured\s+on)\b/gi,
    /\b(professional\s+photography|expert\s+technique|high-end\s+equipment)\b/gi,
    /\b(crystal\s+clear|pristine\s+image\s+quality|stunning\s+clarity)\b/gi,
    /\b(beautiful\s+bokeh|shallow\s+depth\s+of\s+field|professional\s+lens)\b/gi,
    /\b(tack\s+sharp|perfect\s+detail|high\s+resolution)\b/gi,
  ],
  
  // Style patterns  
  style: [
    /\b\w+\s+(style|art|painting|drawing|render)\b/gi,
    /\bin\s+the\s+style\s+of\b/gi,
    /\b\w+(punk|core|wave)\b/gi,
    /\b(portrait\s+photography|fashion\s+photography|professional\s+photography)\b/gi,
    /\b(high-end\s+style|magazine-worthy|gallery-worthy)\b/gi,
    /\b(cinematic\s+style|movie-quality|film\s+grain)\b/gi,
    /\b(vintage\s+style|retro\s+aesthetic|classic\s+photography)\b/gi,
    /\b(minimalist\s+style|elegant\s+style|artistic\s+style)\b/gi,
  ],
  
  // Camera patterns
  camera: [
    /\b\d+mm\s+(lens|shot|focal)\b/gi,
    /\b(depth\s+of\s+field|dof)\b/gi,
    /\b\w+\s+(shot|angle|view|perspective)\b/gi,
    /\b(extreme\s+wide\s+shot|wide\s+shot|close\s+up|medium\s+shot)\b/gi,
    /\b(dutch\s+angle|tilted\s+composition|dynamic\s+framing)\b/gi,
    /\b(intimate\s+framing|creative\s+angle|artistic\s+perspective)\b/gi,
    /\b(professional\s+headshot|studio\s+lighting|sharp\s+focus)\b/gi,
    /\b(beautiful\s+composition|detailed\s+facial\s+features)\b/gi,
  ],
  
  // Lighting patterns
  lighting: [
    /\b\w+\s+(light|lighting|lit|illuminated)\b/gi,
    /\b(hour|time)\s+(light|lighting)\b/gi,
    /\b(golden\s+hour\s+lighting|blue\s+hour\s+lighting|natural\s+lighting)\b/gi,
    /\b(studio\s+lighting|cinematic\s+lighting|dramatic\s+lighting)\b/gi,
    /\b(soft\s+lighting|volumetric\s+lighting|ambient\s+lighting)\b/gi,
    /\b(professional\s+lighting|controlled\s+illumination|perfect\s+exposure)\b/gi,
  ],
  
  // Comment patterns - ENTIRE line containing //
  comment: [
    /^.*\/\/.*$/gm,  // Match entire line that contains // anywhere
  ]
}

// 🚀 INSTANT HIGHLIGHTER CLASS
export class InstantHighlighter {
  private keywordRegexes: Map<string, RegExp>
  private patternRegexes: Map<string, RegExp[]>

  constructor() {
    this.keywordRegexes = new Map()
    this.patternRegexes = new Map()
    this.buildRegexes()
  }

  private buildRegexes() {
    // Build keyword regexes
    for (const [category, words] of Object.entries(PROMPT_KEYWORDS)) {
      const escapedWords = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const pattern = `\\b(${escapedWords.join('|')})\\b`
      this.keywordRegexes.set(category, new RegExp(pattern, 'gi'))
    }

    // Store pattern regexes
    for (const [category, patterns] of Object.entries(PROMPT_PATTERNS)) {
      this.patternRegexes.set(category, patterns)
    }
  }

  // ⚡ INSTANT HIGHLIGHT - Sub-millisecond performance
  public highlight(text: string): HighlightSpan[] {
    const spans: HighlightSpan[] = []
    const processedRanges: Array<[number, number]> = []

    // 🚨 PROCESS COMMENTS FIRST - HIGHEST PRIORITY!
    // Comments should override all other highlighting
    const commentPatterns = this.patternRegexes.get('comment') || []
    for (const pattern of commentPatterns) {
      let match
      pattern.lastIndex = 0
      
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index
        const end = match.index + match[0].length

        spans.push({
          start,
          end,
          category: 'comment',
          text: match[0]
        })
        processedRanges.push([start, end])
      }
    }

    // Process keywords (but skip comment ranges)
    for (const [category, regex] of this.keywordRegexes.entries()) {
      let match
      regex.lastIndex = 0
      
      while ((match = regex.exec(text)) !== null) {
        const start = match.index
        const end = match.index + match[0].length

        // Check for overlaps (comments have priority)
        if (!this.hasOverlap(start, end, processedRanges)) {
          spans.push({
            start,
            end,
            category: category as any,
            text: match[0]
          })
          processedRanges.push([start, end])
        }
      }
    }

    // Process other patterns (but skip comments since they're already processed)
    for (const [category, patterns] of this.patternRegexes.entries()) {
      if (category === 'comment') continue // Skip comments - already processed

      for (const pattern of patterns) {
        let match
        pattern.lastIndex = 0
        
        while ((match = pattern.exec(text)) !== null) {
          const start = match.index
          const end = match.index + match[0].length

          if (!this.hasOverlap(start, end, processedRanges)) {
            spans.push({
              start,
              end,
              category: category as any,
              text: match[0]
            })
            processedRanges.push([start, end])
          }
        }
      }
    }

    // Sort by start position
    return spans.sort((a, b) => a.start - b.start)
  }

  private hasOverlap(start: number, end: number, ranges: Array<[number, number]>): boolean {
    return ranges.some(([rangeStart, rangeEnd]) => 
      (start < rangeEnd && end > rangeStart)
    )
  }

  // 🎯 GET CATEGORY COLOR
  public getCategoryColor(category: string): string {
    const colors = {
      subject: '#3B82F6',    // Blue
      style: '#8B5CF6',      // Purple  
      lighting: '#F59E0B',   // Orange
      camera: '#10B981',     // Green
      quality: '#06B6D4',    // Cyan
      color: '#EC4899',      // Pink
      emotion: '#EAB308',    // Yellow
      setting: '#14B8A6',    // Teal
      comment: '#6A9955'     // VSCode comment green
    }
    return colors[category as keyof typeof colors] || '#6B7280'
  }

  // 📊 GET STATS
  public getStats(): { totalKeywords: number, categories: number, patterns: number } {
    const totalKeywords = Object.values(PROMPT_KEYWORDS).reduce((sum, words) => sum + words.length, 0)
    const categories = Object.keys(PROMPT_KEYWORDS).length
    const patterns = Object.values(PROMPT_PATTERNS).reduce((sum, patterns) => sum + patterns.length, 0)
    
    return { totalKeywords, categories, patterns }
  }

  // 🔍 DEBUG: Test highlighting on a sample text
  public debugHighlight(text: string): string {
    const spans = this.highlight(text)
    let debug = `🔍 HIGHLIGHTING DEBUG for: "${text.substring(0, 100)}..."\n\n`
    debug += `Found ${spans.length} highlights:\n\n`
    
    spans.forEach((span, i) => {
      debug += `${i + 1}. "${span.text}" → ${span.category.toUpperCase()} (${span.start}-${span.end})\n`
    })
    
    if (spans.length === 0) {
      debug += "❌ NO MATCHES FOUND!\n"
      debug += "🔍 Checking individual words:\n"
      
      const words = text.toLowerCase().split(/\s+/)
      words.forEach(word => {
        const cleanWord = word.replace(/[.,!?;:"'()]/g, '')
        let found = false
        
        for (const [category, wordList] of Object.entries(PROMPT_KEYWORDS)) {
          if (wordList.some(keyword => keyword.toLowerCase() === cleanWord)) {
            debug += `  ✅ "${cleanWord}" should match ${category}\n`
            found = true
            break
          }
        }
        
        if (!found) {
          debug += `  ❌ "${cleanWord}" - no match\n`
        }
      })
    }
    
    return debug
  }
}

// 🎯 SINGLETON INSTANCE
export const instantHighlighter = new InstantHighlighter() 