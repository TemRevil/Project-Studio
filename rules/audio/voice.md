# VOICE.md — Project Studio 1.0

---

## SETTINGS

```
Provider:       ElevenLabs
Model:          eleven_multilingual_v2
Voice ID:       [stored in .env as ELEVENLABS_VOICE_ID — temy's clone]
Stability:      0.65
Similarity:     0.80
Style:          0.35
Speaker boost:  true
```

---

## GENERATION FLOW

1. Script confirmed by temy
2. Insert `<break time="0.3s"/>` between scenes in the SSML
3. Generate full audio as one file
4. Get audio duration
5. Build Remotion composition to match that exact duration
6. Never pad audio with silence — script controls duration

---

## RULES

- One generation per script — no patching segments together
- If a line sounds wrong, rewrite the line and regenerate the full audio
- Voice speed is controlled by script pacing, not ElevenLabs speed parameter
- Never use a different voice ID — temy's voice is the product
