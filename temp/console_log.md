[extractSourcePixels] Compositing layers for AI: (12) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: BG at (0,0) size 1080x1920
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: !SIMUL at (630,538) size 356x544
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: !SIMUL at (107,400) size 365x540
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: OPTIONS at (350,1062) size 360x538
DesignAnalystNode.tsx:695 [extractSourcePixels] SKIP invisible: !FONT
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: !SIMUL at (348,1350) size 355x174
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: !SIMUL at (629,820) size 355x174
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: !SIMUL at (108,690) size 355x174
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: TEXT at (287,253) size 508x70
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: WIN at (503,1736) size 82x41
DesignAnalystNode.tsx:706 [extractSourcePixels] DRAW: !SIMUL at (450,1791) size 180x97
DesignAnalystNode.tsx:695 [extractSourcePixels] SKIP invisible: !FONT
DesignAnalystNode.tsx:1289 [Analyst] Stage 1: Source Comprehension
DesignAnalystNode.tsx:909 [Analyst] Stage 1 Full Prompt:
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

CONTEXT:
Container: "BONUS1" (1080x1920px)

OUTPUT FORMAT:
Respond with a JSON object matching the SourceAnalysis schema.
Focus on UNDERSTANDING, not layout decisions.
aiProviderService.ts:285 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:286 [Qwen] Model: qwen2.5vl:7b
aiProviderService.ts:135 [aiProviderService] Downscaled image from 1080x1920 to 420x756 (divisible by 28: w=true, h=true)
aiProviderService.ts:174 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:356 [Qwen] Request: 2 messages, 1 images, ~4729 chars text
aiProviderService.ts:357 [Qwen] Options: {num_ctx: 16384}
DesignAnalystNode.tsx:1299 [Analyst] Stage 1 Response (Source comprehension): {narrative: 'The image depicts a scene set in a dimly lit, goth…ibly related to a game or interactive experience.', userExperience: 'The user is expected to make a choice between the …and possibly a sense of adventure or exploration.', primaryElements: Array(3), secondaryElements: Array(6), backgroundElements: Array(3), …}
DesignAnalystNode.tsx:1307 [Analyst] Stage 2: Layout Generation
DesignAnalystNode.tsx:1310 [Analyst] Stage 2 System Prompt (5190 chars):
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
- Design rules: 7 rules to apply (see MANDATORY DESIGN RULES)
- Visual anchors: None provided

SOURCE ANALYSIS (from Stage 1 - use this, don't re-analyze):
- Primary elements: Red potion bottle labeled '1300', Red potion bottle labeled '1300', Smaller red potion bottle labeled '1700'
- Arrangement: The arrangement is a vertical stack with the two larger '1300' potion bottles positioned above the smaller '1700' potion bottle. The smaller bottle is closer to the viewer, creating a sense of depth.
- Dominant: The red potion bottles labeled '1300' and '1700'
- Must preserve: The text 'SCEGLI UNA POZIONE', The two larger '1300' potion bottles, The smaller '1700' potion bottle, The 'WIN' text

TASK: Adapt from Portrait (1080x1920) to Landscape (1280x1024)
Target is LANDSCAPE - spread elements horizontally.

Your visualAnalysis must mention: Red potion bottle labeled '1300', Red potion bottle labeled '1300', Smaller red potion bottle labeled '1700'



MANDATORY DESIGN RULES (cite each in rulesApplied):
<RULES>
- LAYOUT_METHOD: GRID_DISTRIBUTION.
- SPACING: Enforce 50px MIN_PADDING between potion assets and 50px padding from lateral canvas limits.
- SCALING: Maintain uniform scale across all potion groups while maximizing coverage.
- HIERARCHICAL_ANCHORING: Center the 'prize' layer geometrically over the 'potion > red_belly' layer.
- Z-INDEX: Prize layer sits above the Potion layer.
- UI_RESERVES: Lock "Scegli una Pozione" to TOP_CENTER and Win Label/1700 Value to BOTTOM_CENTER.
- CONSTRAINTS: UI text regions are "No-Go Zones" for interactive assets.
</RULES>
Every override implementing a rule must include "citedRule". Uncited rules = invalid output.



LAYERS (12 total, showing 12):
Classify each by name: bg/background/fill→"background", button/cta/nav→"static", label/badge→"overlay", else→"flow"
ID | Name | RelX,RelY | WxH | Type
1.0 | BG | 0.00,0.00 | 1080x1920 | layer
1.1 | !SIMUL | 0.58,0.28 | 356x544 | layer
1.2 | !SIMUL | 0.10,0.21 | 365x540 | layer
1.3 | OPTIONS | 0.32,0.55 | 360x538 | layer
1.4 | !FONT | -0.33,0.47 | 1796x175 | layer
1.5 | !SIMUL | 0.32,0.70 | 355x174 | layer
1.6 | !SIMUL | 0.58,0.43 | 355x174 | layer
1.7 | !SIMUL | 0.10,0.36 | 355x174 | layer
1.8 | TEXT | 0.27,0.13 | 508x70 | layer
1.9 | WIN | 0.47,0.90 | 82x41 | layer
1.10 | !SIMUL | 0.42,0.93 | 180x97 | layer
1.11 | !FONT | 0.14,0.93 | 779x98 | layer


PER-LAYER OVERRIDES (one override per layer, NO EXCEPTIONS):

Role behaviors:
- "background": stretch to fill. scaleX=1.185, scaleY=0.533, xOffset=0, yOffset=0
- "flow": proportional positioning. scale=0.533, position = relativePos × targetDims
- "static": edge-pinned UI. scale~1.0, use edgeAnchor {horizontal,vertical}
- "overlay": attached to parent via linkedAnchorId, scales with parent

Source 1080x1920 → Target 1280x1024
Proportional scale: 0.533

Each override MUST have: layerId, layoutRole, xOffset, yOffset, individualScale.
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

OUTPUT: visualAnalysis (specific), rulesApplied, method, suggestedScale, overrides (ALL layers), reasoning.
Think: 1) What's here? 2) How to arrange in 1280x1024? 3) What scale fits all? 4) Nothing cropped?
DesignAnalystNode.tsx:1460 [Analyst] Stage 2 User Messages: [{…}]
aiProviderService.ts:285 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:286 [Qwen] Model: qwen2.5vl:7b
aiProviderService.ts:135 [aiProviderService] Downscaled image from 1080x1920 to 420x756 (divisible by 28: w=true, h=true)
aiProviderService.ts:174 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:356 [Qwen] Request: 2 messages, 1 images, ~10025 chars text
aiProviderService.ts:357 [Qwen] Options: {num_ctx: 16384}
installHook.js:1 Failed to parse JSON response: SyntaxError: Unterminated string in JSON at position 25581 (line 747 column 6433)
    at JSON.parse (<anonymous>)
    at generateWithQwenLocal (aiProviderService.ts:386:19)
    at async performAnalysis (DesignAnalystNode.tsx:1467:26)
overrideMethod @ installHook.js:1
generateWithQwenLocal @ aiProviderService.ts:388
await in generateWithQwenLocal
generateCompletion @ aiProviderService.ts:424
performAnalysis @ DesignAnalystNode.tsx:1467
await in performAnalysis
handleAnalyze @ DesignAnalystNode.tsx:1820
onClick @ DesignAnalystNode.tsx:531
executeDispatch @ react-dom_client.js?v=7b426fac:13622
runWithFiberInDEV @ react-dom_client.js?v=7b426fac:997
processDispatchQueue @ react-dom_client.js?v=7b426fac:13658
(anonymous) @ react-dom_client.js?v=7b426fac:14071
batchedUpdates$1 @ react-dom_client.js?v=7b426fac:2626
dispatchEventForPluginEventSystem @ react-dom_client.js?v=7b426fac:13763
dispatchEvent @ react-dom_client.js?v=7b426fac:16784
dispatchDiscreteEvent @ react-dom_client.js?v=7b426fac:16765Understand this warning
installHook.js:1 JSON extraction failed, attempting truncation repair...
overrideMethod @ installHook.js:1
generateWithQwenLocal @ aiProviderService.ts:396
await in generateWithQwenLocal
generateCompletion @ aiProviderService.ts:424
performAnalysis @ DesignAnalystNode.tsx:1467
await in performAnalysis
handleAnalyze @ DesignAnalystNode.tsx:1820
onClick @ DesignAnalystNode.tsx:531
executeDispatch @ react-dom_client.js?v=7b426fac:13622
runWithFiberInDEV @ react-dom_client.js?v=7b426fac:997
processDispatchQueue @ react-dom_client.js?v=7b426fac:13658
(anonymous) @ react-dom_client.js?v=7b426fac:14071
batchedUpdates$1 @ react-dom_client.js?v=7b426fac:2626
dispatchEventForPluginEventSystem @ react-dom_client.js?v=7b426fac:13763
dispatchEvent @ react-dom_client.js?v=7b426fac:16784
dispatchDiscreteEvent @ react-dom_client.js?v=7b426fac:16765Understand this warning
installHook.js:1 JSON repair also failed. Raw text length: 25581
overrideMethod @ installHook.js:1
generateWithQwenLocal @ aiProviderService.ts:403
await in generateWithQwenLocal
generateCompletion @ aiProviderService.ts:424
performAnalysis @ DesignAnalystNode.tsx:1467
await in performAnalysis
handleAnalyze @ DesignAnalystNode.tsx:1820
onClick @ DesignAnalystNode.tsx:531
executeDispatch @ react-dom_client.js?v=7b426fac:13622
runWithFiberInDEV @ react-dom_client.js?v=7b426fac:997
processDispatchQueue @ react-dom_client.js?v=7b426fac:13658
(anonymous) @ react-dom_client.js?v=7b426fac:14071
batchedUpdates$1 @ react-dom_client.js?v=7b426fac:2626
dispatchEventForPluginEventSystem @ react-dom_client.js?v=7b426fac:13763
dispatchEvent @ react-dom_client.js?v=7b426fac:16784
dispatchDiscreteEvent @ react-dom_client.js?v=7b426fac:16765Understand this error
DesignAnalystNode.tsx:1523 [Analyst] Missing overrides for 12 layers, generating defaults
DesignAnalystNode.tsx:1639 [Analyst] Total overrides after defaults: 12 (geometry-shift redistribution: P→L horizontal)
DesignAnalystNode.tsx:1668 [Analyst] Stage 2 Full Response: {visualAnalysis: '', rulesApplied: Array(0), method: 'GEOMETRIC', spatialLayout: 'UNIFIED_FIT', suggestedScale: 1, …}
DesignAnalystNode.tsx:1678 [Analyst] Stage 3: Semantic Verification
DesignAnalystNode.tsx:1031 [Analyst] Stage 3 Full Prompt:
 You are a design QA specialist verifying a layout preserves the original composition.

ORIGINAL: The image depicts a scene set in a dimly lit, gothic-style library or laboratory. The focus is on two large, glowing red potion bottles labeled '1300', with a smaller bottle labeled '1700' in the foreground. The text 'SCEGLI UNA POZIONE' (Choose a potion) is prominently displayed at the top, indicating a decision-making scenario. The scene is designed to evoke a sense of mystery and choice, possibly related to a game or interactive experience.
Primary: Red potion bottle labeled '1300', Red potion bottle labeled '1300', Smaller red potion bottle labeled '1700'
Attention: Spiderweb → Bookshelves → Ladder → Text 'SCEGLI UNA POZIONE' → Red potion bottles labeled '1300' → Smaller red potion bottle labeled '1700'
Must preserve: The text 'SCEGLI UNA POZIONE'; The two larger '1300' potion bottles; The smaller '1700' potion bottle; The 'WIN' text

PROPOSED LAYOUT: Target 1280x1024, scale=1x, mode=UNIFIED_FIT
1.0: role=background, pos=(0,0), scale=1.00 scaleXY=(1.19,0.53)
1.1: role=flow, pos=(0,367), scale=0.53
1.2: role=flow, pos=(0,368), scale=0.53
1.3: role=flow, pos=(0,369), scale=0.53
1.4: role=flow, pos=(27,465), scale=0.53
1.5: role=flow, pos=(848,466), scale=0.53
1.6: role=flow, pos=(899,466), scale=0.53
1.7: role=flow, pos=(951,466), scale=0.53
1.8: role=flow, pos=(1003,493), scale=0.53
1.9: role=flow, pos=(1137,501), scale=0.53
1.10: role=flow, pos=(1043,486), scale=0.53
1.11: role=flow, pos=(1002,486), scale=0.53

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
2. Hierarchy maintained? "The red potion bottles labeled '1300' and '1700'" still dominates?
3. All elements visible? No cropping/off-screen? (Check: xOffset >= 0, yOffset >= 0, xOffset + layerWidth*scale <= 1280, yOffset + layerHeight*scale <= 1024)
4. Visual balance? Evenly distributed?
5. Scale appropriate? Text readable?

IF ISSUES: Provide correctedOverrides with ABSOLUTE xOffset/yOffset (from target top-left 0,0).
All coordinates must be >= 0 and fit within 1280x1024.

Output JSON: { "passed": bool, "issues": [...], "correctedOverrides": [...] (if needed), "confidenceScore": 0-1 }
aiProviderService.ts:285 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:286 [Qwen] Model: qwen2.5vl:7b
aiProviderService.ts:135 [aiProviderService] Downscaled image from 1080x1920 to 420x756 (divisible by 28: w=true, h=true)
aiProviderService.ts:174 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:356 [Qwen] Request: 2 messages, 1 images, ~4886 chars text
aiProviderService.ts:357 [Qwen] Options: {num_ctx: 16384}
DesignAnalystNode.tsx:1048 [Analyst] Stage 3 Full Response: {passed: false, narrativePreserved: false, hierarchyMaintained: false, allElementsVisible: false, issues: Array(4), …}
DesignAnalystNode.tsx:1690 [Analyst] Verification result: {passed: false, narrativePreserved: false, hierarchyMaintained: false, allElementsVisible: false, issueCount: 4, …}
DesignAnalystNode.tsx:1745 [Analyst] Verification failed but no corrections provided: (4) [{…}, {…}, {…}, {…}]
psdService.ts:534 [COMPOSITOR] Starting render for 12 root layers. Target: 1280x1024, Origin: 0,0
psdService.ts:563 [LAYER] Depth:0 | Name: "BG" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "BG" at global x:0, y:0 -> local x:0, y:0
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:0, y:367 -> local x:0, y:367
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:0, y:368 -> local x:0, y:368
psdService.ts:563 [LAYER] Depth:0 | Name: "OPTIONS" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "OPTIONS" at global x:0, y:369 -> local x:0, y:369
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:848, y:466 -> local x:848, y:466
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:899, y:466 -> local x:899, y:466
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:951, y:466 -> local x:951, y:466
psdService.ts:563 [LAYER] Depth:0 | Name: "TEXT" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "TEXT" at global x:1003, y:493 -> local x:1003, y:493
psdService.ts:563 [LAYER] Depth:0 | Name: "WIN" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "WIN" at global x:1137, y:501 -> local x:1137, y:501
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:1043, y:486 -> local x:1043, y:486
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
psdService.ts:597 [DRAW] "!SIMUL" at global x:0, y:367 -> local x:0, y:367
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:0, y:368 -> local x:0, y:368
psdService.ts:563 [LAYER] Depth:0 | Name: "OPTIONS" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "OPTIONS" at global x:0, y:369 -> local x:0, y:369
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:848, y:466 -> local x:848, y:466
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:899, y:466 -> local x:899, y:466
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:951, y:466 -> local x:951, y:466
psdService.ts:563 [LAYER] Depth:0 | Name: "TEXT" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "TEXT" at global x:1003, y:493 -> local x:1003, y:493
psdService.ts:563 [LAYER] Depth:0 | Name: "WIN" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "WIN" at global x:1137, y:501 -> local x:1137, y:501
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:1043, y:486 -> local x:1043, y:486
psdService.ts:563 [LAYER] Depth:0 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT