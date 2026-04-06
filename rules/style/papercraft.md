# PAPERCRAFT.md — Project Studio 1.0
## The Visual Style — Series Identity

---

## THIS IS THE STYLE SET

This is not one option among many.
This is the visual language of the entire channel.
Every video, every scene, every element lives in this world.

---

## THE WORLD

Imagine every frame is a physical diorama built from cut paper.
Layers of paper stacked at different depths.
Soft torn edges where paper meets paper.
Warm, tactile, handmade — but precise.
Nothing glows neon. Nothing floats without a shadow. Nothing feels digital.

---

## COLOR SYSTEM

### Base Palette (always present)
| Name | Hex | Usage |
|---|---|---|
| Cream | `#F5F0E8` | Primary background, lightest layer |
| Off-white | `#FAF7F2` | Text backgrounds, card surfaces |
| Kraft | `#C4A882` | Mid-layer elements, borders, secondary shapes |
| Warm shadow | `#B09070` | Depth shadows, layer separators |
| Dark text | `#2C2416` | All body text |

### Accent (use with extreme restraint)
| Name | Hex | Usage |
|---|---|---|
| Teal | `#2A7B7B` | ONE key element per scene only |
| Teal light | `#3D9E9E` | Hover states, secondary teal element if absolutely needed |
| Teal dark | `#1A5C5C` | Teal element shadow, depth |

### Rules for Teal
- Maximum ONE teal element visible per scene
- Teal is reserved for: the key concept, the retrieval thread, the LLM core, the answer moment
- Never use teal for decorative purposes
- Never use teal on text unless it's the single most important word in the scene
- Never use teal on background — backgrounds are always cream/kraft family

### What Never Appears
- Gradients of any kind
- Neon or saturated colors
- Pure black `#000000` — use `#2C2416` instead
- Pure white `#FFFFFF` — use `#FAF7F2` instead
- Drop shadows with opacity above 25%
- Any color outside the defined palette

---

## TEXTURE

Every surface has paper texture applied:
- Background: subtle paper grain, noise overlay at 8% opacity
- Shapes: slightly irregular edges, not perfect vector smoothness
- Cards/panels: faint fiber texture, like thick cardstock

In Remotion, simulate this with:
```jsx
// Paper texture overlay
<div style={{
  position: 'absolute',
  inset: 0,
  backgroundImage: `url(${staticFile('vfx/paper_texture.png')})`,
  opacity: 0.08,
  mixBlendMode: 'multiply',
  pointerEvents: 'none',
}} />
```

---

## SHADOWS

All paper layers cast shadows on the layer below them:
```jsx
boxShadow: '0px 4px 12px rgba(44, 36, 22, 0.18)'
// or for lighter elements:
boxShadow: '0px 2px 6px rgba(44, 36, 22, 0.12)'
```

Shadow direction: always slightly down and slightly right (light source from top-left)
Never use colored shadows. Shadow is always warm dark `rgba(44, 36, 22, X)`.

---

## SHAPES

Shapes in this world are:
- Rectangles with soft border radius: `borderRadius: 8px` for cards, `4px` for small elements
- Organic blobs for accent backgrounds (SVG path, not perfect circle)
- Never sharp geometric with zero radius — that's the motion.md world
- Edges can be slightly irregular — use SVG paths over divs when precision matters

---

## LAYERS / DEPTH SYSTEM

Every scene has 3 visual planes:
```
BACKGROUND (z-index 0)   → cream solid, paper texture
MIDGROUND  (z-index 10)  → main visual elements, character
FOREGROUND (z-index 20)  → text, teal elements, labels
```
Parallax behavior defined in depth.md.
Each plane moves at different speed — see depth.md.

---

## ELEMENTS VISUAL LIBRARY

### Knowledge Base / Library
- Visualize as: stack of thick paper cards or small paper-covered books
- Color: kraft `#C4A882` cards, cream `#F5F0E8` labels
- Teal element: one small teal tab or spine accent

### LLM Core
- Visualize as: folded origami paper lantern or hexagonal paper structure
- Base color: off-white `#FAF7F2`
- Accent: teal `#2A7B7B` inner glow (simulated with soft teal inner shadow, NOT a real glow)
- When active: subtle scale pulse using spring() — scale 1.0 → 1.03 → 1.0

### Retrieval Thread / Connection
- Visualize as: paper string or thin torn paper strip
- Color: teal `#2A7B7B`
- Animation: draws itself across screen (scaleX 0 → 1 spring)

### Data / Information Flow
- Visualize as: small paper cards or folded notes traveling along the thread
- Color: cream with dark text label
- Animation: slide along path, slight rotation on entry

### Icons
- Always from /attachments/icons
- SVG format, papercraft-consistent (soft edges, slight texture)
- Never use emoji as icons
- Never use icons with thin strokes — thick, chunky, papercraft-weight

---

## WHAT THIS STYLE IS NOT

- Not flat design (too sterile)
- Not skeuomorphic (too realistic)
- Not kawaii (too soft/cute)
- Not brutalist (too harsh)
- Not minimalist (too empty)

It is: warm, layered, tactile, educational, and distinctly handcrafted.
