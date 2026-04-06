# KINETIC.md — Project Studio 1.0
## Video Type: Kinetic Typography

---

## WHAT THIS IS

The Instagram/TikTok native style. No character. No illustrations.
Pure bold text hitting the screen. Fast. Punchy. One idea per cut.

This matches the reference videos temy provided:
- Bold single-word or short-phrase reveals
- Dark navy background (#16425b or deeper)
- High-contrast smoke text (#e7e7e7)
- Sky (#81c3d7) on the keyword of each scene
- Red (#ed1c24) on the one punchline word per entire video
- Hard cuts (smash cuts) between every scene
- Text that breathes — big then small, fast then slow

---

## SCENE STRUCTURE

Each scene = one beat of narration. One sentence = one scene.

```
BEAT 1 [0–8 frames]   Hero word slams in — big, centered
BEAT 2 [8–20 frames]  Supporting text slides in underneath
BEAT 3 [20–end]       Sky accent pulses on the key term
BEAT 4 [last 4 frames] Smash cut to next scene
```

---

## ELEMENT KINDS FOR KINETIC SCENES

When Claude generates a kinetic VideoScript, elements use these kinds:

| kind         | role                                      | font size (reel) |
|--------------|-------------------------------------------|-----------------|
| `hero`       | Main word/phrase — biggest, slams first   | 88–120px bold   |
| `support`    | Supporting sentence — slides in under     | 44–52px medium  |
| `annotation` | Small note, de-emphasized                 | 28–34px regular |

isTeal: true → that word renders in Sky #81c3d7 + subtle glow pulse
isRed: true → that word renders in Red #ed1c24 — ONE ELEMENT PER VIDEO ONLY

---

## ANIMATION VARIANTS

### slam (hero default)
Heavy bounce spring: stiffness 400, damping 14, mass 0.6
Word enters from above, overshoots slightly, settles.

### slideUp (support default)
Soft spring: stiffness 180, damping 20
Slides up from 30px below, fades in.

### fadeIn (annotation default)
Spring: stiffness 120, damping 20
Opacity only — no movement.

### charByChar (optional, for short words)
Each character springs in, staggered 2 frames apart.
Use on: hook word, punchline reveal.

---

## LAYOUT (reel 9:16)

```
Top safe zone:     150px — nothing here (Instagram UI)
Bottom safe zone:  200px — nothing here (Instagram buttons)
Content zone:      150px to 1720px

Hero text:         vertically centered (42–52% from top)
Support text:      12–16px below hero
Annotation:        below support, smaller

All text:          center aligned
Max visible text:  12 words at any time
```

---

## COLOR IN KINETIC

Background: always Navy `#16425b`
Primary text: Smoke `#e7e7e7`
Key term: Sky `#81c3d7` — one per scene
Punchline: Red `#ed1c24` — one per video
Sub/annotation: `rgba(231,231,231,0.45)` — de-emphasized

Sky glow: `textShadow: "0 0 40px rgba(129,195,215,0.4)"`
Red glow: `textShadow: "0 0 30px rgba(237,28,36,0.5)"`

---

## CUTS

Kinetic uses smash cuts between EVERY scene. No dissolve. No wipe. Hard cut.
The rhythm IS the edit.

Exception: 6-frame fade only at:
- Very end of the video (outro)
- After the red punchline — let it hold 0.5s, then fade out

---

## THE HOOK RULE

First scene = hook. Viewer decides to stay or scroll in 0–3 seconds.

Hook must be ONE of:
- Provocative statement: "You've been doing this wrong."
- Number: "3 things no one tells you about RAG."
- Contradiction: "More data = worse AI. Here's why."
- Direct challenge: "You don't actually know what an LLM is."

NEVER a soft intro. NEVER "Today we're going to talk about..."

---

## MUSIC IN KINETIC

More important here than other types — kinetic feels hollow without it.
Default: `curious.mp3` from /attachments/music/
Volume: 20% under voice, 50% in any silent gaps
Use a clean loop — kinetic videos often loop before viewer notices.

---

## WHAT KINETIC IS NOT

- Not slow — every second earns attention or loses it
- Not wordy — max 12 words on screen at any time
- Not illustrated — no character, no papercraft elements
- Not slides — no bordered containers or bullet points
- Not soft — text hits, it doesn't ease in politely
