# TYPOGRAPHY.md — Project Studio 1.0

---

## FONT FAMILY

Primary: **DM Sans** — clean, humanist, warm without being childish
Fallback: system-ui, sans-serif
Load via: Google Fonts in Remotion root

```jsx
// In Root.tsx
import { loadFont } from '@remotion/google-fonts/DmSans'
const { fontFamily } = loadFont()
```

---

## WEIGHT SYSTEM
```
Bold (700):    Titles, key terms, emphasis
Medium (500):  Subtitles, labels, scene headers
Regular (400): Body narration text, descriptions
```

---

## TEXT ANIMATION — DEFAULT
Words appear one by one, left to right.
Each word springs in: translateY 12px → 0, opacity 0 → 1.
Stagger: 3 frames between each word.
Spring config: stiffness 200, damping 20.

```jsx
const WordReveal = ({ text, startFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const words = text.split(' ')
  
  return (
    <span>
      {words.map((word, i) => {
        const wordFrame = frame - startFrame - (i * 3)
        const progress = spring({ frame: wordFrame, fps, config: { stiffness: 200, damping: 20 }})
        return (
          <span key={i} style={{
            display: 'inline-block',
            marginRight: '0.25em',
            opacity: progress,
            transform: `translateY(${interpolate(progress, [0, 1], [12, 0])}px)`
          }}>{word}</span>
        )
      })}
    </span>
  )
}
```

---

## RULES

- Never center-align body text — left or right aligned only
- Title text: center aligned on reel, left aligned on video
- Max line length: 28 characters on reel, 45 characters on video
- Line height: 1.4
- Letter spacing: -0.02em on bold titles, 0 on body
- Never use italic — not in this world
- Teal `#2A7B7B` on text: one word maximum per scene, only for the most critical term

---

