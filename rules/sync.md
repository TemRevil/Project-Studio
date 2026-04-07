# SYNC.md — Project Studio 2.0
## The Most Important Rule: Everything Syncs to Audio (v3 — STT-Driven)

---

## THE MASTER RULE

Audio is generated first. Audio is transcribed to get word-level timestamps.
Everything visual is mapped to exact frames from those timestamps.
If it doesn't sync, it doesn't ship.

---

## v3 SYNC ENGINE ARCHITECTURE

```
STEP 1: LLM generates script JSON with triggersOnWord on every element
STEP 2: Voxtral TTS generates per-scene audio files
STEP 3: Voxtral STT transcribes each audio → word-level timestamps (ms precision)
STEP 4: Sync engine maps triggersOnWord → wordTimestamp → entryFrame
STEP 5: Scene durations reconciled from actual audio lengths
STEP 6: Remotion renders with exact frame data
```

---

## WORD-TO-FRAME MAPPING (EXACT — NOT ESTIMATED)

Every word in the narration has an exact start and end time from STT.
Frames are calculated as:

```
BUFFER_MS = 50  (visual appears 50ms before word for natural feel)

wordStartFrame = max(0, round((wordStartSec - 0.050) × 30))
wordEndFrame   = round(wordEndSec × 30)
```

Scene total frames from audio:
```
LINGER_FRAMES = 9  (0.3s after last word for breathing room)

sceneFrames = round(audioDurationSec × 30) + LINGER_FRAMES
```

---

## TRIGGERS — HOW THE LLM WRITES TIMING

The LLM does NOT estimate entryFrame. It uses `triggersOnWord`:

```json
{
  "id": "hero-1",
  "kind": "hero",
  "label": "Retrieval.",
  "position": { "x": "50%", "y": "45%" },
  "entryFrame": 0,
  "triggersOnWord": "retrieval"
}
```

The sync engine resolves `triggersOnWord: "retrieval"` → finds the STT timestamp
where "retrieval" is spoken → sets `entryFrame` to the exact frame.

For decorative/background elements that should appear at scene start:
```json
{ "triggersOnWord": null, "entryFrame": 0 }
```

---

## ICON / LOTTIE SYNC — EXACT FRAME RULE

Every icon appears at the exact frame the narrator says its keyword.
The sync engine handles this automatically via triggersOnWord.

Example:
- Narrator says: "The database stores your embeddings."
- STT reports "database" at 0.82s start
- entryFrame = max(0, round((0.82 - 0.05) × 30)) = 23

---

## SCENE TIMING ANATOMY (v3)

Every scene is built from audio out, not from visual in:

```
Scene narration:   "RAG gives the LLM a library card."
STT result:
  "RAG"     start=0.00  end=0.32  frame=0
  "gives"   start=0.35  end=0.58  frame=9
  "the"     start=0.61  end=0.72  frame=17
  "LLM"     start=0.75  end=1.12  frame=21
  "a"       start=1.15  end=1.22  frame=33
  "library" start=1.25  end=1.58  frame=36
  "card"    start=1.62  end=1.95  frame=47

Hero "RAG" element:     triggersOnWord="RAG"     → entryFrame=0
Support "library card": triggersOnWord="library"  → entryFrame=36
Background Lottie:      triggersOnWord=null       → entryFrame=0
```

---

## SAFE POSITION PRESETS

Use only these positions. Never invent arbitrary coordinates.

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

## VOICE DIRECTION

Each scene has a voiceDirection object that controls TTS delivery:

```json
{
  "emotion": "confident",
  "speed": 1.0,
  "pauseBeforeMs": 0,
  "pauseAfterMs": 200,
  "emphasis": ["retrieval"]
}
```

Emotions map to speed: excited=1.05, confident=1.0, serious=0.92, calm=0.88, sarcastic=0.95

---

## COMPLEXITY HONESTY

### The sync engine handles these automatically:
✅ Word-by-word text reveal synced to exact STT frame
✅ Element spring-in at exact frame from word trigger
✅ Lottie playing at exact frame from word trigger
✅ SFX triggered at exact frame from word trigger
✅ Scene duration derived from actual audio length
✅ Self-drawing arrows and lines
✅ Color changes on cue
✅ Kinetic text slam / slide / fadeIn
✅ Scene transitions (dissolve, smash cut, wipe, fade)
✅ Parallax depth layers
✅ Narration overlay with exact word sync

### Flags these as manual:
⚠ Lip-sync tied to audio waveform
⚠ Physics (cloth, particles, fluid)
⚠ Path-following along a curved route
⚠ Real-time audio-reactive visuals
⚠ Bone-rigged character animation
⚠ Morph transitions between two complex shapes

---

## POST-RENDER SYNC TUNING (RARELY NEEDED IN v3)

With STT-driven timing, manual tuning should be rare. If needed:

1. Watch the render with sound
2. Note any element that feels early or late
3. Adjust BUFFER_MS in sync.ts (default 50ms)
4. For individual elements, add entryDelayMs in the script JSON
5. Re-run: `npm run render -- --slug [slug]`
