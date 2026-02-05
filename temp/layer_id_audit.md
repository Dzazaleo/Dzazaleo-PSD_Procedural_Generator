# Layer ID Audit Report

## ID Scheme

Layer IDs are **deterministic path indices** — dot-separated array positions in the ag-psd `children[]` tree. A layer at `psd.children[0].children[2].children[1]` gets ID `"0.2.1"`.

Generated in `services/psdService.ts:98-159` by `getCleanLayerTree()`, reconstructed in `services/psdService.ts:473-489` by `findLayerByPath()`.

---

## Pipeline Flow (How IDs Propagate)

| Stage | What Happens | ID Treatment |
|---|---|---|
| **LoadPSD** | `getCleanLayerTree(psd.children)` -> `SerializableLayer[]` | IDs created: `"0"`, `"0.1"`, etc. `!!TEMPLATE` skipped but its index reserved |
| **ContainerResolver** | BFS finds group by name, passes `group.children` | Children retain original path IDs (e.g., `"0.0"`, `"0.1"`) |
| **DesignAnalyst** | `flattenLayers()` builds prompt table with `l.id` | IDs sent verbatim to AI: `"0.0 | LayerName | ..."` |
| **AI Response** | Returns `overrides[].layerId` strings | Must echo exact IDs; missing ones get defaults |
| **Remapper** | `strategy.overrides.find(o => o.layerId === layer.id)` | IDs used for override lookup; preserved in `TransformedLayer` |
| **Reviewer** | Flattens `TransformedLayer[]`, sends `l.id` to AI | AI returns adjustments keyed by `layerId` |
| **Feedback Loop** | `feedbackRegistry` stores overrides with `layerId` | Merged with Analyst overrides in Remapper via `Map<layerId, override>` |
| **Compositor** | `findLayerByPath(psd, layer.id)` -> pixel data | Path ID walks raw PSD tree to retrieve canvas |
| **ExportPSD** | `findLayerByPath(sourcePsd, metaLayer.id)` | Reconstructs Layer objects from original binary |

---

## Verified Correct

1. **`!!TEMPLATE` skip is index-safe** — `getCleanLayerTree` uses `forEach`'s raw `index`, which matches the position in `psd.children`. `findLayerByPath` walks the same array by index. The skipped `!!TEMPLATE` creates a gap in the SerializableLayer set (no layer gets ID `"1"` if template is at index 1) but both functions agree on the indexing scheme.

2. **Resolver passes children with intact IDs** — `ContainerResolverNode.tsx:120` passes `result.layer.children` which are already indexed relative to the full PSD tree.

3. **Analyst validation catches missing overrides** — `DesignAnalystNode.tsx:1607-1608` uses `flattenLayerIds()` with identical filter logic to the prompt's `flattenLayers()`, so all prompted layers are validated.

4. **Stage 3 verification merges correctly** — `DesignAnalystNode.tsx:1883-1900` uses `correctionMap.set(corr.layerId, corr)` to merge per-layer corrections over Stage 2 values, preserving uncorrected layers.

5. **Feedback loop merges correctly** — `RemapperNode.tsx:582-601` uses a `Map<string, LayerOverride>` keyed by `layerId` for smart merge of reviewer feedback into analyst overrides.

---

## Bugs Found

### BUG 1: Reviewer Sync Check Uses Wrong Scale Formula

**Location**: `DesignReviewerNode.tsx:83`

```typescript
const expectedScale = payload.scaleFactor * override.individualScale;
if (Math.abs(layer.transform.scaleX - expectedScale) > EPSILON_SCALE) return false;
```

**Problem**: The Remapper computes `scaleX` differently per layout role:
- **background**: `scaleX = override.scaleX ?? (targetW / layerW)` — completely independent of `scaleFactor`
- **static**: `scaleX = override.scaleX ?? override.individualScale ?? 1` — no multiplication by `scaleFactor`
- **overlay**: `scaleX = override.scaleX ?? override.individualScale ?? baseXScale`

Only basic `flow` layers without per-axis overrides would match the formula `scaleFactor * individualScale`. For all other roles, the sync check will falsely report "not synced", causing unnecessary visual indicators and potentially triggering unwanted re-verification cycles.

### BUG 2: Overlay Physics Solver Searches Only Root-Level Layers

**Location**: `RemapperNode.tsx:837-861`

```typescript
const overlayItems = transformed.filter(l => getOverride(l.id)?.layoutRole === 'overlay');
// ...
const anchor = transformed.find(t => t.id === anchorId);
const sourceOverlay = sourceData.layers?.find(s => s.id === l.id);
const sourceAnchor = sourceData.layers?.find(s => s.id === anchorId);
```

The physics engine runs at `depth === 0` only (line 789). The `transformed` array at root level contains only root-level entries — children are nested inside `.children`. `Array.find()` is not recursive, so:
- Overlays inside groups (e.g., a label inside a "prizes" group) won't be found by the solver
- Anchors inside groups won't be found for overlay snapping
- The same flat-search issue affects the collision solver (line 816-833) and grid solver (line 792-812)

**Impact**: Physics-based layout adjustments silently fail for any layer nested inside a group. The AI may correctly classify a nested layer as `overlay` with a `linkedAnchorId`, but the Remapper won't reposition it.

---

## Risks (Non-Breaking)

### RISK 1: AI-Hallucinated Layer IDs Are Silently Retained

Hallucinated IDs (e.g., the AI returns `"0.99"` which doesn't exist) survive in the overrides array. The Analyst's validation only checks for **missing** real layer IDs, not for **extra** fake ones. In the Remapper, `getOverride("0.99")` would return the hallucinated override, but no real layer has that ID, so it's inert. However, if a hallucinated ID **coincidentally** matches a layer that the AI didn't intend to target, wrong transforms would apply silently.

### RISK 2: Group + Children Both Receive Overrides

The Analyst's `flattenLayers` includes groups at depth 0-1 alongside their children. The AI produces overrides for both the group AND each child. In the Remapper:
- The group gets transformed coords (but groups don't render pixels)
- Children get their own independent transforms (`parentDeltaX = 0` at line 784)

This means group coords are metadata-only — they affect the group's bounding box in the exported PSD but not the visual positioning of children. If the AI assigns conflicting positions to a group vs. its children, the exported PSD will have mismatched group metadata.

### RISK 3: Dead `gen-layer-` Prefix Filter

`ProceduralContext.tsx:105` filters layers by `l.id.startsWith('gen-layer-')`, but no code path in the codebase creates layers with this prefix. This is unreachable dead code, likely future-proofing that was never implemented.

### RISK 4: `mapLayersToContainers` Creates Orphan IDs

`psdService.ts:422` calls `getCleanLayerTree(layer.children)` with no parent path, creating a parallel set of IDs starting from `"0"` instead of the layer's actual path. These IDs are only used for bounds calculation and immediately discarded, so this doesn't cause bugs, but it's a potential source of confusion if anyone later tries to use these for lookups.
