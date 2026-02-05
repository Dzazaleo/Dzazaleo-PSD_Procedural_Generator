# Model Tier System: Vision Upgrade with Rollback Safeguards

**Previous plan (ID/Name reconciliation, Steps 1-5) is COMPLETE.**

**Goal:** Introduce a tier-based model configuration system so we can push to the 32B model for better vision accuracy, while making it trivial to roll back if it exceeds VRAM on the RTX 3090 Ti (24GB).

**Files to modify:**
- `services/aiProviderService.ts` — tier presets, exported config, error detection
- `components/DesignAnalystNode.tsx` — consume tier config, show active tier in UI
- `.env.local` / `.env.local.example` — new `VITE_MODEL_TIER` variable

---

## Step 1: Define Tier Presets in `aiProviderService.ts`

Add a `ModelTier` type and `MODEL_TIERS` config object near the top of the file. Each tier bundles all parameters that vary together:

```typescript
export type ModelTier = 'lite' | 'balanced' | 'quality';

export interface TierConfig {
  label: string;              // Display name
  model: string;              // Ollama model tag
  maxImageDimension: number;  // Image downscale cap
  maxImagesPerRequest: number;
  numCtx: number;             // Ollama context window
  maxTokens: number;          // Output token limit
  maxLayersInPrompt: number;  // Prompt layer cap (consumed by DesignAnalystNode)
  maxLayerDepth: number;      // Layer flattening depth (consumed by DesignAnalystNode)
  temperature: number;        // Inference temperature
}

const MODEL_TIERS: Record<ModelTier, TierConfig> = {
  lite: {
    label: 'Lite (7B, low VRAM)',
    model: 'qwen2.5vl:7b',
    maxImageDimension: 512,
    maxImagesPerRequest: 4,
    numCtx: 8192,
    maxTokens: 2048,
    maxLayersInPrompt: 12,
    maxLayerDepth: 2,
    temperature: 0.7,
  },
  balanced: {
    label: 'Balanced (7B, full)',
    model: 'qwen2.5vl:7b',
    maxImageDimension: 1024,
    maxImagesPerRequest: 8,
    numCtx: 16384,
    maxTokens: 4096,
    maxLayersInPrompt: 20,
    maxLayerDepth: 3,
    temperature: 0.7,
  },
  quality: {
    label: 'Quality (32B)',
    model: 'qwen2.5vl:32b',
    maxImageDimension: 1024,
    maxImagesPerRequest: 4,
    numCtx: 8192,
    maxTokens: 4096,
    maxLayersInPrompt: 16,
    maxLayerDepth: 3,
    temperature: 0.4,
  },
};
```

**Rationale for quality tier values:**
- `qwen2.5vl:32b` Q4_K_M weighs ~21GB → leaves ~3GB for KV cache on 24GB
- `numCtx: 8192` (halved) reduces KV cache memory to fit
- `maxImagesPerRequest: 4` reduces peak VRAM during vision encoding
- `temperature: 0.4` — larger models benefit from lower temp for structured output
- `maxImageDimension: 1024` — 32B model handles higher res well

---

## Step 2: Wire Tier Selection Into Existing Config

Replace the hardcoded constants with tier-derived values:

1. Read tier from env: `const activeTierKey: ModelTier = (import.meta.env.VITE_MODEL_TIER as ModelTier) || 'balanced'`
2. Store active tier config: `let activeTier: TierConfig = MODEL_TIERS[activeTierKey] || MODEL_TIERS.balanced`
3. Replace `MAX_IMAGE_DIMENSION` constant with `activeTier.maxImageDimension`
4. Replace `MAX_IMAGES_PER_REQUEST` constant with `activeTier.maxImagesPerRequest`
5. Replace hardcoded `num_ctx: 16384` with `activeTier.numCtx`
6. Replace hardcoded `max_tokens: 4096` fallback with `activeTier.maxTokens`
7. Replace hardcoded `temperature: 0.7` fallback with `activeTier.temperature`
8. Use `activeTier.model` as the default model (still overridable by `VITE_QWEN_MODEL` if set)

Export getter so DesignAnalystNode can read tier params:
```typescript
export function getActiveTier(): TierConfig & { key: ModelTier } {
  return { ...activeTier, key: activeTierKey };
}
```

---

## Step 3: Replace Hardcoded Constants in `DesignAnalystNode.tsx`

1. Import `getActiveTier` from `aiProviderService`
2. Remove local constants `MAX_LAYER_DEPTH` and `MAX_LAYERS_IN_PROMPT`
3. At the top of `performAnalysis` (and anywhere these constants are used), read from tier:
   ```typescript
   const tier = getActiveTier();
   const MAX_LAYER_DEPTH = tier.maxLayerDepth;
   const MAX_LAYERS_IN_PROMPT = tier.maxLayersInPrompt;
   ```
4. Same for any other location that references these constants (prompt generation functions, etc.)

---

## Step 4: Add Tier Badge to DesignAnalystNode UI

Enhance the existing model badge area (near the server health indicator) to show the active tier:

- Show tier label next to "QWEN LOCAL" badge (e.g., `QWEN LOCAL · Balanced (7B, full)`)
- Color-code: lite=yellow, balanced=cyan (existing), quality=purple
- This gives immediate visual feedback about which tier is active

---

## Step 5: VRAM Safeguard — Error Detection & Recovery Guidance

In `generateWithQwenLocal()`, wrap the fetch call's error handling to detect VRAM/OOM failures:

```typescript
if (!response.ok) {
  const error = await response.text();
  // Detect GGML/OOM errors specific to Ollama
  if (error.includes('GGML_ASSERT') || error.includes('out of memory') || error.includes('CUDA error')) {
    console.error(`[Qwen] VRAM error detected on tier "${activeTierKey}". Current model: ${activeTier.model}`);
    console.error(`[Qwen] RECOVERY: Set VITE_MODEL_TIER=balanced (or lite) in .env.local and restart dev server.`);
    console.error(`[Qwen] Alternatively, try: OLLAMA_KV_CACHE_TYPE=q8_0 ollama serve`);
    throw new Error(
      `Model "${activeTier.model}" exceeded GPU memory. ` +
      `Switch to a lighter tier by setting VITE_MODEL_TIER=balanced in .env.local`
    );
  }
  throw new Error(`Qwen API error: ${response.status} - ${error}`);
}
```

This ensures the user gets an actionable error message in both console and the DesignAnalystNode error banner (which already displays thrown errors).

---

## Step 6: Update Environment Files

**.env.local** — add:
```bash
VITE_MODEL_TIER=balanced
```

**.env.local.example** — document all tiers:
```bash
# Model tier: 'lite' | 'balanced' | 'quality'
#   lite     - 7B model, 512px images, 8K context  (~6-8GB VRAM)
#   balanced - 7B model, 1024px images, 16K context (~10-14GB VRAM)
#   quality  - 32B model, 1024px images, 8K context (~21-23GB VRAM, needs 24GB GPU)
VITE_MODEL_TIER=balanced
```

---

## Rollback Procedure

If the `quality` tier causes OOM/crashes:

1. Stop the dev server
2. In `.env.local`, change `VITE_MODEL_TIER=quality` → `VITE_MODEL_TIER=balanced`
3. Restart: `npm run dev`

Optional VRAM optimization before giving up on 32B:
```powershell
# Start Ollama with quantized KV cache (halves KV cache VRAM)
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
ollama serve
```

---

## Verification

1. `npm run build` — no type errors
2. `npm run dev` with `VITE_MODEL_TIER=balanced` — confirm existing behavior unchanged (image dimension now 1024 vs old 768)
3. Check DesignAnalystNode header shows tier label (e.g., "Balanced (7B, full)")
4. Change `.env.local` to `VITE_MODEL_TIER=quality`, pull model (`ollama pull qwen2.5vl:32b`), restart, run analysis
5. If OOM: verify error banner shows actionable rollback message
6. Roll back to `balanced`, confirm recovery works
