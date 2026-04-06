# CAMERA.md — Project Studio 1.0
## Lens Behavior — How the Camera Moves

---

## PHILOSOPHY

The camera is invisible.
The viewer should never think "nice camera move."
They should only feel it — a subtle pull forward into a concept, a punch at a key moment.
Heavy camera work is for music videos. This is educational content.
Restraint is the signature.

---

## DEFAULT BEHAVIOR — EVERY SCENE

Subtle push-in. Slow. Always.
```jsx
const pushIn = interpolate(frame, [0, durationInFrames], [1.0, 1.035], {
  extrapolateRight: 'clamp'
})
// Apply to scene container
transform: `scale(${pushIn})`
```
This creates a feeling of gradually leaning in. The viewer leans with it.

---

## EMPHASIS MOMENT — ONE PER VIDEO

When the key concept lands — the teal element appears, the answer reveals:
```jsx
const punch = spring({
  frame: frame - emphasisFrame,
  fps,
  config: { stiffness: 280, damping: 20, mass: 0.8 }
})
// Scale punch: 1.0 → 1.06 → settle back to 1.02
const punchScale = interpolate(punch, [0, 1], [1.0, 1.06])
```
One punch. Never two in the same video.

---

## EXIT BEHAVIOR

Slow pull-back on scene exit — the inverse of the push-in.
Happens over the last 8 frames of any scene.
```jsx
const pullBack = interpolate(
  frame, 
  [durationInFrames - 8, durationInFrames], 
  [1.035, 1.0],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
)
```

---

## WHAT NEVER HAPPENS

- No zoom out beyond scale 1.0 (pulls viewer away — wrong feeling)
- No horizontal camera movement (parallax handles lateral depth — see depth.md)
- No rotation of the canvas
- No shake effects
- No rack focus effects (this isn't live action)
- No sudden hard zoom in (that's the punch — and it's used once)
