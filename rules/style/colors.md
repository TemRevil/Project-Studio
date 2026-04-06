# COLORS.md — Project Studio 1.0
## The Locked Palette — Never Changed, Never Negotiated

---

## THE FIVE

| Name  | Hex       | Role                                         |
|-------|-----------|----------------------------------------------|
| Navy  | `#16425b` | Primary dark — bg, text on light, depth      |
| Sky   | `#81c3d7` | THE accent — one key element per scene       |
| Red   | `#ed1c24` | Emphasis — one use per entire video          |
| Smoke | `#e7e7e7` | Light background — primary canvas            |
| Mauve | `#d5c5c8` | Secondary mid — cards, borders, shapes       |

---

## ROLES — STRICT

### Navy `#16425b`
- Dark background for kinetic type videos
- All body text on light backgrounds
- Character outlines, deep layer shadows
- Never: used as the accent color (Sky owns that)

### Sky `#81c3d7`
- The one accent color — replaces old teal `#2A7B7B`
- Key concept element, retrieval thread, active node, answer reveal
- Text highlights on dark (kinetic) backgrounds
- Brand mark on dark backgrounds
- MAX ONE SKY ELEMENT visible per scene

### Red `#ed1c24`
- One use per full video (not per scene — per VIDEO)
- Reserved for: sarcasm punchline word, the "wrong" state, the critical emphasis
- Never decorative. Never more than one word or element.

### Smoke `#e7e7e7`
- Primary light background (replaces cream `#F5F0E8`)
- Text on dark backgrounds (kinetic type)
- Narration overlay backdrops, card surfaces

### Mauve `#d5c5c8`
- Mid-layer elements (replaces kraft `#C4A882`)
- Borders, separators, book stacks, card edges
- Secondary shapes in papercraft scenes

---

## DARK MODE (kinetic type)

```
Background:   #16425b (navy) or #0d2333 (deeper)
Primary text: #e7e7e7 (smoke)
Accent:       #81c3d7 (sky)
Secondary:    #d5c5c8 (mauve)
Emphasis:     #ed1c24 (red — still one per video)
```

## LIGHT MODE (animation / slides / motion)

```
Background:   #e7e7e7 (smoke)
Primary text: #16425b (navy)
Accent:       #81c3d7 (sky)
Secondary:    #d5c5c8 (mauve)
Emphasis:     #ed1c24 (red — still one per video)
```

---

## IN CODE

All colors live in `src/types.ts` COLORS object.
Never hardcode hex values in components.
Always import COLORS from types.ts and use COLORS.navy, COLORS.sky, etc.

---

## PRE-RENDER AUDIT

- [ ] Sky used exactly once per scene?
- [ ] Red used maximum once in the entire video?
- [ ] Navy used as dark, not as accent?
- [ ] Smoke used as background/surface, not as text color on light?
- [ ] Mauve used as mid-layer only?

All 5 pass → ship. Any fail → fix first.
