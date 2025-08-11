export interface PromptSuggestion {
  word: string
  category: string
  suggestions: string[]
  description: string
}

export const promptSuggestions: PromptSuggestion[] = [
  // Camera & Photography
  {
    word: "camera",
    category: "photography",
    suggestions: [
      "DSLR camera", "mirrorless camera", "medium format camera", "film camera", "vintage camera",
      "professional camera", "cinema camera", "RED camera", "ARRI camera", "Blackmagic camera"
    ],
    description: "Camera types and brands"
  },
  {
    word: "lens",
    category: "photography", 
    suggestions: [
      "50mm lens", "85mm lens", "24-70mm lens", "70-200mm lens", "macro lens",
      "wide-angle lens", "telephoto lens", "prime lens", "zoom lens", "fish-eye lens"
    ],
    description: "Lens types and focal lengths"
  },
  {
    word: "shot",
    category: "cinematography",
    suggestions: [
      "close-up shot", "medium shot", "wide shot", "extreme close-up", "establishing shot",
      "tracking shot", "dolly shot", "crane shot", "handheld shot", "static shot"
    ],
    description: "Camera shot types"
  },
  {
    word: "drone",
    category: "cinematography",
    suggestions: [
      "aerial drone shot", "bird's eye view", "drone flyover", "drone tracking shot",
      "ascending drone shot", "descending drone shot", "orbital drone shot", "reveal drone shot"
    ],
    description: "Drone cinematography techniques"
  },

  // Lighting
  {
    word: "lighting",
    category: "lighting",
    suggestions: [
      "cinematic lighting", "dramatic lighting", "soft lighting", "hard lighting", "natural lighting",
      "studio lighting", "golden hour lighting", "blue hour lighting", "rim lighting", "backlighting"
    ],
    description: "Lighting techniques and styles"
  },
  {
    word: "shadows",
    category: "lighting",
    suggestions: [
      "dramatic shadows", "soft shadows", "harsh shadows", "long shadows", "deep shadows",
      "cast shadows", "rim shadows", "contoured shadows", "mysterious shadows"
    ],
    description: "Shadow styles and effects"
  },

  // People & Characters
  {
    word: "person",
    category: "people",
    suggestions: [
      "elegant person", "mysterious person", "confident person", "graceful person",
      "professional person", "artistic person", "fashionable person", "charismatic person"
    ],
    description: "Person characteristics"
  },
  {
    word: "woman",
    category: "people",
    suggestions: [
      "elegant woman", "beautiful woman", "confident woman", "mysterious woman", "graceful woman",
      "professional woman", "artistic woman", "sophisticated woman", "charismatic woman"
    ],
    description: "Woman characteristics"
  },
  {
    word: "man",
    category: "people",
    suggestions: [
      "handsome man", "confident man", "mysterious man", "elegant man", "rugged man",
      "professional man", "artistic man", "sophisticated man", "charismatic man"
    ],
    description: "Man characteristics"
  },
  {
    word: "face",
    category: "people",
    suggestions: [
      "expressive face", "serene face", "striking face", "gentle face", "intense face",
      "weathered face", "youthful face", "wise face", "captivating face"
    ],
    description: "Facial expressions and qualities"
  },
  {
    word: "eyes",
    category: "people",
    suggestions: [
      "piercing eyes", "gentle eyes", "mysterious eyes", "bright eyes", "deep eyes",
      "sparkling eyes", "intense eyes", "soulful eyes", "captivating eyes"
    ],
    description: "Eye descriptions"
  },

  // Poses & Actions
  {
    word: "pose",
    category: "poses",
    suggestions: [
      "confident pose", "elegant pose", "dynamic pose", "relaxed pose", "dramatic pose",
      "artistic pose", "natural pose", "professional pose", "candid pose"
    ],
    description: "Pose styles"
  },
  {
    word: "running",
    category: "movement",
    suggestions: [
      "dynamic running", "sprint running", "marathon running", "trail running",
      "beach running", "forest running", "urban running", "motion blur running"
    ],
    description: "Running styles and contexts"
  },
  {
    word: "walking",
    category: "movement",
    suggestions: [
      "confident walking", "casual walking", "elegant walking", "purposeful walking",
      "slow motion walking", "silhouette walking", "street walking"
    ],
    description: "Walking styles"
  },

  // Environments & Locations
  {
    word: "landscape",
    category: "environment",
    suggestions: [
      "mountain landscape", "coastal landscape", "forest landscape", "desert landscape",
      "urban landscape", "rural landscape", "dramatic landscape", "serene landscape"
    ],
    description: "Landscape types"
  },
  {
    word: "mountain",
    category: "environment",
    suggestions: [
      "majestic mountain", "snow-capped mountain", "rugged mountain", "misty mountain",
      "alpine mountain", "volcanic mountain", "desert mountain", "forest mountain"
    ],
    description: "Mountain characteristics"
  },
  {
    word: "ocean",
    category: "environment",
    suggestions: [
      "calm ocean", "stormy ocean", "turquoise ocean", "deep blue ocean",
      "sunset ocean", "sunrise ocean", "tropical ocean", "arctic ocean"
    ],
    description: "Ocean conditions and styles"
  },
  {
    word: "city",
    category: "environment",
    suggestions: [
      "modern city", "futuristic city", "historic city", "bustling city", "neon city",
      "cyberpunk city", "metropolis city", "coastal city", "mountain city"
    ],
    description: "City types and styles"
  },

  // Colors & Mood
  {
    word: "color",
    category: "color",
    suggestions: [
      "vibrant colors", "muted colors", "warm colors", "cool colors", "monochromatic colors",
      "complementary colors", "saturated colors", "desaturated colors", "natural colors"
    ],
    description: "Color palettes and styles"
  },
  {
    word: "mood",
    category: "mood",
    suggestions: [
      "dramatic mood", "serene mood", "mysterious mood", "romantic mood", "energetic mood",
      "melancholic mood", "uplifting mood", "intense mood", "peaceful mood"
    ],
    description: "Mood and atmosphere"
  },

  // Technical & Quality
  {
    word: "resolution",
    category: "technical",
    suggestions: [
      "4K resolution", "8K resolution", "ultra high resolution", "high resolution",
      "cinema resolution", "broadcast resolution", "web resolution"
    ],
    description: "Image resolution standards"
  },
  {
    word: "quality",
    category: "technical",
    suggestions: [
      "professional quality", "studio quality", "broadcast quality", "cinema quality",
      "high quality", "premium quality", "commercial quality", "artistic quality"
    ],
    description: "Quality standards"
  },

  // Styles & Aesthetics
  {
    word: "style",
    category: "style",
    suggestions: [
      "cinematic style", "documentary style", "fashion style", "artistic style",
      "vintage style", "modern style", "minimalist style", "dramatic style"
    ],
    description: "Visual styles"
  },
  {
    word: "aesthetic",
    category: "style",
    suggestions: [
      "cinematic aesthetic", "vintage aesthetic", "modern aesthetic", "minimalist aesthetic",
      "cyberpunk aesthetic", "film noir aesthetic", "art deco aesthetic"
    ],
    description: "Aesthetic styles"
  }
]

// Function to get suggestions for a word
export function getSuggestionsForWord(word: string): string[] {
  const suggestion = promptSuggestions.find(s => 
    s.word.toLowerCase() === word.toLowerCase() ||
    word.toLowerCase().includes(s.word.toLowerCase()) ||
    s.word.toLowerCase().includes(word.toLowerCase())
  )
  return suggestion ? suggestion.suggestions : []
}

// Function to get all suggestions by category
export function getSuggestionsByCategory(category: string): PromptSuggestion[] {
  return promptSuggestions.filter(s => s.category === category)
}

// Function to search suggestions
export function searchSuggestions(query: string): PromptSuggestion[] {
  const lowerQuery = query.toLowerCase()
  return promptSuggestions.filter(s => 
    s.word.toLowerCase().includes(lowerQuery) ||
    s.suggestions.some(suggestion => suggestion.toLowerCase().includes(lowerQuery)) ||
    s.description.toLowerCase().includes(lowerQuery)
  )
} 