[extractSourcePixels] Compositing layers for AI: (7) [{…}, {…}, {…}, {…}, {…}, {…}, {…}]
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: BG at (0,0) size 1080x1920
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: !SIMUL at (986,659) size 101x67
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: LEVEL_POINTER at (-8,662) size 101x67
DesignAnalystNode.tsx:756 [extractSourcePixels] GROUP: PRIZE_FONT (1 children)
DesignAnalystNode.tsx:756 [extractSourcePixels]   GROUP: FONT (26 children)
3DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: !SIMUL
DesignAnalystNode.tsx:763 [extractSourcePixels]     DRAW: !SIMUL at (284,1482) size 112x76
2DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: !SIMUL
DesignAnalystNode.tsx:763 [extractSourcePixels]     DRAW: !SIMUL at (696,1170) size 112x76
5DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: !SIMUL
DesignAnalystNode.tsx:763 [extractSourcePixels]     DRAW: !SIMUL at (486,976) size 112x76
4DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: !SIMUL
DesignAnalystNode.tsx:763 [extractSourcePixels]     DRAW: !SIMUL at (486,783) size 112x76
6DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: !SIMUL
DesignAnalystNode.tsx:763 [extractSourcePixels]     DRAW: !SIMUL at (54,641) size 112x76
DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: !FONT
DesignAnalystNode.tsx:756 [extractSourcePixels] GROUP: HIGH_PRIZES (3 children)
DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: 5000
DesignAnalystNode.tsx:763 [extractSourcePixels]   DRAW: MAX_WIN at (473,327) size 143x151
DesignAnalystNode.tsx:752 [extractSourcePixels] SKIP invisible: 2500
DesignAnalystNode.tsx:756 [extractSourcePixels] GROUP: LIFE_COUNTER (4 children)
DesignAnalystNode.tsx:763 [extractSourcePixels]   DRAW: !SIMUL at (349,14) size 53x66
DesignAnalystNode.tsx:763 [extractSourcePixels]   DRAW: !SIMUL at (295,14) size 53x66
DesignAnalystNode.tsx:763 [extractSourcePixels]   DRAW: ON at (241,14) size 54x66
DesignAnalystNode.tsx:763 [extractSourcePixels]   DRAW: LABEL at (33,25) size 203x43
DesignAnalystNode.tsx:763 [extractSourcePixels] DRAW: TEXT at (293,1291) size 495x70
DesignAnalystNode.tsx:1442 [Analyst] Stage 1: Source Comprehension
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
Container: "BONUS2" (1080x1920px)
This container has 18 visible content layers. Use this count to verify your element identification — make sure you identify ALL of them.

OUTPUT FORMAT:
Respond with a JSON object matching the SourceAnalysis schema.
Focus on UNDERSTANDING, not layout decisions.
aiProviderService.ts:287 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:288 [Qwen] Model: qwen3-vl:8b-instruct
aiProviderService.ts:137 [aiProviderService] Downscaled image from 1080x1920 to 576x1024 (divisible by 32: w=true, h=true)
aiProviderService.ts:176 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:361 [Qwen] Request: 2 messages, 1 images, ~6593 chars text
aiProviderService.ts:362 [Qwen] Options: {num_ctx: 32768}
aiProviderService.ts:384 [Qwen] Response received: {hasContent: true, contentLength: 2773, hasReasoning: false, reasoningLength: 0, finishReason: 'stop', …}
DesignAnalystNode.tsx:1453 [Analyst] Stage 1 Response (Source comprehension): {narrative: "A spooky, haunted house game interface where the p…N' banner indicating the highest possible reward.", userExperience: 'The user is prompted to select a window to win a r…, and gamified, evoking excitement and curiosity.', primaryElements: Array(3), secondaryElements: Array(8), backgroundElements: Array(7), …}
DesignAnalystNode.tsx:1461 [Analyst] Stage 2: Layout Generation
DesignAnalystNode.tsx:1464 [Analyst] Stage 2 System Prompt (5914 chars):
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

TASK: "BONUS2" (1080x1920) → "BONUS2" (1280x1024)
GEOMETRY SHIFT: Portrait -> Landscape. You must RECOMPOSE the layout, not just scale it.
CONSTRAINT SUMMARY:
- Target bounds: 1280x1024px (HARD LIMIT - content must fit)
- Design rules: None provided
- Visual anchors: None provided

SOURCE ANALYSIS (from Stage 1 - use this, don't re-analyze):
- Primary elements: haunted house, windows with '100' labels, MAX WIN banner
- Arrangement: Vertical grid of windows with a central focus on the house, with UI elements positioned at the top and center for clear interaction.
- Dominant: MAX WIN banner
- Must preserve: MAX WIN banner must remain centered above the house, TENTATIVI counter must remain at the top, SCEGLI LA FINESTRA text must remain centered below the windows, Each window must remain with its '100' label

SEMANTIC GROUPS (elements that MUST move together — use "overlay" + linkedAnchorId):
  MAX WIN banner ← [house] (banner is centered above the house)
  TENTATIVI counter ← [lives icons] (counter is next to the lives icons)
  SCEGLI LA FINESTRA text ← [windows with '100' labels] (text is centered below the windows)
  windows ← [100 labels] (labels are next to the windows)
Match these groups to layer IDs in the table below. Companions → overlay role, linkedAnchorId = anchor's layer ID.

TASK: Adapt from Portrait (1080x1920) to Landscape (1280x1024)
Target is LANDSCAPE - spread elements horizontally.





LAYERS (41 total, showing 20):
CRITICAL: Use ONLY the first column (ID) as "layerId" in overrides. Do NOT use the Name column.
[HIDDEN] = invisible layer (skip or minimal override). "near:ID" = spatially overlaps that layer.
ID | Name | RelX,RelY | WxH | Type
6.0.0 | BG | 0.00,0.00 | 1080x1920 | layer
6.0.1 | !SIMUL | 0.91,0.34 | 101x67 | layer near:6.0.0
6.0.2 | LEVEL_POINTER | -0.01,0.34 | 101x67 | layer near:6.0.3
6.0.3 | PRIZE_FONT | 0.05,0.33 | 754x917 | group (1ch) near:6.0.0
6.0.3.0 | FONT | 0.05,0.33 | 754x917 | group (26ch) near:6.0.0
6.0.3.0.0 | !SIMUL [HIDDEN] | 0.80,0.77 | 112x76 | layer
6.0.3.0.1 | !SIMUL [HIDDEN] | 0.63,0.77 | 113x76 | layer
6.0.3.0.2 | !SIMUL [HIDDEN] | 0.45,0.77 | 112x76 | layer
6.0.3.0.3 | !SIMUL | 0.26,0.77 | 112x76 | layer near:6.0.3
6.0.3.0.4 | !SIMUL [HIDDEN] | 0.10,0.77 | 113x76 | layer
6.0.3.0.5 | !SIMUL [HIDDEN] | 0.83,0.64 | 112x76 | layer
6.0.3.0.6 | !SIMUL | 0.64,0.61 | 112x76 | layer near:6.0.3
6.0.3.0.7 | !SIMUL [HIDDEN] | 0.45,0.61 | 112x76 | layer
6.0.3.0.8 | !SIMUL [HIDDEN] | 0.25,0.61 | 112x76 | layer
6.0.3.0.9 | !SIMUL [HIDDEN] | 0.07,0.64 | 112x76 | layer
6.0.3.0.10 | !SIMUL [HIDDEN] | 0.84,0.53 | 112x76 | layer
6.0.3.0.11 | !SIMUL [HIDDEN] | 0.64,0.51 | 112x76 | layer
6.0.3.0.12 | !SIMUL | 0.45,0.51 | 112x76 | layer near:6.0.3
6.0.3.0.13 | !SIMUL [HIDDEN] | 0.25,0.51 | 112x76 | layer
6.0.3.0.14 | !SIMUL [HIDDEN] | 0.06,0.53 | 112x76 | layer


PER-LAYER OVERRIDES (one override per layer, NO EXCEPTIONS):

COORDINATE SYSTEM: xOffset and yOffset are ABSOLUTE PIXEL positions from target top-left (0,0).
- xOffset ranges from 0 to 1280
- yOffset ranges from 0 to 1024
To convert from layer table: xOffset = RelX × 1280, yOffset = RelY × 1024
Example: layer at RelX=0.58, RelY=0.28 → xOffset=742, yOffset=287

Role behaviors (choose based on element function):
- "background": Full-bleed fill. scaleX=1.185, scaleY=0.533, xOffset=0, yOffset=0
- "flow": Main visual content (items, images, cards, characters, products). scale=0.533.
  xOffset = RelX × 1280, yOffset = RelY × 1024. These are the BIGGEST elements after background.
- "static": Small UI pinned to edges (buttons, counters, close icons). scale~1.0, use edgeAnchor {horizontal,vertical}.
  Still needs xOffset/yOffset in PIXELS (e.g., xOffset=640, yOffset=922)
- "overlay": COMPANION attached to a larger element. Set linkedAnchorId to parent's layer ID.
  USE for: labels on objects, values near counters, badges on items.
  If "near:ID" in layer table → likely companion of that layer.

SEMANTIC GROUPING RULE (CRITICAL):
When elements are visually paired (a label sits on/near an object), the SMALLER element must be "overlay" with
linkedAnchorId pointing to the LARGER element. This ensures they move together during layout recomposition.
Do NOT make both elements "flow" — they will be separated.

Source 1080x1920 → Target 1280x1024
Proportional scale: 0.533

Each override MUST have: layerId, layoutRole, xOffset (PIXELS 0-1280), yOffset (PIXELS 0-1024), individualScale.
layerId MUST be the ID from the first column (e.g. "1.0", "1.8"), NOT the layer name.
Missing layers = INVALID OUTPUT.

OUTPUT: JSON with "overrides" array FIRST (one entry per layer), then "method", "spatialLayout", "suggestedScale".
"overrides" is the CRITICAL output — emit it FIRST. Every layer MUST have an override. Missing layers = INVALID.
VERIFY: All content fits in 1280x1024? Nothing cropped or off-screen? Text centered? Visual balance?
DesignAnalystNode.tsx:1566 [Analyst] Stage 2 User Messages: [{…}]
aiProviderService.ts:287 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:288 [Qwen] Model: qwen3-vl:8b-instruct
aiProviderService.ts:137 [aiProviderService] Downscaled image from 1080x1920 to 576x1024 (divisible by 32: w=true, h=true)
aiProviderService.ts:176 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:361 [Qwen] Request: 2 messages, 1 images, ~8086 chars text
aiProviderService.ts:362 [Qwen] Options: {num_ctx: 32768}
aiProviderService.ts:384 [Qwen] Response received: {hasContent: true, contentLength: 107, hasReasoning: false, reasoningLength: 0, finishReason: 'stop', …}
DesignAnalystNode.tsx:1742 [Analyst] Missing overrides for 41 layers, generating defaults
DesignAnalystNode.tsx:1887 [Analyst] Redistribution: 12 row items, 3 spanning/outlier (proportional): !SIMUL, !SIMUL, !SIMUL
DesignAnalystNode.tsx:2030 [Analyst] Total overrides after defaults: 41 (geometry-shift redistribution: P→L horizontal)
DesignAnalystNode.tsx:2059 [Analyst] Stage 2 Full Response: {visualAnalysis: '', rulesApplied: Array(0), method: 'GEOMETRIC', spatialLayout: 'UNIFIED_FIT', suggestedScale: 0.533, …}
DesignAnalystNode.tsx:2069 [Analyst] Stage 3: Semantic Verification
DesignAnalystNode.tsx:1121 [Analyst] Stage 3 Full Prompt:
 You are a design QA specialist verifying a layout preserves the original composition.

ORIGINAL: A spooky, haunted house game interface where the player must choose one of several windows to win a prize, with a 'MAX WIN' banner indicating the highest possible reward.
Primary: haunted house, windows with '100' labels, MAX WIN banner
Attention: MAX WIN banner → windows with '100' labels → TENTATIVI counter
Must preserve: MAX WIN banner must remain centered above the house; TENTATIVI counter must remain at the top; SCEGLI LA FINESTRA text must remain centered below the windows; Each window must remain with its '100' label

PROPOSED LAYOUT: Target 1280x1024, scale=0.533x, mode=UNIFIED_FIT
6.0.0 (BG): role=background, pos=(0,0), scale=1.00 scaleXY=(1.19,0.53)
6.0.1 (!SIMUL): role=flow, pos=(60,494), scale=0.53
6.0.2 (LEVEL_POINTER): role=flow, pos=(174,494), scale=0.53
6.0.3 (PRIZE_FONT): role=flow, pos=(288,512), scale=0.53
6.0.3.0 (FONT): role=flow, pos=(349,512), scale=0.53
6.0.3.0.0 (!SIMUL): role=flow, pos=(1025,790), scale=0.53
6.0.3.0.1 (!SIMUL): role=flow, pos=(808,790), scale=0.53
6.0.3.0.2 (!SIMUL): role=flow, pos=(571,790), scale=0.53
6.0.3.0.3 (!SIMUL): role=flow, pos=(373,790), scale=0.53
6.0.3.0.4 (!SIMUL): role=flow, pos=(123,790), scale=0.53
6.0.3.0.5 (!SIMUL): role=flow, pos=(1057,651), scale=0.53
6.0.3.0.6 (!SIMUL): role=flow, pos=(861,624), scale=0.53
6.0.3.0.7 (!SIMUL): role=flow, pos=(576,624), scale=0.53
6.0.3.0.8 (!SIMUL): role=flow, pos=(321,624), scale=0.53
6.0.3.0.9 (!SIMUL): role=flow, pos=(90,651), scale=0.53
6.0.3.0.10 (!SIMUL): role=flow, pos=(1071,548), scale=0.53
6.0.3.0.11 (!SIMUL): role=flow, pos=(825,521), scale=0.53
6.0.3.0.12 (!SIMUL): role=flow, pos=(613,521), scale=0.53
6.0.3.0.13 (!SIMUL): role=flow, pos=(321,521), scale=0.53
6.0.3.0.14 (!SIMUL): role=flow, pos=(81,548), scale=0.53
6.0.3.0.15 (!SIMUL): role=flow, pos=(1079,450), scale=0.53
6.0.3.0.16 (!SIMUL): role=flow, pos=(837,423), scale=0.53
6.0.3.0.17 (!SIMUL): role=flow, pos=(409,492), scale=0.53
6.0.3.0.18 (!SIMUL): role=flow, pos=(316,423), scale=0.53
6.0.3.0.19 (!SIMUL): role=flow, pos=(75,450), scale=0.53
6.0.3.0.20 (!SIMUL): role=flow, pos=(1089,342), scale=0.53
6.0.3.0.21 (!SIMUL): role=flow, pos=(837,335), scale=0.53
6.0.3.0.22 (!SIMUL): role=flow, pos=(576,313), scale=0.53
6.0.3.0.23 (!SIMUL): role=flow, pos=(309,335), scale=0.53
6.0.3.0.24 (!SIMUL): role=flow, pos=(529,492), scale=0.53
6.0.3.0.25 (!FONT): role=flow, pos=(60,550), scale=0.53
6.0.4 (HIGH_PRIZES): role=flow, pos=(649,512), scale=0.53
6.0.4.0 (5000): role=flow, pos=(544,198), scale=0.53
6.0.4.1 (MAX_WIN): role=flow, pos=(709,472), scale=0.53
6.0.4.2 (2500): role=flow, pos=(542,198), scale=0.53
6.0.5 (LIFE_COUNTER): role=static, pos=(0,0), scale=1.00
6.0.5.0 (!SIMUL): role=flow, pos=(845,494), scale=0.53
6.0.5.1 (!SIMUL): role=flow, pos=(934,494), scale=0.53
6.0.5.2 (ON): role=flow, pos=(1022,494), scale=0.53
6.0.5.3 (LABEL): role=overlay, pos=(1112,501), scale=0.53
6.0.6 (TEXT): role=static, pos=(347,689), scale=1.00

LAYER DIMENSIONS (for coordinate validation):
6.0.0 BG: 1080x1920 at (0,0)
6.0.1 !SIMUL: 101x67 at (986,659)
6.0.2 LEVEL_POINTER: 101x67 at (-8,662)
6.0.3 PRIZE_FONT: 0x0 at (0,0)
6.0.3.0 FONT: 0x0 at (0,0)
6.0.3.0.0 !SIMUL: 112x76 at (865,1482)
6.0.3.0.1 !SIMUL: 113x76 at (682,1482)
6.0.3.0.2 !SIMUL: 112x76 at (482,1482)
6.0.3.0.3 !SIMUL: 112x76 at (284,1482)
6.0.3.0.4 !SIMUL: 113x76 at (104,1482)
6.0.3.0.5 !SIMUL: 112x76 at (892,1221)
6.0.3.0.6 !SIMUL: 112x76 at (696,1170)
6.0.3.0.7 !SIMUL: 112x76 at (486,1170)
6.0.3.0.8 !SIMUL: 112x76 at (271,1170)
6.0.3.0.9 !SIMUL: 112x76 at (76,1221)
6.0.3.0.10 !SIMUL: 112x76 at (904,1027)
6.0.3.0.11 !SIMUL: 112x76 at (696,976)
6.0.3.0.12 !SIMUL: 112x76 at (486,976)
6.0.3.0.13 !SIMUL: 112x76 at (271,976)
6.0.3.0.14 !SIMUL: 112x76 at (68,1027)
6.0.3.0.15 !SIMUL: 112x76 at (910,844)
6.0.3.0.16 !SIMUL: 112x76 at (706,793)
6.0.3.0.17 !SIMUL: 112x76 at (486,783)
6.0.3.0.18 !SIMUL: 112x76 at (267,793)
6.0.3.0.19 !SIMUL: 113x76 at (63,844)
6.0.3.0.20 !SIMUL: 112x76 at (919,641)
6.0.3.0.21 !SIMUL: 112x76 at (706,629)
6.0.3.0.22 !SIMUL: 112x76 at (486,586)
6.0.3.0.23 !SIMUL: 112x76 at (261,629)
6.0.3.0.24 !SIMUL: 112x76 at (54,641)
6.0.3.0.25 !FONT: 972x106 at (51,1031)
6.0.4 HIGH_PRIZES: 0x0 at (0,0)
6.0.4.0 5000: 164x76 at (459,371)
6.0.4.1 MAX_WIN: 143x151 at (473,327)
6.0.4.2 2500: 163x76 at (457,371)
6.0.5 LIFE_COUNTER: 0x0 at (0,0)
6.0.5.0 !SIMUL: 53x66 at (349,14)
6.0.5.1 !SIMUL: 53x66 at (295,14)
6.0.5.2 ON: 54x66 at (241,14)
6.0.5.3 LABEL: 203x43 at (33,25)
6.0.6 TEXT: 495x70 at (293,1291)

VERIFY (YES/NO each):
1. Narrative preserved? Story still clear?
2. Hierarchy maintained? "MAX WIN banner" still dominates?
3. All elements visible? No cropping/off-screen? (Check: xOffset >= 0, yOffset >= 0, xOffset + layerWidth*scale <= 1280, yOffset + layerHeight*scale <= 1024)
4. Visual balance? Evenly distributed?
5. Scale appropriate? Text readable?

IF ANY CHECK FAILS (passed=false), you MUST populate "correctedOverrides" — do NOT leave it empty.
For each corrected override: { layerId, xOffset, yOffset, individualScale, layoutRole }
An empty correctedOverrides with passed=false is INVALID output.
Provide correctedOverrides with ABSOLUTE xOffset/yOffset (from target top-left 0,0).
All coordinates must be >= 0 and fit within 1280x1024.

Output JSON: { "passed": bool, "issues": [...], "correctedOverrides": [...] (if needed), "confidenceScore": 0-1 }
aiProviderService.ts:287 [Qwen] Starting request to: http://localhost:11434/v1
aiProviderService.ts:288 [Qwen] Model: qwen3-vl:8b-instruct
aiProviderService.ts:137 [aiProviderService] Downscaled image from 1080x1920 to 576x1024 (divisible by 32: w=true, h=true)
aiProviderService.ts:176 [Qwen] Processed 1 images (skipped 0 to stay under limit)
aiProviderService.ts:361 [Qwen] Request: 2 messages, 1 images, ~7808 chars text
aiProviderService.ts:362 [Qwen] Options: {num_ctx: 32768}
aiProviderService.ts:384 [Qwen] Response received: {hasContent: true, contentLength: 199, hasReasoning: false, reasoningLength: 0, finishReason: null, …}
installHook.js:1 [Qwen] Failed to parse JSON response: SyntaxError: Expected ',' or '}' after property value in JSON at position 20 (line 2 column 19)
    at JSON.parse (<anonymous>)
    at generateWithQwenLocal (aiProviderService.ts:454:21)
    at async verifyLayoutSemantically (DesignAnalystNode.tsx:1123:22)
    at async performAnalysis (DesignAnalystNode.tsx:2072:34)
overrideMethod @ installHook.js:1
generateWithQwenLocal @ aiProviderService.ts:456
await in generateWithQwenLocal
generateCompletion @ aiProviderService.ts:500
verifyLayoutSemantically @ DesignAnalystNode.tsx:1123
performAnalysis @ DesignAnalystNode.tsx:2072
await in performAnalysis
handleAnalyze @ DesignAnalystNode.tsx:2211
onClick @ DesignAnalystNode.tsx:588
executeDispatch @ react-dom_client.js?v=7b426fac:13622
runWithFiberInDEV @ react-dom_client.js?v=7b426fac:997
processDispatchQueue @ react-dom_client.js?v=7b426fac:13658
(anonymous) @ react-dom_client.js?v=7b426fac:14071
batchedUpdates$1 @ react-dom_client.js?v=7b426fac:2626
dispatchEventForPluginEventSystem @ react-dom_client.js?v=7b426fac:13763
dispatchEvent @ react-dom_client.js?v=7b426fac:16784
dispatchDiscreteEvent @ react-dom_client.js?v=7b426fac:16765Understand this warning
installHook.js:1 [Qwen] No JSON object found in response text. First 200 chars: {
  "passed": false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false
overrideMethod @ installHook.js:1
generateWithQwenLocal @ aiProviderService.ts:480
await in generateWithQwenLocal
generateCompletion @ aiProviderService.ts:500
verifyLayoutSemantically @ DesignAnalystNode.tsx:1123
performAnalysis @ DesignAnalystNode.tsx:2072
await in performAnalysis
handleAnalyze @ DesignAnalystNode.tsx:2211
onClick @ DesignAnalystNode.tsx:588
executeDispatch @ react-dom_client.js?v=7b426fac:13622
runWithFiberInDEV @ react-dom_client.js?v=7b426fac:997
processDispatchQueue @ react-dom_client.js?v=7b426fac:13658
(anonymous) @ react-dom_client.js?v=7b426fac:14071
batchedUpdates$1 @ react-dom_client.js?v=7b426fac:2626
dispatchEventForPluginEventSystem @ react-dom_client.js?v=7b426fac:13763
dispatchEvent @ react-dom_client.js?v=7b426fac:16784
dispatchDiscreteEvent @ react-dom_client.js?v=7b426fac:16765Understand this error
DesignAnalystNode.tsx:1138 [Analyst] Stage 3 Full Response: {}
DesignAnalystNode.tsx:2081 [Analyst] Verification result: {passed: false, narrativePreserved: false, hierarchyMaintained: false, allElementsVisible: false, issueCount: 0, …}
DesignAnalystNode.tsx:2136 [Analyst] Verification failed but no corrections provided: []
psdService.ts:534 [COMPOSITOR] Starting render for 7 root layers. Target: 1280x1024, Origin: 0,0
psdService.ts:563 [LAYER] Depth:0 | Name: "BG" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "BG" at global x:0, y:0 -> local x:0, y:0
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:60, y:494 -> local x:60, y:494
psdService.ts:563 [LAYER] Depth:0 | Name: "LEVEL_POINTER" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "LEVEL_POINTER" at global x:174, y:494 -> local x:174, y:494
psdService.ts:563 [LAYER] Depth:0 | Name: "PRIZE_FONT" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "FONT" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:373, y:790 -> local x:373, y:790
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:861, y:624 -> local x:861, y:624
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:613, y:521 -> local x:613, y:521
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:409, y:492 -> local x:409, y:492
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:529, y:492 -> local x:529, y:492
psdService.ts:563 [LAYER] Depth:2 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:563 [LAYER] Depth:0 | Name: "HIGH_PRIZES" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "5000" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: 5000
psdService.ts:563 [LAYER] Depth:1 | Name: "MAX_WIN" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "MAX_WIN" at global x:709, y:472 -> local x:709, y:472
psdService.ts:563 [LAYER] Depth:1 | Name: "2500" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: 2500
psdService.ts:563 [LAYER] Depth:0 | Name: "LIFE_COUNTER" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:845, y:494 -> local x:845, y:494
psdService.ts:563 [LAYER] Depth:1 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:934, y:494 -> local x:934, y:494
psdService.ts:563 [LAYER] Depth:1 | Name: "ON" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "ON" at global x:1022, y:494 -> local x:1022, y:494
psdService.ts:563 [LAYER] Depth:1 | Name: "LABEL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "LABEL" at global x:1112, y:501 -> local x:1112, y:501
psdService.ts:563 [LAYER] Depth:0 | Name: "TEXT" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "TEXT" at global x:347, y:689 -> local x:347, y:689
psdService.ts:534 [COMPOSITOR] Starting render for 7 root layers. Target: 1280x1024, Origin: 0,0
psdService.ts:563 [LAYER] Depth:0 | Name: "BG" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "BG" at global x:352, y:0 -> local x:352, y:0
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:878, y:351 -> local x:878, y:351
psdService.ts:563 [LAYER] Depth:0 | Name: "LEVEL_POINTER" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "LEVEL_POINTER" at global x:348, y:353 -> local x:348, y:353
psdService.ts:563 [LAYER] Depth:0 | Name: "PRIZE_FONT" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "FONT" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:503, y:790 -> local x:503, y:790
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:723, y:624 -> local x:723, y:624
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:611, y:521 -> local x:611, y:521
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:611, y:418 -> local x:611, y:418
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:381, y:342 -> local x:381, y:342
psdService.ts:563 [LAYER] Depth:2 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:563 [LAYER] Depth:0 | Name: "HIGH_PRIZES" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "5000" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: 5000
psdService.ts:563 [LAYER] Depth:1 | Name: "MAX_WIN" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "MAX_WIN" at global x:604, y:174 -> local x:604, y:174
psdService.ts:563 [LAYER] Depth:1 | Name: "2500" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: 2500
psdService.ts:563 [LAYER] Depth:0 | Name: "LIFE_COUNTER" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:538, y:7 -> local x:538, y:7
psdService.ts:563 [LAYER] Depth:1 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:509, y:7 -> local x:509, y:7
psdService.ts:563 [LAYER] Depth:1 | Name: "ON" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "ON" at global x:481, y:7 -> local x:481, y:7
psdService.ts:563 [LAYER] Depth:1 | Name: "LABEL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "LABEL" at global x:370, y:13 -> local x:370, y:13
psdService.ts:563 [LAYER] Depth:0 | Name: "TEXT" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "TEXT" at global x:508, y:689 -> local x:508, y:689
psdService.ts:534 [COMPOSITOR] Starting render for 7 root layers. Target: 1280x1024, Origin: 0,0
psdService.ts:563 [LAYER] Depth:0 | Name: "BG" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "BG" at global x:0, y:0 -> local x:0, y:0
psdService.ts:563 [LAYER] Depth:0 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:60, y:494 -> local x:60, y:494
psdService.ts:563 [LAYER] Depth:0 | Name: "LEVEL_POINTER" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "LEVEL_POINTER" at global x:174, y:494 -> local x:174, y:494
psdService.ts:563 [LAYER] Depth:0 | Name: "PRIZE_FONT" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "FONT" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:373, y:790 -> local x:373, y:790
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:861, y:624 -> local x:861, y:624
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:613, y:521 -> local x:613, y:521
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:409, y:492 -> local x:409, y:492
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !SIMUL
psdService.ts:563 [LAYER] Depth:2 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:529, y:492 -> local x:529, y:492
psdService.ts:563 [LAYER] Depth:2 | Name: "!FONT" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: !FONT
psdService.ts:563 [LAYER] Depth:0 | Name: "HIGH_PRIZES" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "5000" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: 5000
psdService.ts:563 [LAYER] Depth:1 | Name: "MAX_WIN" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "MAX_WIN" at global x:709, y:472 -> local x:709, y:472
psdService.ts:563 [LAYER] Depth:1 | Name: "2500" | Type: layer | Opacity: 1.00 | Visible: false
psdService.ts:567 [LAYER] Skipping invisible layer: 2500
psdService.ts:563 [LAYER] Depth:0 | Name: "LIFE_COUNTER" | Type: group | Opacity: 1.00 | Visible: true
psdService.ts:563 [LAYER] Depth:1 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:845, y:494 -> local x:845, y:494
psdService.ts:563 [LAYER] Depth:1 | Name: "!SIMUL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "!SIMUL" at global x:934, y:494 -> local x:934, y:494
psdService.ts:563 [LAYER] Depth:1 | Name: "ON" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "ON" at global x:1022, y:494 -> local x:1022, y:494
psdService.ts:563 [LAYER] Depth:1 | Name: "LABEL" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "LABEL" at global x:1112, y:501 -> local x:1112, y:501
psdService.ts:563 [LAYER] Depth:0 | Name: "TEXT" | Type: layer | Opacity: 1.00 | Visible: true
psdService.ts:597 [DRAW] "TEXT" at global x:347, y:689 -> local x:347, y:689