# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start development server (Vite)
npm run build    # Production build
npm run preview  # Preview production build
```

**Required:** Set `GEMINI_API_KEY` in `.env.local` for AI features.

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

Uses Google Gemini API (`@google/genai`) for:
- Layout analysis and strategy generation in DesignAnalyst
- Design review and refinement in DesignReviewer
- Generative fill proposals (when `generationAllowed` flag is true)

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
- Uses Google Gemini API for "Knowledge-Anchored Semantic Recomposition"
- Multi-instance support for parallel container analysis
- Model selection: Flash (fast), Pro (balanced), Deep Thinking (thorough)
- Generates `LayoutStrategy` with: method (GEOMETRIC/GENERATIVE/HYBRID), spatial layout, scale, overrides
- Confidence triangulation via visual, knowledge, and metadata vectors
- Knowledge integration: scopes rules per container, respects mute toggle
- Extracts semantic anchors for content preservation
- Generates preview drafts for generative methods

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
- Generates override corrections via Gemini
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
