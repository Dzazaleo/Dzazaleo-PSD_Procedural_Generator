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
- Uses Ollama with local vision-language models (e.g., `minicpm-v:8b`, `qwen2.5vl:7b`)
- Automatic image downscaling for local models (max 512px, aligned to 28px patch size)
- Extended context window for Ollama (`num_ctx: 16384`) to handle complex prompts
- JSON response parsing with markdown code fence stripping
- Health checks for local servers via `checkQwenServerHealth()`
- Debug logging for Qwen requests (model, image count, text length)

### Node Connection Validation

[App.tsx](App.tsx) contains comprehensive `onConnect` validation logic that enforces type-safe connections between nodes. Key rules:
- Export Node only accepts DesignReviewer or ContainerPreview sources (strict production gate)
- DesignAnalyst requires KnowledgeNode for knowledge input, ContainerResolver for source, TargetSplitter for target
- Remapper accepts TargetSplitter or DesignAnalyst for target inputs

### Type System

[types.ts](types.ts) defines the domain model:
- `SerializableLayer`: Lightweight layer representation with deterministic path IDs
- `TransformedLayer`: Layer with applied transform (scale, offset, rotation)
- `TransformedPayload`: Complete mapping result with metrics, preview, and generation flags
- `LayoutStrategy`: AI-generated layout instructions (method, scale, anchor, overrides)
- `ContainerDefinition`: Template container with absolute and normalized bounds

### PSD Template Convention

PSD files use a `!!TEMPLATE` top-level group containing container definitions. Container names prefixed with `!!` are stripped during processing. Containers define spatial regions for procedural content placement.

### AI Integration

**AI Provider Service** ([services/aiProviderService.ts](services/aiProviderService.ts)) - Qwen/Ollama AI backend:
- `qwen-local`: Ollama with local vision-language models (e.g., `minicpm-v:8b`, `qwen2.5vl:7b`)

#### Environment Configuration (`.env.local`)

```bash
# Qwen Local (Ollama) configuration
VITE_QWEN_BASE_URL=http://localhost:11434/v1
VITE_QWEN_MODEL=minicpm-v:8b  # or qwen2.5vl:7b for better reasoning

# ComfyUI (optional, for draft generation - currently disabled)
VITE_COMFYUI_URL=http://127.0.0.1:8188
```

#### Ollama Setup

1. Install Ollama from https://ollama.com/download/windows
2. Pull a vision model: `ollama pull minicpm-v:8b` (stable) or `ollama pull qwen2.5vl:7b` (requires ~17GB VRAM)

**Model Options** (configured via `VITE_QWEN_MODEL` in `.env.local`):
- `minicpm-v:8b`: Stable vision model, recommended for most setups
- `qwen2.5vl:7b`: Superior reasoning for complex layouts, but has known GGML tensor errors with certain image dimensions

**Note:** Model selection is configured via environment variable only. The UI displays the current model but does not provide a selector (previous Gemini multi-model support was removed).

**Known Issues with qwen2.5vl:7b:**
- GGML assertion errors (`a->ne[2] * 4 == b->ne[0]`) on some image dimensions
- Workaround: Images are auto-aligned to 28px patch size boundaries
- If crashes persist, switch to `minicpm-v:8b`

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
- Generates `LayoutStrategy` with: method (GEOMETRIC/GENERATIVE/HYBRID), spatial layout, scale, overrides
- Confidence triangulation via visual, knowledge, and metadata vectors
- Knowledge integration: scopes rules per container, respects mute toggle
- Extracts semantic anchors for content preservation
- Draft generation disabled (requires ComfyUI integration)
- **Token optimization for local models:**
  - Depth-limited layer flattening (`MAX_LAYER_DEPTH=3`) prevents token explosion on nested containers
  - Layer sample capped at `MAX_LAYERS_IN_PROMPT=20` to reduce prompt size
  - Image detail set to 'low' for vision tokens
- **Persistence optimization:** `sourceReference` (base64 image) stripped from stored state to prevent project file bloat
- **Configuration constants** (defined at module scope):
  - `ASPECT_RATIO_TOLERANCE=0.15`: Threshold for detecting geometry shift between source/target
  - `HEALTH_CHECK_INTERVAL_MS=30000`: Server health polling interval for local Ollama
  - `MAX_LAYER_DEPTH=3`: Maximum nesting depth for layer flattening in prompts
  - `MAX_LAYERS_IN_PROMPT=20`: Maximum layers included in AI prompt
  - `DRAFT_DEBOUNCE_MS=500`: Debounce delay for draft generation requests
- **Error handling:** Per-instance error state with user-visible error display in UI

**RemapperNode** ([components/RemapperNode.tsx](components/RemapperNode.tsx)) - Transformation engine:
- Applies geometric transforms from source to target bounds
- Three spatial layout engines:
  - `STRETCH_FILL`: Force-fit to container (backgrounds)
  - `UNIFIED_FIT`: Aspect-preserving scale + center (default)
  - `ABSOLUTE_PIN`: Explicit positioning via overrides
- Physics solvers for semantic mode: grid distribution, collision prevention, overlay snapping, boundary clamping
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

#### Vite/Build Issues

**"Failed to resolve dependency" errors for monaco-editor:**
- Monaco Editor is not used in this project
- If `vite.config.ts` contains `optimizeDeps.include` entries for Monaco workers, remove them
- The config should not reference any monaco-editor paths

#### Local Ollama Issues

**"GGML_ASSERT failed" errors with qwen2.5vl:**
- This is a known bug in Ollama's GGML implementation for Qwen2.5-VL
- Images are auto-resized to 28px-aligned dimensions, but some combinations still fail
- Workaround: Use `minicpm-v:8b` instead: `VITE_QWEN_MODEL=minicpm-v:8b`

**Model crashes with nested layer containers:**
- Depth-limited flattening is applied (`MAX_LAYER_DEPTH=3`)
- Layer count is capped at `MAX_LAYERS_IN_PROMPT=20` per analysis
- If still crashing, the container may have too many layers for the context window
- Check browser console for `[Qwen]` debug logs showing request size
- Constants can be adjusted in `DesignAnalystNode.tsx` if needed for specific hardware

**Large project file sizes after analysis:**
- Fixed: `sourceReference` base64 data is now stripped from persisted state
- If old projects are bloated, re-run analysis to update stored strategies

**Ollama server debugging:**
```powershell
$env:OLLAMA_DEBUG="1"; ollama serve
```
This enables verbose server-side logging to diagnose crashes.

**Analysis failures:**
- DesignAnalystNode displays error messages directly in the UI (red banner below chat)
- Check browser console for detailed error stack traces
- Common causes: network timeouts, malformed AI responses, missing source/target data
- AI response validation provides sensible defaults if required fields are missing
