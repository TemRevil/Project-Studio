# CHARACTER.md — Project Studio 1.0
## Temy's Character — Animation Type Only

---

## CHARACTER OVERVIEW

One character. Always the same character. Looks like temy.
Papercraft illustration style — layered paper cutout aesthetic, soft edges, slight texture.
This character is the face of the series. He explains, reacts, and guides.
He never speaks directly to the viewer in a performative way — he just explains, as if thinking out loud.

---

## CHARACTER DESIGN SPEC

Style: Papercraft / paper cutout illustration
Palette: Follows papercraft.md — cream skin tones, kraft paper clothing, teal accent on one element only (could be a shirt detail, glasses, or background element — temy to decide once and lock it)
Texture: Slight paper grain, visible cut edges, subtle drop shadow beneath character layers
Size on canvas: Character occupies max 40% of canvas width when centered, 30% when side-positioned

---

## EXPRESSION LIBRARY

Stored in: `/attachments/characters/`

| File | Expression | Used When |
|---|---|---|
| `idle.png` | Neutral, slight upward gaze | Default, scene transitions |
| `talking.png` | Mouth slightly open, engaged | During narration scenes |
| `thinking.png` | Hand near chin, eyes up-left | Problem/question reveal scenes |
| `surprised.png` | Eyebrows raised, eyes wide | Sarcasm delivery beat |
| `pointing.png` | One arm extended toward visual | When directing viewer to an element |
| `laughing.png` | Slight smile, relaxed | Punchline / ending line |
| `explaining.png` | Both hands open, demonstrating | Technical explanation scenes |
| `shrug.png` | Shoulders raised, one eyebrow up | "Obviously this is absurd" moments |

Minimum set to have before any animation video ships: idle, talking, thinking, pointing.
All expressions must be on transparent background PNG, same dimensions, same character position.

---

## REMOTION CHARACTER IMPLEMENTATION

### Method: PNG Sequence Switching
No skeleton animation. No rigging. No complex libraries.
Switch between expression PNGs based on `useCurrentFrame()`.

```jsx
import { useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion'
import { spring } from 'remotion'

const expressions = {
  idle: staticFile('characters/idle.png'),
  talking: staticFile('characters/talking.png'),
  thinking: staticFile('characters/thinking.png'),
  surprised: staticFile('characters/surprised.png'),
  pointing: staticFile('characters/pointing.png'),
  laughing: staticFile('characters/laughing.png'),
}

export const Character = ({ 
  expression = 'idle',
  position = 'center',    // 'left' | 'center' | 'right'
  entryFrame = 0,
  scale = 1,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Entry spring
  const entry = spring({
    frame: frame - entryFrame,
    fps,
    config: { stiffness: 120, damping: 18 }
  })

  // Position map
  const positions = {
    left:   { x: '15%' },
    center: { x: '50%' },
    right:  { x: '75%' },
  }

  return (
    <div style={{
      position: 'absolute',
      left: positions[position].x,
      bottom: '10%',
      transform: `
        translateX(-50%)
        translateY(${(1 - entry) * 80}px)
        scale(${entry * scale})
      `,
      opacity: entry,
    }}>
      <Img 
        src={expressions[expression]} 
        style={{ height: '520px', width: 'auto' }}
      />
    </div>
  )
}
```

### Expression Timing Pattern
```jsx
// Switch expressions at specific frames
const getExpression = (frame) => {
  if (frame < 30) return 'idle'
  if (frame < 90) return 'talking'
  if (frame < 120) return 'thinking'
  if (frame >= 120) return 'surprised'
  return 'idle'
}
```

### Frame Rate for Character
- Character switches expressions at scene boundaries (every ~10s = ~300 frames at 30fps)
- For subtle lip-sync feel: alternate between `idle.png` and `talking.png` every 4 frames during narration
- This creates a simple 7.5fps talking animation without any rigging

```jsx
// Simple talking animation at ~7.5fps feel
const talkingFrame = Math.floor(frame / 4) % 2
const talkingExpression = talkingFrame === 0 ? 'idle' : 'talking'
```

---

## CHARACTER POSITIONING RULES

- Default: character right-side, visual elements left-side
- When character is explaining something on screen: character left, diagram right
- Character never overlaps key visual information
- Character never appears in front of the teal accent element
- Exit: character slides down off screen using reverse spring over 15 frames
- Entry: always spring up from below, never fade in

---

## GENERATING CHARACTER ASSETS

When new expressions are needed:

### Option A — AI Generation (recommended)
1. Use the existing idle.png as the base reference
2. Prompt: "Same papercraft character, same style, same clothing, expression: [X], transparent background, consistent with reference"
3. Tools: Adobe Firefly, Midjourney, or Kling with reference image
4. Always verify consistency with existing expressions before saving to /attachments/characters/

### Option B — Lottie (upgrade path)
If the project scales and more fluid animation is needed:
- Commission a Lottie file with character states
- Use `@remotion/lottie` package
- Each state maps to one of the expressions above
- Control state via `playOnEveryUpdate` and frame mapping
- This is the upgrade, not the starting point

---

## WHAT THE CHARACTER NEVER DOES

- Never moves his mouth in a realistic lip-sync way (too uncanny in papercraft style)
- Never walks across the screen (slide in/out only)
- Never appears without an entry animation
- Never uses an expression not in the approved library
- Never appears in motion.md or slides.md type videos
- Never looks directly at the camera in a creepy "staring" static way — idle expression should have a slight upward gaze
