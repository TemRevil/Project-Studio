# TRANSITIONS.md — Project Studio 1.0
## How Scenes Connect

---

## DEFAULT — CROSS DISSOLVE
Used between every standard scene change.
Duration: 12 frames (0.4s at 30fps)

```jsx
// Outgoing scene
opacity: interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
})

// Incoming scene
opacity: interpolate(frame, [0, 12], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
})
```

---

## SMASH CUT — 0 FRAMES
Used only at: the sarcasm beat, the problem reveal, a dramatic reframe.
No dissolve. No fade. Hard cut.
Previous scene ends. New scene starts. Immediate.
Use maximum once per video.

---

## SLIDE WIPE LEFT
Used when topic shifts significantly — new section of explanation.
Duration: 18 frames. Spring-driven.

```jsx
const wipe = spring({
  frame,
  fps,
  config: { stiffness: 160, damping: 22 }
})
transform: `translateX(${interpolate(wipe, [0, 1], ['100%', '0%'])})`
```

---

## FADE TO BLACK — OUTRO ONLY
Last transition of every video.
Duration: 18 frames.
Black, not white. Warm dark `#2C2416`, not pure black.

---

## RULES

- Never use two different transition types back to back
- Default is always cross dissolve unless there's a specific reason
- Transition type is decided by scene content, not variety
- Never use slide wipe right — left only, matches reading direction
