# DEPTH.md — Project Studio 1.0
## Parallax — The Papercraft Layered Feel

---

## WHY THIS EXISTS

A flat video feels like a screenshot.
Parallax makes the paper world feel physical — like you could reach in and lift a layer.
This is what separates papercraft from flat design.

---

## THE THREE PLANES

| Plane | Layer | Speed Multiplier | Contains |
|---|---|---|---|
| Background | z-index 0 | 0.3x | Paper texture, base color, far elements |
| Midground | z-index 10 | 0.6x | Main visual elements, diagrams, character |
| Foreground | z-index 20 | 1.0x | Text, teal elements, labels, brand mark |

---

## IMPLEMENTATION

The parallax is driven by a gentle horizontal drift — very subtle, continuous.

```jsx
const { durationInFrames } = useVideoConfig()
const frame = useCurrentFrame()

// Gentle drift across the scene duration
const drift = interpolate(frame, [0, durationInFrames], [0, -12], {
  extrapolateRight: 'clamp'
})

// Apply per layer with multiplier
const bgOffset   = drift * 0.3   // background moves least
const midOffset  = drift * 0.6   // midground follows
const fgOffset   = drift * 1.0   // foreground moves most (text/teal)
```

---

## ENTRY PARALLAX — SCENE START

On scene entry, layers pop in from their depth plane:

```jsx
// Background enters from slight left
const bgEntry = spring({ frame, fps, config: { stiffness: 80, damping: 20 } })
transform: `translateX(${interpolate(bgEntry, [0, 1], [-20, 0])}px)`

// Midground enters with delay
const midEntry = spring({ frame: frame - 8, fps, config: { stiffness: 100, damping: 18 } })
transform: `translateX(${interpolate(midEntry, [0, 1], [30, 0])}px)`

// Foreground enters last
const fgEntry = spring({ frame: frame - 15, fps, config: { stiffness: 120, damping: 16 } })
transform: `translateY(${interpolate(fgEntry, [0, 1], [20, 0])}px)`
```

---

## RULES

- Drift amount: max 12px total across the full scene — subtle, not motion-sickness
- Never apply parallax to the brand mark — it's anchored to the frame
- Character moves with midground plane
- Teal accent element moves with foreground plane — emphasizes its importance
- Background texture is always slightly blurred: `filter: blur(0.5px)` for depth feel
