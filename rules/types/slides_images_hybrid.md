# SLIDES.md — Project Studio 1.0
## Video Type: Slides

---

## WHAT THIS IS

Structured, point-by-point explanation. Each slide is one idea.
Think: lecture notes that animate. Clear hierarchy. Fast to scan.
Best for: lists, comparisons, step-by-step processes, "here are 3 things" content.

---

## SLIDE STRUCTURE

Each slide:
- Title: max 5 words, dark text, top of slide
- Body: max 3 points, max 8 words each, appear one by one on beat
- Teal accent: left border bar on the active/current point only
- Background: off-white card on cream background, papercraft shadow

---

## ANIMATION RULES

- Slide enters: slides up from bottom, spring stiffness 130, damping 20
- Each point wipes in from left: scaleX 0 → 1, staggered 12 frames apart
- Active point: teal left border appears with spring
- Slide exits: slides out to left, 15 frames
- Never fade a slide — always directional movement

---

## PACING

- One point per 3–4 seconds of narration
- Never show a point before the narrator reaches it
- Never wait more than 1 second after narrator finishes a point to move to next

---

# IMAGES.md — Project Studio 1.0
## Video Type: Images

---

## WHAT THIS IS

Real or AI-generated images as the primary visual layer.
Text and labels animate over the image.
Best for: real-world examples, historical context, product demonstrations, "here's what this looks like in practice."

---

## IMAGE RULES

- Images must be on-brand in feel — warm tones preferred, nothing cold or clinical
- Always apply a slight warm overlay: `rgba(197, 168, 130, 0.15)` — makes any image feel like it belongs in this world
- Paper texture overlay applied on top (same as papercraft.md)
- Never use images with heavy branding, logos, or watermarks

---

## ANIMATION RULES

- Image enters with Ken Burns: slow scale 1.0 → 1.06 over scene duration
- Direction alternates: odd scenes push right, even scenes push left
- Text overlays spring in from bottom: translateY 30px → 0, spring stiffness 110, damping 18
- Teal element (if any): always in foreground over image

---

# HYBRID.md — Project Studio 1.0
## Video Type: Hybrid

---

## WHAT THIS IS

Two types in one video. Defined combination only — not a free mix.
Allowed combinations:
- animation + motion (character explains, then system diagram takes over)
- slides + motion (structured points, then flow visualization)
- images + animation (real-world image, then character contextualizes)

---

## TRANSITION BETWEEN TYPES

Use slide wipe from transitions.md.
The wipe signals to the viewer that the mode is changing.
Never cross-dissolve between types — dissolve is for same-type scene changes.

---

## RULES

- Each type section must be at least 10 seconds
- No more than two types per video
- The dominant type (more screen time) defines the overall "feel" of the video
- Character only appears in the animation section — never bleeds into the motion or slides section
