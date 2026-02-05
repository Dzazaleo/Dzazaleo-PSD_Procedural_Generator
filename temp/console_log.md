[extractSourcePixels] Compositing layers for AI: (12) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: BG at (0,0) size 1080x1920
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: !SIMUL at (630,538) size 356x544
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: !SIMUL at (107,400) size 365x540
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: OPTIONS at (350,1062) size 360x538
DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: !FONT
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: !SIMUL at (348,1350) size 355x174
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: !SIMUL at (629,820) size 355x174
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: !SIMUL at (108,690) size 355x174
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: TEXT at (287,253) size 508x70
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: WIN at (503,1736) size 82x41
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: !SIMUL at (450,1791) size 180x97
DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: !FONT
DesignAnalystNode.tsx:1455 [Analyst] Stage 1: Source Comprehension
DesignAnalystNode.tsx:994 [Analyst] Stage 1 Full Prompt:
 You are an expert visual analyst. Your task is to deeply understand this design composition BEFORE any layout decisions are made.

ANALYZE THE IMAGE AND ANSWER THESE QUESTIONS:

═══════════════════════════════════════════════════════════════════════════════
1. NARRATIVE & PURPOSE
═══════════════════════════════════════════════════════════════════════════════
- What is happening in this composition?
- What message does it convey to the viewer?
- What action is the user supposed to take?
- What emotion or response should this evoke?

═══════════════════════════════════════════════════════════════════════════════
2. ELEMENT IDENTIFICATION
═══════════════════════════════════════════════════════════════════════════════
List ALL distinct visual elements you see:
- PRIMARY: Main characters/objects that carry the message
- SECONDARY: Supporting elements (text, labels, UI)
- BACKGROUND: Decorative/atmospheric elements

Be specific: "red potion with 1300 label" not just "potion"

═══════════════════════════════════════════════════════════════════════════════
3. VISUAL HIERARCHY
═══════════════════════════════════════════════════════════════════════════════
- What draws your eye FIRST? SECOND? THIRD?
- Which single element is most important?
- How does size/position/color create this hierarchy?

═══════════════════════════════════════════════════════════════════════════════
4. SPATIAL ARRANGEMENT & RATIONALE
═══════════════════════════════════════════════════════════════════════════════
- HOW are the main elements arranged? (triangular, horizontal row, vertical stack, grid, etc.)
- WHY is this arrangement effective? (creates balance, shows choices, guides eye flow, etc.)
- What spatial relationships are critical? (elements equidistant, title above choices, etc.)

═══════════════════════════════════════════════════════════════════════════════
5. PRESERVATION PRIORITIES
═══════════════════════════════════════════════════════════════════════════════
If this needs to fit a different aspect ratio:
- MUST PRESERVE: What absolutely cannot change? (all choices visible, equal emphasis, etc.)
- CAN ADAPT: What arrangement can be modified? (formation shape, spacing)
- CAN SCALE: What can be made smaller if needed? (decorative elements, secondary text)

═══════════════════════════════════════════════════════════════════════════════
6. SEMANTIC GROUPINGS (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════
Identify elements that are VISUALLY PAIRED — they must move together as a unit.
For each group: what is the "anchor" (larger/main element) and what are its "companions" (attached smaller elements)?

Look for:
- Labels/values ON or NEXT TO objects (e.g., a price tag on a product, a score next to a character)
- Text captions paired with images
- Icons/badges attached to UI elements
- Any small element whose meaning depends on its proximity to a larger element

These pairs MUST stay together when the layout changes. A label separated from its object loses meaning.

CONTEXT:
Container: "BONUS1" (1080x1920px)
This container has 10 visible content layers. Use this count to verify your element identification — make sure you identify ALL of them.

OUTPUT FORMAT:
Respond with a JSON object matching the SourceAnalysis schema.
Focus on UNDERSTANDING, not layout decisions.
aiProviderService.ts:284 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:285 [Qwen] Model: qwen3-vl:8b
aiProviderService.ts:134 [aiProviderService] Downscaled image from 1080x1920 to 576x1024 (divisible by 32: w=true, h=true)
aiProviderService.ts:173 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:355 [Qwen] Request: 2 messages, 1 images, ~6498 chars text
aiProviderService.ts:356 [Qwen] Options: {num_ctx: 16384}
DesignAnalystNode.tsx:1466 [Analyst] Stage 1 Response (Source comprehension): {narrative: 'A fantasy game interface prompting the player to c…library to evoke a magical, immersive experience.', userExperience: 'The user is prompted to select one potion to claim…h its magical setting and clear reward structure.', primaryElements: Array(3), secondaryElements: Array(6), backgroundElements: Array(5), …}
DesignAnalystNode.tsx:1474 [Analyst] Stage 2: Layout Generation
DesignAnalystNode.tsx:1477 [Analyst] Stage 2 System Prompt (6201 chars):
 You are a Senior Art Director specializing in adaptive layout across aspect ratios.

RULES:
1. Constraints are non-negotiable (target dims, design rules, anchors)
2. Visual hierarchy: Primary → Secondary → Tertiary → Background
3. Every decision needs justification via citedRule
4. Readability beats aesthetics

PROCESS: Read constraints → Verify satisfiable → Establish hierarchy → Calculate geometry → Verify fit

GEOMETRY SHIFT (when aspect ratios differ):
Portrait→Landscape: REARRANGE horizontally, spread elements side-by-side
Landscape→Portrait: REARRANGE vertically, stack top-to-bottom
NEVER just scale+crop. RECOMPOSE the layout for the new space.
Example: 3 items + title in portrait → landscape = title at top, 3 items arranged in a row below

HARD RULES:
- NOTHING cropped or off-screen
- Text CENTERED unless rules say otherwise
- Visual balance (not bunched to one side)
- If content doesn't fit at 1.0x, reduce scale until EVERYTHING fits
- Constraints win over aesthetics; explicit rules win over assumptions

TASK: "BONUS1" (1080x1920) → "BONUS1" (1280x1024)
GEOMETRY SHIFT: Portrait -> Landscape. You must RECOMPOSE the layout, not just scale it.
CONSTRAINT SUMMARY:
- Target bounds: 1280x1024px (HARD LIMIT - content must fit)
- Design rules: None provided
- Visual anchors: None provided

SOURCE ANALYSIS (from Stage 1 - use this, don't re-analyze):
- Primary elements: Red potion bottle with 1300 label (top-left), Red potion bottle with 1300 label (top-right), Red potion bottle with 1300 label (center)
- Arrangement: Triangular formation with two potions at the top corners and one centered below, creating a balanced visual hierarchy.
- Dominant: Red potion bottle with 1300 label (center)
- Must preserve: Triangular arrangement of three potions, 1300 labels attached to each potion, Text 'SCEGLI UNA POZIONE' and 'WIN 1700' in their fixed positions

SEMANTIC GROUPS (elements that MUST move together — use "overlay" + linkedAnchorId):
  Red potion bottle (top-left) ← [1300 label on top-left potion] (Label is visually integrated with the bottle, indicating the potion's value)
  Red potion bottle (top-right) ← [1300 label on top-right potion] (Label is visually integrated with the bottle, indicating the potion's value)
  Red potion bottle (center) ← [1300 label on center potion] (Label is visually integrated with the bottle, indicating the potion's value)
Match these groups to layer IDs in the table below. Companions → overlay role, linkedAnchorId = anchor's layer ID.

TASK: Adapt from Portrait (1080x1920) to Landscape (1280x1024)
Target is LANDSCAPE - spread elements horizontally.

Your visualAnalysis must mention: Red potion bottle with 1300 label (top-left), Red potion bottle with 1300 label (top-right), Red potion bottle with 1300 label (center)





LAYERS (12 total, showing 12):
CRITICAL: Use ONLY the first column (ID) as "layerId" in overrides. Do NOT use the Name column.
[HIDDEN] = invisible layer (skip or minimal override). "near:ID" = spatially overlaps that layer.
ID | Name | RelX,RelY | WxH | Type
1.0 | BG | 0.00,0.00 | 1080x1920 | layer
1.1 | !SIMUL | 0.58,0.28 | 356x544 | layer near:1.0
1.2 | !SIMUL | 0.10,0.21 | 365x540 | layer near:1.0
1.3 | OPTIONS | 0.32,0.55 | 360x538 | layer near:1.0
1.4 | !FONT [HIDDEN] | -0.33,0.47 | 1796x175 | layer
1.5 | !SIMUL | 0.32,0.70 | 355x174 | layer near:1.3
1.6 | !SIMUL | 0.58,0.43 | 355x174 | layer near:1.1
1.7 | !SIMUL | 0.10,0.36 | 355x174 | layer near:1.2
1.8 | TEXT | 0.27,0.13 | 508x70 | layer near:1.0
1.9 | WIN | 0.47,0.90 | 82x41 | layer near:1.0
1.10 | !SIMUL | 0.42,0.93 | 180x97 | layer near:1.0
1.11 | !FONT [HIDDEN] | 0.14,0.93 | 779x98 | layer


PER-LAYER OVERRIDES (one override per layer, NO EXCEPTIONS):

Role behaviors:
- "background": stretch to fill. scaleX=1.185, scaleY=0.533, xOffset=0, yOffset=0
- "flow": independent element with proportional positioning. scale=0.533, position = relativePos × targetDims
- "static": edge-pinned UI. scale~1.0, use edgeAnchor {horizontal,vertical}
- "overlay": COMPANION element that MOVES WITH its parent. Set linkedAnchorId to the parent layer's ID.
  The overlay will be repositioned relative to its anchor automatically — just set same xOffset/yOffset as anchor.
  USE THIS for: labels on objects, values near counters, badges on items, captions with images.
  If a layer has "near:ID" in the layer table, it likely overlaps that layer and may be its companion.

SEMANTIC GROUPING RULE (CRITICAL):
When elements are visually paired (a label sits on/near an object), the SMALLER element must be "overlay" with
linkedAnchorId pointing to the LARGER element. This ensures they move together during layout recomposition.
Do NOT make both elements "flow" — they will be separated.

Source 1080x1920 → Target 1280x1024
Proportional scale: 0.533

Each override MUST have: layerId, layoutRole, xOffset, yOffset, individualScale.
layerId MUST be the ID from the first column of the layer table (e.g. "1.0", "1.8"), NOT the layer name.
Missing layers = INVALID OUTPUT.

DECISIONS:
1. spatialLayout: "UNIFIED_FIT" (scale+center) | "STRETCH_FILL" (fill container) | "ABSOLUTE_PIN" (exact positions)
2. layoutMode: "STANDARD" | "GRID" | "DISTRIBUTE_HORIZONTAL" | "DISTRIBUTE_VERTICAL"
3. Classify each layer role: flow/static/overlay/background
4. suggestedScale: min scale so ALL content fits (account for padding rules)
5. overrides: one per layer with layerId, xOffset, yOffset, individualScale, layoutRole

TRIANGULATION: Verify against visual (image), knowledge (rules), metadata (layer names).
HIGH=3/3 agree, MEDIUM=2/3, LOW=0-1 (use geometric fallback).

VERIFY BEFORE OUTPUT:
- All content visible (no cropping)? Fits in 1280x1024?
- Text centered? Visual balance? Geometry recomposed (not just scaled)?
- All rules cited? If ANY fails, adjust before responding.

OUTPUT: method, spatialLayout, suggestedScale, overrides (ALL layers), rulesApplied. Keep visualAnalysis and reasoning BRIEF (1-2 sentences max).
IMPORTANT: Output the "overrides" array EARLY in your JSON — it is the CRITICAL output. Do not write long text before overrides.
Think: 1) What's here? 2) How to arrange in 1280x1024? 3) What scale fits all? 4) Nothing cropped?
DesignAnalystNode.tsx:1628 [Analyst] Stage 2 User Messages: [{…}]
aiProviderService.ts:284 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:285 [Qwen] Model: qwen3-vl:8b
aiProviderService.ts:134 [aiProviderService] Downscaled image from 1080x1920 to 576x1024 (divisible by 32: w=true, h=true)
aiProviderService.ts:173 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:355 [Qwen] Request: 2 messages, 1 images, ~10890 chars text
aiProviderService.ts:356 [Qwen] Options: {num_ctx: 16384}
installHook.js:1 Failed to parse JSON response: SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at generateWithQwenLocal (aiProviderService.ts:387:19)
    at async performAnalysis (DesignAnalystNode.tsx:1635:26)
overrideMethod @ installHook.js:1
generateWithQwenLocal @ aiProviderService.ts:389
await in generateWithQwenLocal
generateCompletion @ aiProviderService.ts:429
performAnalysis @ DesignAnalystNode.tsx:1635
await in performAnalysis
handleAnalyze @ DesignAnalystNode.tsx:2234
onClick @ DesignAnalystNode.tsx:588
executeDispatch @ react-dom_client.js?v=7b426fac:13622
runWithFiberInDEV @ react-dom_client.js?v=7b426fac:997
processDispatchQueue @ react-dom_client.js?v=7b426fac:13658
(anonymous) @ react-dom_client.js?v=7b426fac:14071
batchedUpdates$1 @ react-dom_client.js?v=7b426fac:2626
dispatchEventForPluginEventSystem @ react-dom_client.js?v=7b426fac:13763
dispatchEvent @ react-dom_client.js?v=7b426fac:16784
dispatchDiscreteEvent @ react-dom_client.js?v=7b426fac:16765Understand this warning
DesignAnalystNode.tsx:1765 [Analyst] Missing overrides for 12 layers, generating defaults
DesignAnalystNode.tsx:1910 [Analyst] Redistribution: 2 row items, 2 spanning/outlier (proportional): OPTIONS, !SIMUL
DesignAnalystNode.tsx:1915 [Analyst] Spatial proximity detected 3 companion layers: 1.5→1.3, 1.6→1.1, 1.7→1.2
DesignAnalystNode.tsx:2053 [Analyst] Total overrides after defaults: 12 (geometry-shift redistribution: P→L horizontal)
DesignAnalystNode.tsx:2082 [Analyst] Stage 2 Full Response: {visualAnalysis: '', rulesApplied: Array(0), method: 'GEOMETRIC', spatialLayout: 'UNIFIED_FIT', suggestedScale: 1, …}
DesignAnalystNode.tsx:2092 [Analyst] Stage 3: Semantic Verification
DesignAnalystNode.tsx:1121 [Analyst] Stage 3 Full Prompt:
 You are a design QA specialist verifying a layout preserves the original composition.

ORIGINAL: A fantasy game interface prompting the player to choose one of three potions, each offering a 1300-point reward, with the goal of winning a total of 1700 points. The scene is set in a mystical library to evoke a magical, immersive experience.
Primary: Red potion bottle with 1300 label (top-left), Red potion bottle with 1300 label (top-right), Red potion bottle with 1300 label (center)
Attention: 1300 label on center potion → 1300 label on top-left potion → 1300 label on top-right potion → Text: 'SCEGLI UNA POZIONE' → Text: 'WIN 1700'
Must preserve: Triangular arrangement of three potions; 1300 labels attached to each potion; Text 'SCEGLI UNA POZIONE' and 'WIN 1700' in their fixed positions

PROPOSED LAYOUT: Target 1280x1024, scale=1x, mode=UNIFIED_FIT
1.0 (BG): role=background, pos=(0,0), scale=1.00 scaleXY=(1.19,0.53)
1.1 (!SIMUL): role=flow, pos=(298,367), scale=0.53
1.2 (!SIMUL): role=flow, pos=(787,368), scale=0.53
1.3 (OPTIONS): role=flow, pos=(532,566), scale=0.53
1.4 (!FONT): role=flow, pos=(-425,485), scale=0.53
1.5 (!SIMUL): role=overlay, pos=(412,720), scale=0.53
1.6 (!SIMUL): role=overlay, pos=(745,437), scale=0.53
1.7 (!SIMUL): role=overlay, pos=(128,368), scale=0.53
1.8 (TEXT): role=static, pos=(340,135), scale=1.00
1.9 (WIN): role=static, pos=(596,926), scale=1.00
1.10 (!SIMUL): role=flow, pos=(592,955), scale=0.53
1.11 (!FONT): role=flow, pos=(180,955), scale=0.53

LAYER DIMENSIONS (for coordinate validation):
1.0 BG: 1080x1920 at (0,0)
1.1 !SIMUL: 356x544 at (630,538)
1.2 !SIMUL: 365x540 at (107,400)
1.3 OPTIONS: 360x538 at (350,1062)
1.4 !FONT: 1796x175 at (-359,910)
1.5 !SIMUL: 355x174 at (348,1350)
1.6 !SIMUL: 355x174 at (629,820)
1.7 !SIMUL: 355x174 at (108,690)
1.8 TEXT: 508x70 at (287,253)
1.9 WIN: 82x41 at (503,1736)
1.10 !SIMUL: 180x97 at (450,1791)
1.11 !FONT: 779x98 at (152,1791)

VERIFY (YES/NO each):
1. Narrative preserved? Story still clear?
2. Hierarchy maintained? "Red potion bottle with 1300 label (center)" still dominates?
3. All elements visible? No cropping/off-screen? (Check: xOffset >= 0, yOffset >= 0, xOffset + layerWidth*scale <= 1280, yOffset + layerHeight*scale <= 1024)
4. Visual balance? Evenly distributed?
5. Scale appropriate? Text readable?

IF ANY CHECK FAILS (passed=false), you MUST populate "correctedOverrides" — do NOT leave it empty.
For each corrected override: { layerId, xOffset, yOffset, individualScale, layoutRole }
An empty correctedOverrides with passed=false is INVALID output.
Provide correctedOverrides with ABSOLUTE xOffset/yOffset (from target top-left 0,0).
All coordinates must be >= 0 and fit within 1280x1024.

Output JSON: { "passed": bool, "issues": [...], "correctedOverrides": [...] (if needed), "confidenceScore": 0-1 }
aiProviderService.ts:284 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:285 [Qwen] Model: qwen3-vl:8b
aiProviderService.ts:134 [aiProviderService] Downscaled image from 1080x1920 to 576x1024 (divisible by 32: w=true, h=true)
aiProviderService.ts:173 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:355 [Qwen] Request: 2 messages, 1 images, ~5085 chars text
aiProviderService.ts:356 [Qwen] Options: {num_ctx: 16384}
installHook.js:1 Failed to parse JSON response: SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at generateWithQwenLocal (aiProviderService.ts:387:19)
    at async verifyLayoutSemantically (DesignAnalystNode.tsx:1123:22)
    at async performAnalysis (DesignAnalystNode.tsx:2095:34)
overrideMethod @ installHook.js:1
generateWithQwenLocal @ aiProviderService.ts:389
await in generateWithQwenLocal
generateCompletion @ aiProviderService.ts:429
verifyLayoutSemantically @ DesignAnalystNode.tsx:1123
performAnalysis @ DesignAnalystNode.tsx:2095
await in performAnalysis
handleAnalyze @ DesignAnalystNode.tsx:2234
onClick @ DesignAnalystNode.tsx:588
executeDispatch @ react-dom_client.js?v=7b426fac:13622
runWithFiberInDEV @ react-dom_client.js?v=7b426fac:997
processDispatchQueue @ react-dom_client.js?v=7b426fac:13658
(anonymous) @ react-dom_client.js?v=7b426fac:14071
batchedUpdates$1 @ react-dom_client.js?v=7b426fac:2626
dispatchEventForPluginEventSystem @ react-dom_client.js?v=7b426fac:13763
dispatchEvent @ react-dom_client.js?v=7b426fac:16784
dispatchDiscreteEvent @ react-dom_client.js?v=7b426fac:16765Understand this warning
DesignAnalystNode.tsx:1138 [Analyst] Stage 3 Full Response: {}
DesignAnalystNode.tsx:2104 [Analyst] Verification result: {passed: false, narrativePreserved: false, hierarchyMaintained: false, allElementsVisible: false, issueCount: 0, …}
DesignAnalystNode.tsx:2159 [Analyst] Verification failed but no corrections provided: []
psdService.ts:534 [COMPOSITOR] Starting render for 12 root layers. Target: 1280x1024, Origin: 0,0
psdService.ts:563 [LAYER] Depth:0 | Name: "BG" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "BG" at global x:0, y:0 -> local x:0, y:0
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:298, y:367 -> local x:298, y:367
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:787, y:368 -> local x:787, y:368
psdService.ts:563 [LAYER] Depth:0 | Name: "OPTIONS" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "OPTIONS" at global x:532, y:566 -> local x:532, y:566
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:531, y:720 -> local x:531, y:720
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:298, y:517 -> local x:298, y:517
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:787, y:523 -> local x:787, y:523
psdService.ts:563 [LAYER] Depth:0 | Name: "TEXT" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "TEXT" at global x:340, y:135 -> local x:340, y:135
psdService.ts:563 [LAYER] Depth:0 | Name: "WIN" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "WIN" at global x:596, y:926 -> local x:596, y:926
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:592, y:955 -> local x:592, y:955
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:534 [COMPOSITOR] Starting render for 12 root layers. Target: 1280x1024, Origin: 0,0
psdService.ts:563 [LAYER] Depth:0 | Name: "BG" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "BG" at global x:352, y:0 -> local x:352, y:0
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:688, y:287 -> local x:688, y:287
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:409, y:213 -> local x:409, y:213
psdService.ts:563 [LAYER] Depth:0 | Name: "OPTIONS" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "OPTIONS" at global x:539, y:566 -> local x:539, y:566
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:538, y:720 -> local x:538, y:720
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:687, y:437 -> local x:687, y:437
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:410, y:368 -> local x:410, y:368
psdService.ts:563 [LAYER] Depth:0 | Name: "TEXT" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "TEXT" at global x:505, y:135 -> local x:505, y:135
psdService.ts:563 [LAYER] Depth:0 | Name: "WIN" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "WIN" at global x:620, y:926 -> local x:620, y:926
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:592, y:955 -> local x:592, y:955
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:534 [COMPOSITOR] Starting render for 12 root layers. Target: 1280x1024, Origin: 0,0
psdService.ts:563 [LAYER] Depth:0 | Name: "BG" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "BG" at global x:0, y:0 -> local x:0, y:0
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:298, y:367 -> local x:298, y:367
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:787, y:368 -> local x:787, y:368
psdService.ts:563 [LAYER] Depth:0 | Name: "OPTIONS" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "OPTIONS" at global x:532, y:566 -> local x:532, y:566
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:531, y:720 -> local x:531, y:720
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:298, y:517 -> local x:298, y:517
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:787, y:523 -> local x:787, y:523
psdService.ts:563 [LAYER] Depth:0 | Name: "TEXT" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "TEXT" at global x:340, y:135 -> local x:340, y:135
psdService.ts:563 [LAYER] Depth:0 | Name: "WIN" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "WIN" at global x:596, y:926 -> local x:596, y:926
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:592, y:955 -> local x:592, y:955
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT