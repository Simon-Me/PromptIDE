import React, { useEffect, useMemo, useState } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Camera, 
  Lightbulb,
  Palette,
  Move,
  Zap,
  Eye,
  Film,
  Settings,
  Sparkles,
  Monitor,
  Edit3,
  PlusCircle,
  Trash2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { storage } from '../../lib/storage'

interface PromptLibraryPanelProps {
  activeWorkflow: 'image' | 'video'
  onInsertPrompt: (text: string) => void
  onWorkflowChange?: (workflow: 'image' | 'video') => void
  onSmartInsertPrompt?: (element: string, category: string) => void
  onPresetClick?: (prompt: string, categoryId: string, itemLabel: string) => void
}

interface PromptCategory {
  id: string
  title: string
  icon: React.ComponentType<any>
  items: PromptItem[]
}

interface PromptItem {
  id: string
  label: string
  prompt: string
  description?: string
}

const getImagePromptCategories = (): PromptCategory[] => [
  {
    id: 'camera',
    title: 'Kamera & Komposition',
    icon: Camera,
    items: [
      { 
        id: 'extreme-wide', 
        label: 'Extreme Wide', 
        prompt: 'extreme wide shot, cinematic composition, vast landscape, professional photography, stunning vista, dramatic scale, epic scenery',
        description: 'Weiteste Einstellung für große Landschaften'
      },
      { 
        id: 'wide', 
        label: 'Wide Shot', 
        prompt: 'wide shot, establishing shot, cinematic framing, full scene composition, professional photography, detailed environment',
        description: 'Weite Einstellung für Szenen-Etablierung'
      },
      { 
        id: 'medium', 
        label: 'Medium Shot', 
        prompt: 'medium shot, balanced composition, professional portrait, natural framing, perfect lighting, detailed subject',
        description: 'Mittlere Einstellung für Portraits'
      },
      { 
        id: 'close-up', 
        label: 'Close-up', 
        prompt: 'close-up shot, intimate framing, detailed facial features, professional portrait photography, sharp focus, beautiful lighting',
        description: 'Nahaufnahme für Details'
      },
      { 
        id: 'extreme-close-up', 
        label: 'Extreme Close', 
        prompt: 'extreme close-up, macro photography, intricate details, sharp focus, professional lighting, stunning texture, high resolution',
        description: 'Extreme Nahaufnahme für Texturen'
      },
      { 
        id: 'portrait', 
        label: 'Portrait', 
        prompt: 'portrait photography, professional headshot, studio lighting, sharp focus, beautiful composition, detailed facial features, high-end photography',
        description: 'Professionelle Portraitfotografie'
      },
      { 
        id: 'aerial', 
        label: 'Aerial View', 
        prompt: 'aerial view, drone photography, bird\'s eye perspective, cinematic landscape, vast scenery, professional aerial shot, stunning overview',
        description: 'Luftaufnahme von oben'
      },
      { 
        id: 'low-angle', 
        label: 'Low Angle', 
        prompt: 'low angle shot, dramatic perspective, powerful composition, cinematic framing, heroic view, professional photography',
        description: 'Dramatische Untersicht'
      },
      { 
        id: 'high-angle', 
        label: 'High Angle', 
        prompt: 'high angle shot, overhead perspective, cinematic composition, dramatic viewpoint, professional photography, artistic framing',
        description: 'Aufsicht von oben'
      },
      { 
        id: 'dutch-angle', 
        label: 'Dutch Angle', 
        prompt: 'dutch angle, tilted composition, dynamic framing, cinematic style, artistic perspective, professional photography, creative angle',
        description: 'Schräge Kameraführung'
      },
      // NEW: More camera shots & compositions
      { 
        id: 'macro', 
        label: 'Macro', 
        prompt: 'macro photography, extreme close-up, intricate details, shallow depth of field, professional macro lens',
        description: 'Makroaufnahmen'
      },
      { 
        id: 'telephoto', 
        label: 'Telephoto', 
        prompt: 'telephoto lens, compressed perspective, shallow focus, professional portrait, bokeh background',
        description: 'Teleobjektiv-Aufnahme'
      },
      { 
        id: 'wide-angle', 
        label: 'Wide Lens', 
        prompt: 'wide angle lens, 24mm, distorted perspective, dramatic composition, architectural photography',
        description: 'Weitwinkelobjektiv'
      },
      { 
        id: 'fisheye', 
        label: 'Fisheye', 
        prompt: 'fisheye lens, extreme wide angle, spherical distortion, creative perspective, unique viewpoint',
        description: 'Fischaugenobjektiv'
      },
      { 
        id: 'tilt-shift', 
        label: 'Tilt-Shift', 
        prompt: 'tilt-shift photography, selective focus, miniature effect, professional architecture shot',
        description: 'Tilt-Shift-Effekt'
      },
      { 
        id: 'rule-thirds', 
        label: 'Rule of Thirds', 
        prompt: 'rule of thirds composition, balanced framing, professional photography, perfect positioning',
        description: 'Drittel-Regel'
      },
      { 
        id: 'leading-lines', 
        label: 'Leading Lines', 
        prompt: 'leading lines composition, perspective lines, architectural photography, depth illusion',
        description: 'Führende Linien'
      },
      { 
        id: 'symmetry', 
        label: 'Symmetry', 
        prompt: 'symmetrical composition, perfect balance, architectural photography, mirror effect',
        description: 'Symmetrische Komposition'
      },
      { 
        id: 'framing', 
        label: 'Natural Frame', 
        prompt: 'natural framing, frame within frame, creative composition, architectural elements',
        description: 'Natürlicher Rahmen'
      },
      { 
        id: 'negative-space', 
        label: 'Negative Space', 
        prompt: 'negative space composition, minimalist framing, clean background, subject isolation',
        description: 'Negativraum'
      },
      { 
        id: 'depth-field', 
        label: 'Shallow DOF', 
        prompt: 'shallow depth of field, bokeh background, subject isolation, professional portrait',
        description: 'Geringe Schärfentiefe'
      },
      { 
        id: 'deep-focus', 
        label: 'Deep Focus', 
        prompt: 'deep focus, everything sharp, landscape photography, wide aperture, professional quality',
        description: 'Tiefe Schärfe'
      }
    ]
  },
  {
    id: 'lighting',
    title: 'Beleuchtung',
    icon: Lightbulb,
    items: [
      { 
        id: 'natural', 
        label: 'Natural Light', 
        prompt: 'natural lighting, soft daylight, beautiful ambient light, organic illumination, professional photography, realistic lighting',
        description: 'Natürliches Tageslicht'
      },
      { 
        id: 'cinematic', 
        label: 'Cinematic', 
        prompt: 'cinematic lighting, dramatic illumination, movie-style lighting, professional cinematography, moody atmosphere, film-quality lighting',
        description: 'Kinoreife Beleuchtung'
      },
      { 
        id: 'golden-hour', 
        label: 'Golden Hour', 
        prompt: 'golden hour lighting, warm sunset glow, magical hour, beautiful natural light, professional outdoor photography, stunning atmosphere',
        description: 'Warmes Sonnenuntergangslicht'
      },
      { 
        id: 'blue-hour', 
        label: 'Blue Hour', 
        prompt: 'blue hour lighting, twilight atmosphere, deep blue sky, magical evening light, professional photography, serene ambiance',
        description: 'Blaue Stunde am Abend'
      },
      { 
        id: 'stormy', 
        label: 'Stormy Scene', 
        prompt: 'stormy weather, dramatic clouds, moody ambient light, rain-soaked reflections, lightning in distance, cinematic tension',
        description: 'Dramatische Gewitterszene'
      },
      { 
        id: 'neon-alley', 
        label: 'Neon Alley', 
        prompt: 'rainy neon-lit alley, cyberpunk glow, colorful reflections on wet ground, backlit silhouettes, atmospheric fog',
        description: 'Urbane Neon-Gasse bei Regen'
      },
      { 
        id: 'sun-dappled-forest', 
        label: 'Sun‑Dappled Forest', 
        prompt: 'sun dappled forest, shafts of light through leaves, soft ambient glow, misty atmosphere, tranquil natural scene',
        description: 'Waldszene mit Lichtstrahlen'
      },
      { 
        id: 'campfire-night', 
        label: 'Campfire Night', 
        prompt: 'nighttime campfire, warm flickering firelight, faces lit by flames, deep blue ambient night, cozy atmosphere',
        description: 'Nacht am Lagerfeuer'
      },
      { 
        id: 'volumetric', 
        label: 'Volumetric', 
        prompt: 'volumetric lighting, god rays, atmospheric lighting, cinematic beams, professional photography, dramatic light rays',
        description: 'Sichtbare Lichtstrahlen'
      },
      { 
        id: 'neon', 
        label: 'Neon', 
        prompt: 'neon lighting, cyberpunk atmosphere, colorful glow, urban night scene, professional photography, futuristic illumination',
        description: 'Neonlicht für urbane Szenen'
      },
      { 
        id: 'moonlit-noir', 
        label: 'Moonlit Noir', 
        prompt: 'noir lighting, deep shadows, strong chiaroscuro, silver moonlight, sharp rim light, cinematic contrast, moody atmosphere',
        description: 'Film-Noir bei Mondlicht'
      },
      { 
        id: 'high-key-studio', 
        label: 'High-Key Studio', 
        prompt: 'high key studio lighting, soft even illumination, minimal shadows, clean backdrop, beauty dish and softboxes, editorial look',
        description: 'Helles Studio-Setup'
      },
      { 
        id: 'low-key-portrait', 
        label: 'Low-Key Portrait', 
        prompt: 'low key lighting, dramatic shadows, single key light, deep blacks, cinematic mood, subtle edge light',
        description: 'Dunkles, dramatisches Portrait'
      },
      { 
        id: 'sunset-backlit', 
        label: 'Sunset Backlit', 
        prompt: 'backlit by warm sunset, glowing rim light, flares and haze, golden halo, dreamy romantic atmosphere',
        description: 'Gegenlicht im Sonnenuntergang'
      },
      { 
        id: 'practical-neons', 
        label: 'Practical Neons', 
        prompt: 'practical neon lights, magenta and cyan color wash, reflective surfaces, wet streets, atmospheric vapor',
        description: 'Neons als praktische Lichtquellen'
      }
    ]
  },
  {
    id: 'style',
    title: 'Stil & Optik',
    icon: Palette,
    items: [
      { 
        id: 'photorealistic', 
        label: 'Photorealistic', 
        prompt: 'photorealistic, hyperrealistic, ultra-detailed, lifelike, professional photography, stunning realism, high resolution, perfect details',
        description: 'Fotorealistische Darstellung'
      },
      { 
        id: 'cinematic', 
        label: 'Cinematic', 
        prompt: 'cinematic style, movie-quality, film grain, professional cinematography, dramatic composition, Hollywood-style, epic visuals',
        description: 'Kinoreifer Stil'
      },
      { 
        id: 'vintage', 
        label: 'Vintage', 
        prompt: 'vintage style, retro aesthetic, classic photography, nostalgic mood, film photography, timeless appeal, aged patina',
        description: 'Vintage-Ästhetik'
      },
      { 
        id: 'minimalist', 
        label: 'Minimalist', 
        prompt: 'minimalist style, clean composition, simple elegance, professional design, modern aesthetic, uncluttered, sophisticated',
        description: 'Reduzierte, elegante Optik'
      },
      { 
        id: 'dramatic', 
        label: 'Dramatic', 
        prompt: 'dramatic style, intense mood, powerful composition, bold contrasts, cinematic drama, professional photography, striking visuals',
        description: 'Dramatische Bildsprache'
      },
      { 
        id: 'elegant', 
        label: 'Elegant', 
        prompt: 'elegant style, sophisticated composition, refined aesthetics, luxury photography, high-end visuals, premium quality, tasteful design',
        description: 'Elegante, gehobene Optik'
      },
      { 
        id: 'artistic', 
        label: 'Artistic', 
        prompt: 'artistic style, creative composition, fine art photography, unique perspective, professional artistry, gallery-worthy, expressive',
        description: 'Künstlerische Darstellung'
      },
      { 
        id: 'fashion', 
        label: 'Fashion', 
        prompt: 'fashion photography, high-end style, professional modeling, studio quality, magazine-worthy, elegant composition, luxury aesthetic',
        description: 'Mode-Fotografie'
      }
    ]
  },
  {
    id: 'colors',
    title: 'Farben & Mood',
    icon: Sparkles,
    items: [
      { 
        id: 'warm-tones', 
        label: 'Warm Tones', 
        prompt: 'warm color palette, golden tones, amber hues, cozy atmosphere, sunset colors',
        description: 'Warme Farbtöne'
      },
      { 
        id: 'cool-tones', 
        label: 'Cool Tones', 
        prompt: 'cool color palette, blue tones, cyan hues, modern atmosphere, ice colors',
        description: 'Kühle Farbtöne'
      },
      { 
        id: 'monochrome', 
        label: 'Monochrome', 
        prompt: 'monochrome photography, black and white, high contrast, artistic mood',
        description: 'Schwarz-Weiß'
      },
      { 
        id: 'sepia', 
        label: 'Sepia', 
        prompt: 'sepia tone, vintage brown, nostalgic mood, classic photography',
        description: 'Sepia-Tönung'
      },
      { 
        id: 'vibrant', 
        label: 'Vibrant', 
        prompt: 'vibrant colors, saturated tones, bold palette, energetic mood',
        description: 'Lebendige Farben'
      },
      { 
        id: 'muted', 
        label: 'Muted', 
        prompt: 'muted colors, desaturated tones, subtle palette, calm mood',
        description: 'Gedämpfte Farben'
      },
      { 
        id: 'neon', 
        label: 'Neon', 
        prompt: 'neon colors, electric blue, hot pink, cyberpunk palette, futuristic mood',
        description: 'Neonfarben'
      },
      { 
        id: 'pastel', 
        label: 'Pastel', 
        prompt: 'pastel colors, soft tones, gentle palette, dreamy mood',
        description: 'Pastelltöne'
      },
      { 
        id: 'earth-tones', 
        label: 'Earth Tones', 
        prompt: 'earth tones, natural colors, brown ochre, organic palette',
        description: 'Erdtöne'
      },
      { 
        id: 'complementary', 
        label: 'Complementary', 
        prompt: 'complementary colors, opposite hues, dynamic contrast, bold palette',
        description: 'Komplementärfarben'
      },
      { 
        id: 'analogous', 
        label: 'Analogous', 
        prompt: 'analogous colors, harmonious tones, smooth transitions, balanced palette',
        description: 'Verwandte Farben'
      },
      { 
        id: 'gradient', 
        label: 'Gradient', 
        prompt: 'gradient colors, smooth transition, ombre effect, flowing tones',
        description: 'Farbverlauf'
      }
    ]
  },
  {
    id: 'quality',
    title: 'Qualität & Technik',
    icon: Settings,
    items: [
      { 
        id: 'professional', 
        label: 'Professional', 
        prompt: 'professional photography, expert technique, high-end equipment, perfect exposure, commercial quality, award-winning',
        description: 'Professionelle Fotoqualität'
      },
      { 
        id: 'high-res', 
        label: 'High Resolution', 
        prompt: 'high resolution, ultra-detailed, sharp focus, crystal clear, professional quality, stunning detail, pristine image quality',
        description: 'Hohe Auflösung und Schärfe'
      },
      { 
        id: 'bokeh', 
        label: 'Bokeh', 
        prompt: 'beautiful bokeh, shallow depth of field, professional lens, artistic blur, stunning background separation, dreamy atmosphere',
        description: 'Schöne Hintergrundunschärfe'
      },
      { 
        id: 'sharp', 
        label: 'Tack Sharp', 
        prompt: 'tack sharp, crystal clear focus, professional sharpness, perfect detail, high-end lens quality, stunning clarity',
        description: 'Perfekte Schärfe'
      },
      // NEW: More technical quality options
      { 
        id: '8k', 
        label: '8K Quality', 
        prompt: '8K resolution, ultra high definition, maximum detail, professional capture, crystal clarity',
        description: '8K Auflösung'
      },
      { 
        id: '4k', 
        label: '4K Quality', 
        prompt: '4K resolution, high definition, sharp detail, professional quality, crisp image',
        description: '4K Auflösung'
      },
      { 
        id: 'hdr', 
        label: 'HDR', 
        prompt: 'HDR photography, high dynamic range, perfect exposure, detailed shadows and highlights',
        description: 'HDR-Fotografie'
      },
      { 
        id: 'raw', 
        label: 'RAW Quality', 
        prompt: 'RAW photography, uncompressed quality, professional capture, maximum detail retention',
        description: 'RAW-Qualität'
      },
      { 
        id: 'grain', 
        label: 'Film Grain', 
        prompt: 'film grain, analog texture, cinematic quality, vintage feel, authentic look',
        description: 'Filmkorn'
      },
      { 
        id: 'noise-free', 
        label: 'Noise Free', 
        prompt: 'noise free, clean image, perfect quality, professional capture, pristine result',
        description: 'Rauschfrei'
      },
      { 
        id: 'color-accurate', 
        label: 'Color Accurate', 
        prompt: 'color accurate, perfect color reproduction, calibrated colors, professional quality',
        description: 'Farbgetreu'
      },
      { 
        id: 'dynamic-range', 
        label: 'Dynamic Range', 
        prompt: 'wide dynamic range, perfect exposure balance, detailed shadows, bright highlights',
        description: 'Dynamikumfang'
      },
      { 
        id: 'chromatic', 
        label: 'Chromatic Free', 
        prompt: 'no chromatic aberration, perfect lens correction, professional optics quality',
        description: 'Chromatikfrei'
      },
      { 
        id: 'vignette', 
        label: 'Subtle Vignette', 
        prompt: 'subtle vignette effect, natural darkening, professional finish, focused attention',
        description: 'Dezente Vignette'
      }
    ]
  }
]

const getVideoPromptCategories = (): PromptCategory[] => [
  {
    id: 'camera-video',
    title: 'Kamera & Bewegung',
    icon: Camera,
    items: [
      // Movement
      { 
        id: 'pan-left', 
        label: 'Pan Left', 
        prompt: 'smooth camera pan left, cinematic movement, fluid motion, professional cinematography, steady tracking, elegant sweep',
        description: 'Gleichmäßige Kameraschwenkung nach links'
      },
      { 
        id: 'pan-right', 
        label: 'Pan Right', 
        prompt: 'smooth camera pan right, cinematic movement, fluid motion, professional cinematography, steady tracking, graceful sweep',
        description: 'Gleichmäßige Kameraschwenkung nach rechts'
      },
      { 
        id: 'tilt-up', 
        label: 'Tilt Up', 
        prompt: 'camera tilt up, revealing shot, dramatic upward movement, cinematic technique, professional cinematography, powerful reveal',
        description: 'Kameraneigung nach oben'
      },
      { 
        id: 'tilt-down', 
        label: 'Tilt Down', 
        prompt: 'camera tilt down, dramatic downward movement, cinematic reveal, professional technique, smooth motion, elegant descent',
        description: 'Kameraneigung nach unten'
      },
      { 
        id: 'dolly-in', 
        label: 'Dolly In', 
        prompt: 'dolly in shot, smooth approach, cinematic push-in, professional camera movement, dramatic zoom, intimate framing',
        description: 'Kamerafahrt zum Motiv hin'
      },
      { 
        id: 'dolly-out', 
        label: 'Dolly Out', 
        prompt: 'dolly out shot, smooth pullback, cinematic reveal, professional camera movement, expanding view, dramatic retreat',
        description: 'Kamerafahrt vom Motiv weg'
      },
      { 
        id: 'tracking-left', 
        label: 'Tracking Left', 
        prompt: 'tracking shot left, smooth lateral movement, cinematic following, professional cinematography, fluid motion, elegant tracking',
        description: 'Seitliche Verfolgungsfahrt nach links'
      },
      { 
        id: 'tracking-right', 
        label: 'Tracking Right', 
        prompt: 'tracking shot right, smooth lateral movement, cinematic following, professional cinematography, fluid motion, graceful tracking',
        description: 'Seitliche Verfolgungsfahrt nach rechts'
      },
      { 
        id: 'crane-up', 
        label: 'Crane Up', 
        prompt: 'crane shot ascending, dramatic upward movement, cinematic elevation, professional cinematography, majestic rise, aerial perspective',
        description: 'Kranfahrt nach oben'
      },
      { 
        id: 'crane-down', 
        label: 'Crane Down', 
        prompt: 'crane shot descending, dramatic downward movement, cinematic descent, professional cinematography, graceful fall, ground perspective',
        description: 'Kranfahrt nach unten'
      },
      { 
        id: 'orbit', 
        label: 'Orbit Shot', 
        prompt: 'orbit shot, circular camera movement, 360-degree rotation, cinematic technique, professional cinematography, dynamic rotation',
        description: 'Kreisförmige Kamerafahrt um das Motiv'
      },
      // Style
      { 
        id: 'handheld', 
        label: 'Handheld', 
        prompt: 'handheld camera, organic movement, realistic shake, documentary style, natural motion, authentic feel, intimate cinematography',
        description: 'Handkamera für natürliche Bewegung'
      },
      { 
        id: 'steadicam', 
        label: 'Steadicam', 
        prompt: 'steadicam shot, smooth floating movement, professional stabilization, cinematic flow, seamless motion, elegant glide',
        description: 'Stabilisierte, schwebende Kameraführung'
      },
      { 
        id: 'locked-off', 
        label: 'Locked Off', 
        prompt: 'locked off camera, static shot, tripod stability, professional setup, steady framing, controlled composition',
        description: 'Statische Kamera auf Stativ'
      },
      { 
        id: 'gimbal', 
        label: 'Gimbal', 
        prompt: 'gimbal stabilized, smooth movement, professional stabilization, cinematic flow, fluid motion, modern cinematography',
        description: 'Gimbal-stabilisierte Aufnahme'
      },
      { 
        id: 'drone', 
        label: 'Drone Shot', 
        prompt: 'drone cinematography, aerial movement, sweeping shots, cinematic elevation, professional aerial work, stunning perspectives',
        description: 'Drohnenaufnahme aus der Luft'
      }
    ]
  },
  {
    id: 'style-video',
    title: 'Style',
    icon: Palette,
    items: [
      { id: 'cinematic-style', label: 'Cinematic', prompt: 'cinematic style, filmic color grading, soft contrast, subtle film grain, gentle halation, professional cinematography', description: 'Filmischer Look' },
      { id: 'documentary', label: 'Documentary', prompt: 'documentary style, natural colors, realistic handheld motion, available light, authentic tone', description: 'Dokumentarischer Stil' },
      { id: 'music-video', label: 'Music Video', prompt: 'music video style, bold color palette, dynamic cuts, stylized lighting, high energy visuals', description: 'Knackiger Musikvideo-Look' },
    ]
  },
  {
    id: 'motion-effects',
    title: 'Bewegungseffekte',
    icon: Zap,
    items: [
      { 
        id: 'slow-motion', 
        label: 'Slow Motion', 
        prompt: 'slow motion, dramatic timing, cinematic speed, professional slow-mo, elegant movement, time manipulation, beautiful flow',
        description: 'Zeitlupe für dramatische Effekte'
      },
      { 
        id: 'time-lapse', 
        label: 'Time Lapse', 
        prompt: 'time lapse, accelerated time, compressed motion, cinematic technique, professional time manipulation, dynamic progression',
        description: 'Zeitraffer-Effekt'
      },
      { 
        id: 'hyperlapse', 
        label: 'Hyperlapse', 
        prompt: 'hyperlapse, moving time-lapse, dynamic motion, cinematic technique, professional execution, stunning movement',
        description: 'Bewegter Zeitraffer'
      },
      { 
        id: 'freeze-frame', 
        label: 'Freeze Frame', 
        prompt: 'freeze frame, motion stop, dramatic pause, cinematic technique, professional timing, impactful moment',
        description: 'Eingefrorene Bewegung'
      },
      { 
        id: 'speed-ramping', 
        label: 'Speed Ramping', 
        prompt: 'speed ramping, variable speed, cinematic timing, professional technique, dynamic tempo, smooth transitions',
        description: 'Variable Geschwindigkeit'
      }
    ]
  },
  {
    id: 'camera-shake',
    title: 'Kamera-Dynamik',
    icon: Film,
    items: [
      { 
        id: 'subtle-shake', 
        label: 'Subtle Shake', 
        prompt: 'subtle camera shake, natural movement, realistic motion, organic feel, professional handheld, authentic cinematography',
        description: 'Dezente Kamerabewegung'
      },
      { 
        id: 'action-shake', 
        label: 'Action Shake', 
        prompt: 'action camera shake, intense movement, dynamic motion, adrenaline-fueled, professional action cinematography, energetic feel',
        description: 'Dynamische Action-Kamera'
      },
      { 
        id: 'whip-pan', 
        label: 'Whip Pan', 
        prompt: 'whip pan, fast camera movement, motion blur transition, dynamic cinematography, professional technique, energetic cut',
        description: 'Schnelle Kameraschwenkung'
      },
      { 
        id: 'crash-zoom', 
        label: 'Crash Zoom', 
        prompt: 'crash zoom, rapid zoom movement, dramatic effect, cinematic technique, professional execution, intense focus',
        description: 'Abrupte Zoom-Bewegung'
      },
      { 
        id: 'dutch-roll', 
        label: 'Dutch Roll', 
        prompt: 'dutch roll, tilted movement, disorienting effect, cinematic technique, professional execution, dynamic angle',
        description: 'Rollende Kamerabewegung'
      }
    ]
  }
]

export function PromptLibraryPanel({ activeWorkflow, onInsertPrompt, onWorkflowChange, onSmartInsertPrompt, onPresetClick }: PromptLibraryPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [imageCategories, setImageCategories] = useState<PromptCategory[]>(getImagePromptCategories())
  const [videoCategories, setVideoCategories] = useState<PromptCategory[]>(getVideoPromptCategories())
  const [editingTarget, setEditingTarget] = useState<{ categoryId: string, itemId: string } | null>(null)

  const categories = activeWorkflow === 'image' ? imageCategories : videoCategories

  // Persist and load categories (without icons in storage)
  const serialize = (cats: PromptCategory[]) => cats.map(c => ({ id: c.id, title: c.title, items: c.items }))
  const revive = (saved: any[], defaults: PromptCategory[]): PromptCategory[] => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      camera: Camera,
      lighting: Lightbulb,
      style: Palette,
      'style-video': Palette,
      colors: Sparkles,
      quality: Settings,
      'camera-video': Camera,
      'motion-effects': Zap,
      'camera-shake': Film,
    }
    const defaultById = Object.fromEntries(defaults.map(d => [d.id, d]))
    const savedById = Object.fromEntries((saved || []).map((s: any) => [s.id, s]))

    // Ensure all default categories exist
    const mergedCategoryIds = new Set<string>([...Object.keys(defaultById), ...Object.keys(savedById)])

    const merged: PromptCategory[] = []
    for (const catId of mergedCategoryIds) {
      const def = defaultById[catId]
      const s = savedById[catId]
      const icon = (def && def.icon) || iconMap[catId] || Camera
      const title = (s && s.title) || (def && def.title) || catId

      const savedItems: PromptItem[] = Array.isArray(s?.items) ? s.items : []
      const defaultItems: PromptItem[] = Array.isArray(def?.items) ? def.items : []
      const savedIds = new Set(savedItems.map(i => i.id))
      // Append any default items that are not yet saved
      const appendedDefaults = defaultItems.filter(i => !savedIds.has(i.id))
      const items = [...savedItems, ...appendedDefaults]
      merged.push({ id: catId, title, icon, items })
    }
    return merged
  }

  useEffect(() => {
    const load = async () => {
      const savedImage = await storage.loadData('prompt_presets_image')
      const savedVideo = await storage.loadData('prompt_presets_video')
      if (Array.isArray(savedImage) && savedImage.length) setImageCategories(revive(savedImage, getImagePromptCategories()))
      if (Array.isArray(savedVideo) && savedVideo.length) setVideoCategories(revive(savedVideo, getVideoPromptCategories()))
    }
    load()
  }, [])

  const saveCategories = async (cats: PromptCategory[], workflow: 'image' | 'video') => {
    const key = workflow === 'image' ? 'prompt_presets_image' : 'prompt_presets_video'
    await storage.saveData(key, serialize(cats))
  }

  const updateCategoryItem = async (categoryId: string, itemId: string, patch: Partial<PromptItem>) => {
    const setter = activeWorkflow === 'image' ? setImageCategories : setVideoCategories
    const current = activeWorkflow === 'image' ? imageCategories : videoCategories
    const updated = current.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.map(it => it.id === itemId ? { ...it, ...patch } : it) } : cat)
    setter(updated)
    await saveCategories(updated, activeWorkflow)
  }

  const addCategoryItem = async (categoryId: string) => {
    const setter = activeWorkflow === 'image' ? setImageCategories : setVideoCategories
    const current = activeWorkflow === 'image' ? imageCategories : videoCategories
    const newItem: PromptItem = { id: `item_${Date.now()}`, label: 'Neues Element', prompt: '', description: '' }
    const updated = current.map(cat => cat.id === categoryId ? { ...cat, items: [newItem, ...cat.items] } : cat)
    setter(updated)
    await saveCategories(updated, activeWorkflow)
    setEditingTarget({ categoryId, itemId: newItem.id })
  }

  const removeCategoryItem = async (categoryId: string, itemId: string) => {
    const setter = activeWorkflow === 'image' ? setImageCategories : setVideoCategories
    const current = activeWorkflow === 'image' ? imageCategories : videoCategories
    const updated = current.map(cat => cat.id === categoryId ? { ...cat, items: cat.items.filter(it => it.id !== itemId) } : cat)
    setter(updated)
    await saveCategories(updated, activeWorkflow)
    if (editingTarget && editingTarget.categoryId === categoryId && editingTarget.itemId === itemId) {
      setEditingTarget(null)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const handleInsertPrompt = (prompt: string) => {
    onInsertPrompt(prompt)
  }

  const handlePresetClick = (prompt: string, categoryId: string, itemLabel: string) => {
    if (onPresetClick) {
      onPresetClick(prompt, categoryId, itemLabel)
      return
    }
    if (onSmartInsertPrompt) {
      onSmartInsertPrompt(prompt, categoryId)
      return
    }
    onInsertPrompt(prompt)
  }

  return (
    <div className="h-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
      {/* Compact Header with Workflow Switch */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Prompt Elements
          </h2>
          {/* Segmented Image/Video Switch */}
          <div className="segmented">
            <button
              onClick={() => onWorkflowChange?.('image')}
              className={cn('segment text-xs', activeWorkflow === 'image' && 'active')}
            >
              📸 Photo
            </button>
            <button
              onClick={() => onWorkflowChange?.('video')}
              className={cn('segment text-xs', activeWorkflow === 'video' && 'active')}
            >
              🎬 Video
            </button>
          </div>
        </div>
      </div>
      
      {/* Compact Categories */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-white dark:bg-slate-800">
        {categories.map(category => {
          const isExpanded = expandedSections.includes(category.id)
          
          return (
            <div key={category.id} className="border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900">
              <div className="w-full flex items-center gap-1.5 p-2 rounded-t">
                <button
                  onClick={() => toggleSection(category.id)}
                  className="flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded px-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  )}
                  <category.icon className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {category.title}
                  </span>
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto bg-slate-200 dark:bg-slate-700 px-1 rounded-full">
                  {category.items.length}
                </span>
                <button
                  onClick={() => addCategoryItem(category.id)}
                  className="ml-1 px-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  title="Neues Element hinzufügen"
                >
                  <PlusCircle className="w-3 h-3" />
                </button>
              </div>
              
              {/* Compact Grid/Layout */}
              {isExpanded && (
                <div className="p-1.5 pt-0 bg-slate-50 dark:bg-slate-900 rounded-b">
                  <div className={cn('grid gap-1', 'grid-cols-2')}>
                    {category.items.map(item => (
                      <div key={item.id} className="group relative w-full p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        {/* Hover pencil */}
                        <button
                          onClick={() => setEditingTarget({ categoryId: category.id, itemId: item.id })}
                          className="absolute top-1 right-1 p-1 rounded bg-slate-700/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Dieses Element bearbeiten"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {editingTarget && editingTarget.categoryId === category.id && editingTarget.itemId === item.id ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <input
                                className="flex-1 px-2 py-1 text-xs rounded bg-slate-800/40 border border-slate-700/60 text-slate-100"
                                value={item.label}
                                onChange={(e) => updateCategoryItem(category.id, item.id, { label: e.target.value })}
                                placeholder="Label"
                              />
                              <button
                                onClick={() => removeCategoryItem(category.id, item.id)}
                                className="px-2 py-1 text-xs rounded border border-red-400/50 text-red-400 hover:bg-red-500/10"
                                title="Löschen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <textarea
                              className="w-full px-2 py-1 text-xs rounded bg-slate-800/40 border border-slate-700/60 text-slate-100"
                              value={item.prompt}
                              onChange={(e) => updateCategoryItem(category.id, item.id, { prompt: e.target.value })}
                              placeholder="Prompt-Inhalt"
                              rows={3}
                            />
                            <input
                              className="w-full px-2 py-1 text-xs rounded bg-slate-800/40 border border-slate-700/60 text-slate-100"
                              value={item.description || ''}
                              onChange={(e) => updateCategoryItem(category.id, item.id, { description: e.target.value })}
                              placeholder="Beschreibung (optional)"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={() => setEditingTarget(null)}
                                className="text-xs px-2 py-1 rounded border hover:bg-slate-100/60 dark:hover:bg-slate-700/60 border-slate-300/40"
                              >
                                Fertig
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePresetClick(item.prompt, category.id, item.label)}
                            className="w-full text-left"
                            title={item.prompt}
                          >
                            <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate mb-0.5">
                              {item.label}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                              {item.description || item.prompt.split(',')[0]}
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
} 