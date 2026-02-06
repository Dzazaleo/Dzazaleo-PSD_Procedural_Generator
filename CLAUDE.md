# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start development server (Vite)
npm run build    # Production build
npm run preview  # Preview production build
```

**Required:** Configure AI provider in `.env.local` (see AI Integration section below).

## Architecture Overview

This is a **PSD Procedural Logic Engine** - a visual node-based editor for procedurally generating Adobe Photoshop files. Built with React 19, ReactFlow, and ag-psd.

### Core Pipeline Flow

The application implements a **linear procedural pipeline** where PSD data flows through specialized nodes:

```
LoadPSD → DesignInfo/TemplateSplitter → ContainerResolver → DesignAnalyst → Remapper → DesignReviewer → ContainerPreview → ExportPSD
          ↑                                                      ↑
    TargetTemplate → TargetSplitter ──────────────────────────────┘
          ↑
    KnowledgeNode → KnowledgeInspector ────────────────────────────→ (feeds into Analyst/Reviewer)
```

### Key Architectural Components

**ProceduralContext** ([store/ProceduralContext.tsx](store/ProceduralContext.tsx)) - Central state management via React Context. Maintains multiple registries:
- `psdRegistry`: Raw ag-psd objects (binary/structure)
- `templateRegistry`: Lightweight template metadata
- `resolvedRegistry`: Container-to-layer mapping contexts
- `payloadRegistry`: Transformed layer payloads ready for assembly
- `reviewerRegistry`: CARO-audited (polished) payloads
- `analysisRegistry`: AI layout strategies
- `feedbackRegistry`: Reviewer→Remapper constraint feedback
- `knowledgeRegistry`: Design rules and visual anchors

**PSD Service** ([services/psdService.ts](services/psdService.ts)) - Core PSD operations:
- `parsePsdFile()`: Parses PSD via ag-psd with error handling
- `extractTemplateMetadata()`: Extracts `!!TEMPLATE` group as container definitions
- `getCleanLayerTree()`: Converts ag-psd layers to `SerializableLayer` with deterministic path IDs
- `calculateGroupBounds()`: AABB calculation for visual content bounds
- `compositePayloadToCanvas()`: Renders transformed layers to canvas
- `constructExportablePsd()`: Builds exportable PSD structure with Smart Object matrix reconciliation

**SmartObjectRegistry** ([services/smartObjectRegistry.ts](services/smartObjectRegistry.ts)) - Module-scope singleton storing heavy `linkedFiles` binaries separately from React state.

**AI Provider Service** ([services/aiProviderService.ts](services/aiProviderService.ts)) - Qwen/Ollama AI abstraction:
- `generateCompletion()`: Unified interface for text/vision inference with structured JSON output
- Uses Ollama with local vision-language models (default: `qwen3-vl:8b-instruct`, fallback: `qwen2.5vl:7b`)
- **Requires Ollama 0.12.7+** (tested on 0.15.5)
- **Instruct variant required:** The thinking variant (`qwen3-vl:8b`) wastes tokens on `<think>` blocks, often exhausting `max_tokens` before producing content. The `-instruct` variant has the same base model and vision capabilities but no thinking overhead.
- **No `response_format`:** Ollama 0.13+ has bugs with `response_format: {type: 'json_object'}` + thinking models (GitHub #10929, #10976). JSON output is guided by schema hints appended to the system prompt instead.
- Automatic image downscaling for local models (max 1024px, aligned to 32px patch size for Qwen3-VL)
- Supports up to 8 images per request (`MAX_IMAGES_PER_REQUEST=8`)
- Large context window (`num_ctx: 32768`) — ensures input + output fit within context window
- `<think>` tag stripping as safety net (closed tags, unclosed tags, preamble text before JSON)
- Empty response detection with diagnostic logging and reasoning-field JSON fallback
- JSON response parsing with markdown code fence stripping and truncation repair
- Health checks for local servers via `checkQwenServerHealth()`
- Debug logging for Qwen requests (model, image count, text length, response structure)

### Node Connection Validation

[App.tsx](App.tsx) contains comprehensive `onConnect` validation logic that enforces type-safe connections between nodes. Key rules:
- Export Node only accepts DesignReviewer or ContainerPreview sources (strict production gate)
- DesignAnalyst requires KnowledgeNode for knowledge input, ContainerResolver for source, TargetSplitter for target
- Remapper accepts TargetSplitter or DesignAnalyst for target inputs

### Type System

[types.ts](types.ts) defines the domain model:
- `SerializableLayer`: Lightweight layer representation with deterministic path IDs
- `TransformedLayer`: Layer with applied transform (per-axis scale, offset, rotation) and semantic `layoutRole`
- `TransformedPayload`: Complete mapping result with metrics, preview, and generation flags
- `LayoutStrategy`: AI-generated layout instructions (method, scale, anchor, per-layer overrides)
- `LayerOverride`: Per-layer transform with `scaleX`/`scaleY` (non-uniform), `edgeAnchor` (edge pinning for UI), and `layoutRole` (flow/static/overlay/background)
- `ContainerDefinition`: Template container with absolute and normalized bounds
- `SourceAnalysis`: Stage 1 comprehension output including `semanticGroups` — groups of visually paired elements (anchor + companions) that must move together during layout recomposition

### PSD Template Convention

PSD files use a `!!TEMPLATE` top-level group containing container definitions. Container names prefixed with `!!` are stripped during processing. Containers define spatial regions for procedural content placement.

### AI Integration

**AI Provider Service** ([services/aiProviderService.ts](services/aiProviderService.ts)) - Qwen/Ollama AI backend:
- `qwen-local`: Ollama with local vision-language models (default: `qwen3-vl:8b-instruct`)

#### Environment Configuration (`.env.local`)

```bash
# Qwen Local (Ollama) configuration
VITE_QWEN_BASE_URL=http://localhost:11434/v1
VITE_QWEN_MODEL=qwen3-vl:8b-instruct  # Instruct variant — no thinking overhead, reliable JSON

# ComfyUI (optional, for draft generation - currently disabled)
VITE_COMFYUI_URL=http://127.0.0.1:8188
```

#### Ollama Setup

**Requires Ollama 0.12.7+** (tested on 0.15.5). Qwen3-VL architecture support was added in 0.12.7.

1. Install Ollama: https://ollama.com/download/windows
2. Verify version: `ollama --version` (should show 0.12.7 or later)
3. Pull the vision model: `ollama pull qwen3-vl:8b-instruct` (~6.1GB download, ~8GB VRAM during inference)

**Model Options** (configured via `VITE_QWEN_MODEL` in `.env.local`):
- `qwen3-vl:8b-instruct`: **Recommended** — Instruct variant (no thinking tokens), reliable JSON output (~6.1GB weights, ~18GB headroom on 24GB GPU)
- `qwen3-vl:8b`: Thinking variant — **not recommended**, wastes tokens on `<think>` blocks that often exhaust `max_tokens` before producing content
- `qwen2.5vl:7b`: Legacy fallback (~6GB weights)
- `minicpm-v:8b`: Lightweight alternative (~5.5GB weights)

**Note:** Model selection is configured via environment variable only. The UI displays the current model but does not provide a selector.

**Why instruct variant:** The thinking variant (`qwen3-vl:8b`) emits `<think>...</think>` reasoning that consumes the `max_tokens` budget on Ollama. Thinking cannot be disabled via API (`think: false` not merged, `/no_think` removed). The `-instruct` variant has the same base model and vision capabilities without thinking overhead.

#### AI Features

Used for:
- Layout analysis and strategy generation in DesignAnalyst
- Design review and refinement in DesignReviewer
- Knowledge distillation from brand manuals in KnowledgeNode

**Note:** Image generation features (generative fill, draft previews) are currently disabled. They require ComfyUI integration which is not yet implemented.

Layout strategies include confidence triangulation (`TriangulationAudit`) with visual, knowledge, and metadata validation.

### Node Components Reference

#### Source Input Nodes

**LoadPSDNode** ([components/LoadPSDNode.tsx](components/LoadPSDNode.tsx)) - Entry point for source PSD files:
- Parses PSD files using ag-psd with full layer/canvas data
- Extracts `!!TEMPLATE` group as container definitions
- Validates structural rules via `mapLayersToContainers()`
- Extracts clean design layer hierarchy for downstream processing
- Offloads Smart Object binaries to `SmartObjectRegistry` (checkroom pattern)
- Registers to `psdRegistry` and `templateRegistry` in ProceduralContext
- Handles binary re-hydration when loading saved projects

**TargetTemplateNode** ([components/TargetTemplateNode.tsx](components/TargetTemplateNode.tsx)) - Entry point for target/output PSD format:
- Loads target template with optimized parsing (skips layer image data)
- Validates that `!!TEMPLATE` group exists (required for target)
- Defines the output canvas dimensions and container layout
- Registers template metadata for downstream assembly

#### Splitter Nodes (Demultiplexers)

**TemplateSplitterNode** ([components/TemplateSplitterNode.tsx](components/TemplateSplitterNode.tsx)) - Source template demux:
- Splits loaded PSD's template containers into individual output handles
- Each container gets a dedicated source handle for routing
- Alphabetically sorted container list display
- Visual connection status indicators

**TargetSplitterNode** ([components/TargetSplitterNode.tsx](components/TargetSplitterNode.tsx)) - Target template demux:
- Similar to TemplateSplitter but for target templates
- Provides dual-handle slots: input for assembly, output for bounds export
- Displays normalized dimensions (percentage-based)
- Broadcasts template to store for downstream lookup

#### Processing Nodes

**ContainerResolverNode** ([components/ContainerResolverNode.tsx](components/ContainerResolverNode.tsx)) - Multi-channel container mapper:
- Resolves container names to actual layer groups in design hierarchy
- Supports dynamic channel count (expandable)
- Uses `usePsdResolver` hook for resolution logic with status tracking
- Calculates content bounds via `calculateGroupBounds()`
- Status states: `resolved`, `warning` (case mismatch/empty), `error` (missing)
- Registers resolved contexts with layers and bounds to `resolvedRegistry`

**DesignAnalystNode** ([components/DesignAnalystNode.tsx](components/DesignAnalystNode.tsx)) - AI-powered layout strategist:
- Uses `aiProviderService` for "Knowledge-Anchored Semantic Recomposition" via local Ollama
- **Single AI provider**: Qwen local only (model configured via `VITE_QWEN_MODEL` env var, no UI selector)
- Server health indicator for Ollama connections (checking/online/offline)
- Multi-instance support for parallel container analysis
- **3-Stage AI Pipeline:**
  - Stage 1 (Source Comprehension): Semantic understanding of source content — narrative, elements, arrangement, and **semantic groupings** (which elements are visually paired and must move together)
  - Stage 2 (Layout Generation): Per-layer layout strategy with role-based scaling. Receives semantic groups from Stage 1 and spatial proximity annotations (`near:ID`) from bounding box overlap analysis
  - Stage 3 (Semantic Verification): Cross-checks layout preserves original composition intent
- Generates `LayoutStrategy` with: method (GEOMETRIC/GENERATIVE/HYBRID), spatial layout, per-layer overrides
- **Semantic Grouping System:**
  - Stage 1 identifies anchor-companion relationships (e.g., prize labels on potions, values near counters)
  - Stage 2 receives these as context + spatial proximity data computed from layer bounding box overlaps (>30% area overlap with ≥1.5x size ratio)
  - Companion layers should be assigned `overlay` role with `linkedAnchorId` pointing to their anchor
  - The Remapper overlay solver positions companions relative to their anchor's new position using source-space deltas
- **Per-layer override generation:** AI must produce an override for EVERY layer, classifying each by semantic role:
  - `background`: Stretch to fill target (non-uniform `scaleX`/`scaleY`)
  - `flow`: Proportional positioning and uniform scaling
  - `static`: Edge-pinned UI elements with `edgeAnchor` (horizontal/vertical pin)
  - `overlay`: Positioned relative to parent via `linkedAnchorId` — used for companion elements that must move with their anchor
- **Override validation & default fallback:**
  - If AI misses layers, `inferLayoutRoleFromName()` generates defaults based on name patterns (bg→background, win/counter/text→static, label/badge→overlay, etc.)
  - **Coordinate sanity check:** After Stage 2, if all non-background xOffset/yOffset values are < 2% of target dimensions, they're treated as invalid (likely relative coords from 8B model). Recalculated from source layer positions as proportional pixel mapping.
  - Invisible layers (`isVisible: false`) are excluded from redistribution
  - Spatial proximity detection runs on ALL layers in fallback — companions are auto-assigned `overlay` + `linkedAnchorId`
  - Only `independentFlowLayers` (non-companion flow elements) participate in gap-based redistribution
  - Negative gap protection: when content exceeds target width, `fitScale` is reduced to fit with margin
- Confidence triangulation via visual, knowledge, and metadata vectors
- Knowledge integration: scopes rules per container, respects mute toggle
- Draft generation disabled (requires ComfyUI integration)
- **Token budget:**
  - Ollama maps `max_tokens` → `num_predict`, which caps ALL output tokens
  - With instruct variant, full budget goes to JSON content (no thinking overhead)
  - Stage 1 `maxTokens: 8192` — 14-field SourceAnalysis JSON schema
  - Stage 2 `maxTokens: 16384` — complex layout with per-item overrides
  - Stage 3 `maxTokens: 8192` — verification (skipped if AI produced 0 overrides in Stage 2)
  - `num_ctx: 32768` in `aiProviderService.ts` ensures input + output fit within context window
  - If JSON responses are still truncated, increase `maxTokens` in the relevant `generateCompletion()` call
- **Token optimization for local 8B models:**
  - **Group-level flattening:** Stage 2 only sends top-level layers/groups to the AI (typically 5-15 items vs 20-50+ individual layers). Groups are positioned as units.
  - **Group override propagation:** When AI positions a group, child overrides are auto-generated — children inherit the group's transform with source-space delta offsets preserved.
  - Layer sample capped at `MAX_LAYERS_IN_PROMPT=20` for comprehensive container coverage
  - **Minimal Stage 2 JSON schema:** Only 4 required fields (`overrides`, `method`, `spatialLayout`, `suggestedScale`). Verbose metadata fields (14 fields including `visualAnalysis`, `triangulation`, `rulesApplied`, etc.) removed to prevent the 8B model from filling text fields and truncating before reaching overrides.
  - `overrides` array listed first in schema so models emit it before running out of tokens
- **Persistence optimization:** `sourceReference` (base64 image) stripped from stored state to prevent project file bloat
- **Configuration constants** (defined at module scope):
  - `ASPECT_RATIO_TOLERANCE=0.15`: Threshold for detecting geometry shift between source/target
  - `HEALTH_CHECK_INTERVAL_MS=30000`: Server health polling interval for local Ollama
  - `MAX_LAYER_DEPTH=3`: Maximum nesting depth for layer flattening in prompts
  - `MAX_LAYERS_IN_PROMPT=20`: Maximum layers included in AI prompt
  - `DRAFT_DEBOUNCE_MS=500`: Debounce delay for draft generation requests
- **Error handling:** Per-instance error state with user-visible error display in UI

**RemapperNode** ([components/RemapperNode.tsx](components/RemapperNode.tsx)) - Transformation engine:
- **Role-based per-layer transforms:** Each layer is transformed according to its `layoutRole`:
  - `background`: Stretches to fill target container (independent X/Y scaling via `scaleX`/`scaleY`)
  - `flow`: Proportional positioning - maintains relative position within container, uniform scale
  - `static`: Edge pinning via `edgeAnchor` - UI elements maintain proportional distance from their pinned edges (left/center/right × top/center/bottom)
  - `overlay`: Positioned relative to parent layer (uses `linkedAnchorId`), delta scaled by anchor's actual transform (not base scale)
- Base spatial layout engines provide fallback when no per-layer overrides exist:
  - `UNIFIED_FIT`: Aspect-preserving scale + center (default)
  - `STRETCH_FILL`: Force-fit to container
  - `ABSOLUTE_PIN`: Explicit positioning via overrides
- Physics solvers for semantic mode: grid distribution, collision prevention, overlay snapping, boundary clamping (operates on flattened layer tree)
- Integrates feedback from DesignReviewer for iterative refinement
- AI preview generation with aspect ratio normalization
- Produces `TransformedPayload` with positioned layers and metadata

**DesignReviewerNode** ([components/DesignReviewerNode.tsx](components/DesignReviewerNode.tsx)) - Quality gate and manual adjustment:
- Natural language chat interface for layout tweaks ("Nudge title up 10px")
- Semantic inspector showing layer roles (flow/static/overlay/background)
- Generates override corrections via local Qwen/Ollama
- Feedback loop: pushes adjustments back to Remapper physics engine
- Auto-verification when physics sync completes
- Confidence badge display from upstream triangulation

#### Output Nodes

**ContainerPreviewNode** ([components/ContainerPreviewNode.tsx](components/ContainerPreviewNode.tsx)) - Visual preview monitor:
- Renders transformed payloads to canvas via `compositePayloadToCanvas()`
- Multi-instance support for viewing multiple containers
- Shows verification status badge (polished/unpolished)
- Binary detection with refresh capability
- Proxies validated payloads to `reviewerRegistry` for export gate

**ExportPSDNode** ([components/ExportPSDNode.tsx](components/ExportPSDNode.tsx)) - Final PSD assembly:
- Strict production gate: only accepts polished payloads
- Priority lookup: `reviewerRegistry` (verified) over raw `payloadRegistry`
- AI synthesis phase: generates final assets for confirmed generative layers
- Skeleton injection: merges payload content into source structure
- Smart Object matrix reconciliation for aspect ratio changes
- Writes final `.psd` file with preserved layer metadata and linked files

#### Knowledge System Nodes

**KnowledgeNode** ([components/KnowledgeNode.tsx](components/KnowledgeNode.tsx)) - "Project Brain" context engine:
- Accepts PDF brand manuals (text extraction via pdf.js)
- Accepts reference images (optimized to 512px, JPEG compressed)
- AI distillation: extracts procedural design rules with container scoping
- Output format uses `// [CONTAINER] CONTAINER` block syntax
- Broadcasts `KnowledgeContext` (rules + visual anchors) to store
- Persists context to node data for save/load support

**KnowledgeInspectorNode** ([components/KnowledgeInspectorNode.tsx](components/KnowledgeInspectorNode.tsx)) - Knowledge debugger:
- Uses `useKnowledgeScoper` hook to parse container-specific rules
- Dropdown filter for scope selection (Global + specific containers)
- Terminal-style rule display with CRT visual effects
- Copy functionality for manual prompt engineering
- Visual anchor thumbnail gallery

#### Utility Nodes

**DesignInfoNode** ([components/DesignInfoNode.tsx](components/DesignInfoNode.tsx)) - Layer inspector/debugger:
- Tree view of design layer hierarchy (Photoshop-style top-down order)
- Visual preview with dual-overlay system:
  - Blue dashed: Geometric bounds (reported metadata)
  - Red solid: Optical bounds (actual pixel content via `getOpticalBounds()`)
- Dimension metrics: GEO, OPT, RAW canvas sizes
- Useful for debugging layer positioning and bounds issues

#### ProjectControls Component

**ProjectControls** ([components/ProjectControls.tsx](components/ProjectControls.tsx)) - Global utility toolbar:
- **Auto-Wire**: Heuristic engine that automatically connects matching containers across the pipeline
  - Detects existing infrastructure nodes
  - Semantic matching by container name
  - Knowledge-aware routing (semantic vs fast pipeline)
  - Creates full pipeline: Splitters → Resolver → Analyst → Remapper → Reviewer → Preview → Export
- **Save/Load**: JSON export/import of project state (nodes, edges, viewport)
- **Reset**: Two-step destructive reset (confirmation required) - clears all data but preserves node layout

### Troubleshooting

#### Local Ollama Issues

**GGML tensor errors with vision models:**

Image dimensions must be aligned to the model's patch size. Qwen3-VL requires dimensions divisible by 32 (`PATCH_SIZE=32` in `aiProviderService.ts`). If you see GGML assertion failures, verify the downscaling code is producing correctly aligned dimensions (check browser console for `[aiProviderService] Downscaled image` logs).

**Ollama version requirements:**
- `qwen3-vl:8b`: Requires Ollama 0.12.7+ (architecture support added in that version)
- `qwen2.5vl:7b`: Works on any Ollama version, but 0.13.x+ may have GGML bugs

**Ollama server debugging:**
```powershell
$env:OLLAMA_DEBUG="1"; ollama serve
```

**Qwen3 thinking mode / empty responses:**
- **Use the `-instruct` variant** (`qwen3-vl:8b-instruct`). The thinking variant exhausts `max_tokens` on reasoning, leaving `content` empty.
- `response_format: {type: "json_object"}` is **not used** — Ollama 0.13+ bugs cause empty content with thinking models. Schema hints in the system prompt guide JSON output instead.
- `<think>` tag stripping in `aiProviderService.ts` handles: closed tags, unclosed tags (model truncated during thinking), and preamble text before JSON.
- Empty response detection logs diagnostics and attempts to extract JSON from the `reasoning` field as fallback.
- `think: false` API parameter does NOT work on Ollama — not relied upon.
- If JSON responses are truncated, increase `maxTokens` in the `generateCompletion()` calls and ensure `num_ctx` >= input_tokens + max_tokens.

**Analysis failures:**
- DesignAnalystNode displays error messages directly in the UI (red banner below chat)
- Check browser console for `[Qwen]` debug logs and error stack traces
- AI response validation and `repairTruncatedJson` provide recovery for malformed/truncated responses
- Default fallback generates sensible overrides if AI misses layers
