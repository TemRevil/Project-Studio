# SYNC.md — Project Studio 1.0
## The Most Important Rule: Everything Syncs to Audio

---

## THE MASTER RULE

Audio is generated first. Audio duration is measured.
Everything visual is built to match that audio — frame by frame.
If it doesn't sync, it doesn't ship.

---

## WORD-TO-FRAME MAPPING

Every word the narrator speaks maps to a specific frame number.
Claude calculates this before generating any scene elements.

```
Default speech pace: 2.5 words per second
Frames per word at 30fps: 30 / 2.5 = 12 frames per word

wordStartFrame = startFrame + (wordIndex * 12)
```

Adjust if voice is faster or slower:
- Fast speaker (3 wps):  30 / 3.0 = 10 frames per word
- Slow speaker (2 wps):  30 / 2.0 = 15 frames per word

After first render, tune framesPerWord in the component if sync is off.
Edit script JSON → re-run `npm run render -- --slug [slug]`

---

## ICON / LOTTIE SYNC — EXACT FRAME RULE

Every icon appears at the exact frame the narrator says its keyword.

Example:
- Narrator says: "The database stores your embeddings."
- "database" is word 2 in scene starting at frame 0
- entryFrame for database icon = 2 * 12 = 24

Claude always calculates this in the generated script JSON.
Never uses round numbers like 0, 30, 60 unless they actually match.

---

## CAPTION / TEXT SYNC

Whether bold kinetic slam, handwritten SVG, or narration overlay:
each word appears at its spoken frame.

```tsx
// Standard word-reveal sync pattern
const FRAMES_PER_WORD = 12  // adjust per voice pace

text.split(" ").map((word, i) => {
  const wordFrame = sceneStartFrame + (i * FRAMES_PER_WORD)
  // word appears at wordFrame
})
```

For kinetic type — hero word slams on the first word of the narration line.
Support text slides in on the word it corresponds to.

---

## LOTTIE COLOR RULE

Every Lottie used in a video must be recolored to match the palette.

Step 1 — Open .json in LottieFiles.com editor or text editor
Step 2 — Replace all hex color values with palette colors:
```
Any dark color    →  Navy  #16425b
Any accent color  →  Sky   #81c3d7
Any light fill    →  Smoke #e7e7e7
Any mid color     →  Mauve #d5c5c8
Any red/alert     →  Red   #ed1c24 (only if this is the red moment)
```
Step 3 — Save back to /attachments/lottie/
Step 4 — Lottie plays at the entryFrame matching its audio keyword

---

## SCENE TIMING ANATOMY

Every scene is built from audio out, not from visual in:

```
Scene narration:   "RAG gives the LLM a library card."
Words:             RAG(0) gives(1) the(2) LLM(3) a(4) library(5) card(6)

At frame 0:   Scene starts, camera push-in begins
At frame 0:   "RAG" hero text slams in (word 0)
At frame 12:  "gives" support text slides in (word 1)
At frame 36:  "LLM" element springs in — highlighted sky (word 3)
At frame 48:  "library" Lottie book icon plays (word 5)
At frame 60:  "card" teal underline appears (word 6)
```

---

## SAFE POSITION PRESETS

Claude uses only these positions. Never invents arbitrary coordinates.

```
Name           x        y       Use case
─────────────────────────────────────────────────
Center         "50%"   "45%"   Hero element, main visual
Upper center   "50%"   "28%"   Title, hook word
Lower center   "50%"   "65%"   Supporting text, sub-element
Left third     "25%"   "45%"   Left diagram node
Right third    "75%"   "45%"   Right diagram node, character
Top left       "25%"   "28%"   Label, annotation
Top right      "75%"   "28%"   Counter-label
Bottom left    "25%"   "65%"   Secondary element
Bottom right   "75%"   "65%"   Secondary element
```

For reel format: nothing above y: "15%" (safe zone) or below y: "85%"

---

## COMPLEXITY HONESTY

### Claude handles these automatically:
✅ Word-by-word text reveal synced to frame
✅ Element spring-in at exact frame
✅ Lottie playing at exact frame
✅ Self-drawing arrows and lines
✅ Color changes on cue
✅ Kinetic text slam / slide / fadeIn
✅ Scene transitions (dissolve, smash cut, wipe, fade)
✅ Parallax depth layers
✅ Narration overlay with word sync
✅ SFX triggered at exact frame

### Claude flags these as manual — always says so:
⚠ Lip-sync tied to audio waveform
⚠ Physics (cloth, particles, fluid)
⚠ Path-following along a curved route
⚠ Real-time audio-reactive visuals
⚠ Bone-rigged character animation
⚠ Morph transitions between two complex shapes

When flagging: Claude says exactly what the effect looks like,
which tool handles it (Lottie / After Effects / manual JSON edit),
and gives the exact steps to do it manually.
No silent approximations. No broken workarounds passed off as working.

---

## POST-RENDER SYNC TUNING

After every first render of a new video:

1. Watch it with sound
2. Note any element that appears before or after its word
3. Open /videos/[slug]/[slug]_script.json
4. Find the element's entryFrame
5. Adjust: if element is early → increase entryFrame. If late → decrease.
6. Run: `npm run render -- --slug [slug]`
7. Repeat until every element lands on its word

This is normal. One pass of tuning per video is expected.
After tuning, save the adjusted script JSON — it's your master template.
