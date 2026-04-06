# MOTION.md — Project Studio 1.0
## Video Type: Motion Graphics

---

## WHAT THIS IS

No character. Pure concept visualization through shape, flow, and movement.
Abstract but grounded in the papercraft palette.
Best for: data flows, system architecture, how-things-connect explanations, processes with multiple steps.

---

## VISUAL LANGUAGE

- Geometric but soft: rectangles with radius, hexagons with paper edges
- Elements flow and connect via animated paper threads (teal for key connections)
- No characters, no human elements
- Shapes represent concepts — label everything clearly
- Movement tells the story — the animation IS the explanation

---

## SCENE STRUCTURE

```
BEAT 1 → First element appears (spring from scale 0)
BEAT 2 → Second element appears, connection thread draws between them
BEAT 3 → System activates — teal element pulses, full flow visible
```

---

## MOTION RULES

- All shapes enter with spring() — stiffness 140, damping 18
- Threads draw themselves: scaleX 0 → 1 on the connection line
- No element appears without a spring entry
- Stagger entries by 8 frames between each element
- Exit: all elements fade simultaneously, 12 frames

---

## WHAT MOTION TYPE IS NOT

- Not abstract art — every element must represent something labeled
- Not fast-cutting without reason — each beat earns its transition
- Not the character type — if you need personality, use animation.md
