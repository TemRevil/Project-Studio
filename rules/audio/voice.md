# VOICE.md — Project Studio 1.0

---

# VOICE RULES

These rules govern the sound, pacing, and delivery of the narrator's voice.

## 1. VOICE CONFIGURATION

Provider:       Mistral AI (Voxtral via TTS)
Model:          Mistral TTS
Voice ID:       [stored in .env as MISTRAL_VOICE_ID — temy's clone]

## 2. PACING AND PAUSES

The AI voice will speak naturally without breaks unless instructed.
To control timing, we use standard SSML or punctuation tricks that work with our LLM generating the script text that gets sent to Mistral:

- **Comma `,`** = brief pause (0.2s)
- **Period `.`** = standard sentence pause (0.5s)
- **Ellipsis `...`** = long trailing pause (1.0s)
- **Em dash `—`** = breath/thought pause (0.5s)
- **Paragraph break** = beat pause (1.0s)

**DO NOT** use `[pause]` or `<break/>` tags in the script text, Mistral TTS will read them aloud. Punctuation is the ONLY way to control pauses.

## 3. PRONUNCIATION

- spell out acronyms if they should be said as letters: "A P I", not "API"
- write numbers as words for clarity: "one hundred", not "100"
- write symbols as words: "slash", "dot", "hashtag"

## 4. EMOTION AND TONE

While the voice is cloned from temy, it defaults to a neutral explainer tone.
- Add emotion via writing style, not voice API settings
- Voice speed is controlled by script pacing, not Mistral speed parameter
- Never use a different voice ID — temy's voice is the product
