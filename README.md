# Project Studio

Project Studio is a production-first AI video system built on Remotion.

It now includes:
- a typed request -> plan -> script pipeline
- provider-aware LLM generation with validation and repair
- shared services for headless commands and the Ink studio
- asset and capability manifests so the model only works with real renderer support
- repo-root output folders under `videos/<slug>/`

## Commands

```bash
npm run studio
npm run doctor
npm run assets
npm run library
npm run generate -- --topic "How RAG Works" --type kinetic --format reel --duration 30
npm run generate -- --topic "Dry Run" --type kinetic --duration 30 --dry-run --draft-only
npm run render -- --slug how-rag-works
```

## Production Status

Production-ready:
- `kinetic`
- `motion`
- `slides`

Experimental:
- `animation`
- `images`
- `hybrid`

## Environment

Copy `.env.example` to `.env` and fill in:
- Gemini or OpenRouter credentials for script generation
- Mistral credentials for narration audio

Run `npm run doctor` before the first production run.

## Outputs

Each run saves to `videos/<slug>/`:
- `<slug>_plan.json`
- `<slug>_script.json`
- `<slug>_voice.mp3`
- `<slug>_<format>.mp4`
- `<slug>_run.json`
