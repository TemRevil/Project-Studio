# ATTACHMENT INITIALIZATION & METADATA SYSTEM
## Project Studio Asset Architect

## GOAL
Process raw assets from `attachments/New/` and integrate them into the production library.
Then generate `attachments/STUDIO_NOTES.md`, the LLM memory file that every video generation reads.

## YOUR OPERATIONAL DIRECTIVE
When you read this, execute the following workflow precisely. You are responsible for classification, filesystem movement, metadata generation, and the final `STUDIO_NOTES.md` refresh.

---

## 1. FILE ANALYSIS & CLASSIFICATION
Scan all files in `attachments/New/`. Determine the target destination and category based on these rules:

| File Extension | Target Directory | Category | Handling Logic |
| --- | --- | --- | --- |
| `.mp3`, `.wav` | `attachments/vfx/` | `SFX` | If file size is greater than 2MB, verify whether it is music or VFX before moving it. |
| `.mp3`, `.wav` | `attachments/music/` | `MUSIC` | Long-form background tracks. |
| `.png`, `.jpg` | `attachments/vfx/` | `TEXTURE` | Paper textures, overlays, surface assets. |
| `.png`, `.jpg` | `attachments/characters/` | `CHARACTER` | Poses like idle, talking, pointing, or expressive stills. |
| `.json` | `attachments/lottie/` | `LOTTIE` | Verify it is a Lottie animation file, not metadata. |
| `.svg` | `attachments/icons/` | `ICON` | Vector assets. |

---

## 2. METADATA GENERATION (MANDATORY)
For EVERY file you move, create a JSON companion file next to it. Example: `fx.mp3` -> `fx.json`.
The metadata must include:

```json
{
  "name": "filename_without_extension",
  "type": "CATEGORY",
  "description": "Professional summary of what this asset is.",
  "durationSeconds": 0.0,
  "bestFor": ["Scenario 1", "Scenario 2"],
  "emotionalCue": "playful | tense | technical | organic",
  "technicalNotes": "Loopability, transparency, recommended volume or opacity."
}
```

CRITICAL:
- For audio files, use `ffprobe` to determine the exact `durationSeconds`.
- For non-audio files, keep `durationSeconds` at `0.0`.
- `bestFor` should be specific enough that the LLM can match assets to scenes later.

---

## 3. THE MOVEMENT & CLEANUP PIPELINE
1. Analyze the file and classify it.
2. Use `ffprobe` for audio duration when needed.
3. Move the file from `attachments/New/` into the target directory.
4. Write the companion metadata JSON in the same destination directory.
5. Delete the original file from `attachments/New/`.
6. Track the result for the final report.

---

## 4. BEHAVIORAL RULES
- No assumptions: if you are not sure whether a file is VFX or Character, inspect the filename first.
- If the filename contains `idle`, `talking`, `pointing`, or similar pose words, classify it as `CHARACTER`.
- Do not rename files. Keep the original filenames.
- If a file type is unknown or unsupported, leave it in `attachments/New/` and report `REQUIRES MANUAL REVIEW`.

---

## 5. GENERATE STUDIO_NOTES.md (MANDATORY AFTER PROCESSING)
After processing all files, write `attachments/STUDIO_NOTES.md`.
This file is the LLM's memory of what assets exist. Without it, the LLM invents paths.

### Format

```markdown
# STUDIO_NOTES.md - Asset Inventory for LLM Prompts
Generated: [ISO timestamp]
Total assets: [count]

## LOTTIE ANIMATIONS
Use these EXACT relative paths as the "label" field for kind: "icon" elements.
If no Lottie matches your concept, use kind: "label" or kind: "hero". Never invent a path.

| Path | Description | Use For |
| --- | --- | --- |
| lottie/example.json | What the animation shows | Topics or moments it fits |

## SOUND EFFECTS
Use these EXACT paths in `sfxCues[].file`.

| Path | Duration | Best For |
| --- | --- | --- |
| vfx/click.mp3 | 0.30s | Hard cut, emphasis beat |

## MUSIC
Use these EXACT paths in `backgroundMusic.file`.

| Path | Mood | Duration |
| --- | --- | --- |
| music/example.mp3 | Curious | 42.0s |

## CHARACTERS
Only list actual animation-ready character stills or poses.

| Path | Description | Use For |
| --- | --- | --- |
| characters/idle.png | Neutral idle pose | Animation type talking-head scenes |

## DEPENDENCY GUIDE
- kinetic type: needs vfx/click.mp3
- motion type: needs vfx/whoosh_soft.mp3 and vfx/paper_texture.png
- slides type: needs vfx/paper_rustle.mp3 and vfx/pop_gentle.mp3
- animation type: expects characters/idle.png and characters/talking.png

## CURRENTLY MISSING (DO NOT REFERENCE)
- [list any required assets not found]
```

### Rules for STUDIO_NOTES.md
- Every Lottie entry must include the actual relative path, a short description, and what it is best for.
- Use `ffprobe` for audio duration when metadata is missing.
- Keyword extraction matters. Pull useful nouns from filenames and metadata so the LLM can match concepts.
- Mark as `MISSING` any file from the dependency guide that does not exist yet.
- Regenerate `STUDIO_NOTES.md` every time new assets are added.
- If no Lottie matches a concept, tell the LLM to use `kind: "label"` instead of inventing a path.

---

## 6. POST-INIT REPORT
Provide a summary table and confirm that `STUDIO_NOTES.md` was updated:

| File | Destination | Status | STUDIO_NOTES updated |
| --- | --- | --- | --- |
| whoosh.mp3 | `attachments/vfx/` | Moved + metadata created | Yes |

Also include:
- Any files left in `attachments/New/`
- Any missing dependency-guide assets
- Any metadata you could not determine automatically
