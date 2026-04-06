# ATTACHMENT INITIALIZATION & METADATA SYSTEM

## GOAL
You are the "Asset Architect" for Project Studio 1.0. Your task is to process raw, unorganized assets from `attachments/New/` and integrate them into the project’s production library with high-fidelity metadata. 

## YOUR OPERATIONAL DIRECTIVE
When you read this, execute the following workflow precisely. You are responsible for classification, filesystem movement, and metadata generation.

---

### 1. FILE ANALYSIS & CLASSIFICATION
Scan all files in `attachments/New/`. Determine the target destination and category based on these strict rules:

| File Extension | Target Directory | Category | Handling Logic |
| :--- | :--- | :--- | :--- |
| `.mp3`, `.wav` | `attachments/vfx/` | `SFX` | If file size > 2MB, verify if it's Music or VFX. |
| `.mp3`, `.wav` | `attachments/music/`| `MUSIC` | Long-form tracks. |
| `.png`, `.jpg` | `attachments/vfx/` | `TEXTURE` | Paper textures, overlays. |
| `.png`, `.jpg` | `attachments/characters/` | `CHARACTER` | Poses (idle, talking, etc.). |
| `.json` | `attachments/lottie/` | `LOTTIE` | Must verify it is a Lottie format, not metadata. |
| `.svg` | `attachments/icons/` | `ICON` | Vector assets. |

---

### 2. METADATA GENERATION (MANDATORY)
For EVERY file you move, you MUST create a JSON companion file (e.g., `fx.mp3` -> `fx.json`). The metadata MUST include these fields:

```json
{
  "name": "filename_without_extension",
  "type": "CATEGORY", 
  "description": "Provide a descriptive, professional summary of what this asset IS.",
  "durationSeconds": 0.0,
  "bestFor": ["Scenario 1", "Scenario 2"],
  "emotionalCue": "Describe the mood (e.g., 'playful', 'tense', 'technical', 'organic').",
  "technicalNotes": "Include info like loopability, transparency, or recommended volume/opacity."
}
```
**CRITICAL:** For audio files, you MUST use `ffprobe` to determine the exact `durationSeconds` and include it in the metadata.

---

### 3. THE MOVEMENT & CLEANUP PIPELINE
1. **Analyze:** Use `ffprobe` to get the duration of audio files.
2. **Move:** Copy/Move the file from `attachments/New/[filename]` to the target directory.
3. **Metadata:** Write the corresponding `.json` file to the same target directory, ensuring the duration is accurate.
4. **Delete:** Remove the original file from `attachments/New/`.
5. **Report:** Provide a table in your response:
   - File Name
   - Destination
   - Status (✅ Moved & Metadata Created)

---

### 4. BEHAVIORAL RULES
- **No Assumptions:** If you aren't sure if a file is VFX or Character, check the filename. If it contains "idle" or "talking", it's a Character.
- **Naming Convention:** Do not rename the files, keep their original names.
- **Error Handling:** If a file type is unknown or format is unsupported, do not move it. Leave it in `New/` and report it as "REQUIRES MANUAL REVIEW".

---

## EXAMPLE EXECUTION
Input: `attachments/New/whoosh.mp3`
1. Identify: `.mp3` -> `vfx`.
2. Analyze: Use `ffprobe` to find `durationSeconds`.
3. Move: `attachments/vfx/whoosh.mp3`.
4. Create: `attachments/vfx/whoosh.json` with metadata, including duration.
5. Report: `✅ Processed whoosh.mp3 | Destination: attachments/vfx/ | Metadata: Created`.
--- End of content ---