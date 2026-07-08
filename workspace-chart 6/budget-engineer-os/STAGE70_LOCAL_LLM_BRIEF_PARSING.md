# Stage 70 — Local-LLM Brief Parsing (Critical-Path #5, final)

Closes the last critical-path item: real **in-browser local LLM** brief parsing via
`@mlc-ai/web-llm` — free/open-source, no API, runs on the user's WebGPU — wired behind the
existing `parseBriefAsync` seam with **guaranteed graceful fallback** to the deterministic
rules parser. The model is opt-in and lazy, so it never touches the critical path.

## What shipped

- **`src/ai/aiProvider.ts`** — engine abstraction:
  - `AiEngine = 'local-rules' | 'webllm'`; `parseWithEngine(text, engine)` always resolves
    to a `ParseResult` (with `engineUsed` / `fellBack` / `fallbackReason`).
  - `extractJson(text)` — pulls the first **balanced** JSON object out of free-text model
    output; throws on none.
  - `coerceBrief(obj, raw)` — validates/clamps untrusted model output into a safe
    `ParsedBrief`, filling gaps from the rules parser (so a hallucinating model can't
    corrupt the design).
  - `BRIEF_PROMPT` — strict JSON-only extraction prompt.
- **`src/ai/webllmParser.ts`** — WebLLM adapter, **lazy-imported only from aiProvider** so
  `@mlc-ai/web-llm` is a separate async chunk. Checks for WebGPU, lazily creates/caches the
  engine (`Llama-3.2-1B-Instruct`), runs the prompt, extracts + coerces JSON. Throws on any
  failure → caller falls back. Progress hook for the UI.
- **`src/store/appStore.ts`** — `aiEngine` + `aiStatus` state, `setAiEngine`; `generateFromBrief`
  is now async via `parseWithEngine`, reports which engine ran, and logs `[engine]` in the
  audit event.
- **`src/components/panels/AiBriefPanel.tsx`** — engine toggle (Rules / Local LLM), status
  line, and an honest WebGPU/~1 GB-download warning.

## Verified (Node-testable parts)

| Check | Result |
|---|---|
| Rules engine output | 4 bed / 2 floors / 160 m² ✓ |
| WebLLM requested, no WebGPU | **falls back** to rules, no throw, valid brief ✓ |
| `extractJson` on messy model text | recovers the JSON object ✓ |
| `coerceBrief` clamps garbage | beds 99→20, floors 50→6, bad area→fallback, bad features→[] ✓ |
| `extractJson` on no-JSON | throws cleanly (→ fallback) ✓ |

## Performance (verified build)

| Chunk | Size | On critical path? |
|---|---|---|
| `index` (main) | 177 KB (58 KB gz) | yes |
| `three-vendor` | 457 KB (115 gz) | no — lazy |
| **web-llm chunk** | **~6 MB (2.1 MB gz)** | **NO — only on Local-LLM + Generate** |
| `webllmParser` adapter | 0.85 KB | no — lazy |

## Honest scope note (important)

The full WebLLM path **cannot be executed or verified in this sandbox** (no WebGPU, and a
real run downloads a ~1 GB model). I verified everything that is verifiable — the
abstraction, JSON extraction, validation/clamping, and the fallback path — and confirmed
the heavy runtime is isolated to an opt-in lazy chunk. In a real WebGPU browser the toggle
runs the model; anywhere else it silently uses the rules parser. The rules parser remains
the default so the app is fast and reliable out of the box.

## Critical path — COMPLETE

- ✅ #1 3D BIM viewer · ✅ #2 editable plan · ✅ #3 consolidation · ✅ #4 multi-project ·
  ✅ #5 local-LLM brief parsing
