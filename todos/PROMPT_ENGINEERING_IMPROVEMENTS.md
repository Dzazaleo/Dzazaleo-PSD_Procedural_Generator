# Prompt Engineering Improvements for DesignAnalystNode

## Problem Summary

The AI model (qwen2.5vl:7b) produces:
- Generic/vague layout strategies not specific to actual content
- Poor layer understanding (doesn't identify what layers contain)
- Ignores visual anchors and style references
- Ignores knowledge rules from KnowledgeNode

## Root Cause Analysis

After exploring the current prompts in `DesignAnalystNode.tsx`:

1. **No explicit visual analysis step** - The prompt asks "what content?" but doesn't force the model to describe what it actually sees
2. **Visual anchors lack context** - Images labeled generically as `[VISUAL_ANCHOR_0]` with description AFTER the image (backwards)
3. **Knowledge rules are optional** - No enforcement mechanism, model can ignore without consequence
4. **Layer data is raw JSON** - No semantic interpretation guidance
5. **No few-shot examples** - Model has no reference for good output format
6. **Weak chain-of-thought** - Basic 4-step list at end, not enforced in output

## Implementation Plan

### Phase 1: Restructure System Prompt (generateSystemInstruction)

**File:** [components/DesignAnalystNode.tsx](components/DesignAnalystNode.tsx)
**Location:** Lines 706-853 (generateSystemInstruction function)

#### 1.1 Add Mandatory Visual Analysis Section

```typescript
// Add after TASK SUMMARY section
const visualAnalysisSection = `
═══════════════════════════════════════════════════════════════════════════════
STEP 1: VISUAL ANALYSIS (REQUIRED - Complete this BEFORE making decisions)
═══════════════════════════════════════════════════════════════════════════════
Examine the INPUT SOURCE CONTEXT image and describe:

1. CONTENT INVENTORY: List every distinct visual element you see
   - Text elements: headlines, subheadings, body copy, labels
   - Graphics: logos, icons, illustrations, photos
   - Decorative: borders, shadows, gradients, patterns
   - Background: solid colors, textures, images

2. SPATIAL RELATIONSHIPS: How are elements arranged?
   - What is the visual hierarchy? (most prominent to least)
   - What alignment patterns exist? (left, center, grid)
   - What spacing patterns are visible? (uniform, varied, grouped)

3. STYLE CHARACTERISTICS: What defines the visual style?
   - Color palette (list dominant colors)
   - Typography style (serif/sans-serif, weights, sizes)
   - Overall mood (corporate, playful, minimal, bold)

Your analysis MUST be specific to THIS image, not generic descriptions.
`;
```

#### 1.2 Strengthen Knowledge Rules Section

```typescript
// Replace current knowledge section with enforced version
const knowledgeSection = effectiveRules ? `
═══════════════════════════════════════════════════════════════════════════════
STEP 2: MANDATORY DESIGN RULES (MUST APPLY - Cite each rule used)
═══════════════════════════════════════════════════════════════════════════════
The following rules are NON-NEGOTIABLE. For EACH rule below, you MUST:
- Apply it to your layout decisions
- Cite it in the "rulesApplied" output field
- Explain HOW you applied it

<RULES>
${effectiveRules}
</RULES>

RULE APPLICATION REQUIREMENTS:
- If a rule specifies padding → calculate exact pixel values
- If a rule specifies layout → use that layout mode
- If a rule specifies hierarchy → respect layer ordering
- EVERY override must cite which rule(s) it satisfies

FAILURE TO APPLY RULES = INVALID OUTPUT
` : '';
```

#### 1.3 Add Visual Anchor Context Section

```typescript
// Add section explaining visual anchors BEFORE they appear
const anchorSection = effectiveKnowledge?.visualAnchors?.length ? `
═══════════════════════════════════════════════════════════════════════════════
STEP 3: VISUAL ANCHOR COMPLIANCE (Match style to these references)
═══════════════════════════════════════════════════════════════════════════════
You will receive ${effectiveKnowledge.visualAnchors.length} VISUAL ANCHOR image(s).
These are AUTHORITATIVE style references you MUST match.

For each anchor, analyze:
- Layout patterns used
- Spacing and alignment
- Visual style elements
- How similar content is handled

Your output MUST explain how your decisions align with these anchors.
Include specific anchor references (e.g., "Following VISUAL_ANCHOR_0's grid layout...")
` : '';
```

#### 1.4 Improve Layer Data Presentation

```typescript
// Add semantic hints to layer data
const layerDataSection = `
═══════════════════════════════════════════════════════════════════════════════
LAYER DATA (Analyze each layer's PURPOSE, not just position)
═══════════════════════════════════════════════════════════════════════════════
For each layer below, determine its SEMANTIC ROLE:
- "background": Full-bleed fills, textures, base images
- "primary": Main content (hero images, key text)
- "secondary": Supporting content (subheadings, descriptions)
- "decorative": Visual flourishes (borders, shadows, accents)
- "ui": Fixed interface elements (buttons, navigation)

LAYER INVENTORY (${layerAnalysisData.length} layers):
${JSON.stringify(layerAnalysisData.slice(0, MAX_LAYERS_IN_PROMPT), null, 2)}

Analyze layer names for clues:
- "bg", "background", "fill" → background role
- "title", "headline", "header" → primary text
- "logo", "brand" → static/pinned element
- "cta", "button" → ui element
`;
```

#### 1.5 Add Few-Shot Example

```typescript
// Add one complete example showing expected output quality
const exampleSection = `
═══════════════════════════════════════════════════════════════════════════════
EXAMPLE OUTPUT (Follow this format and depth of analysis)
═══════════════════════════════════════════════════════════════════════════════
<EXAMPLE>
INPUT: Product card container (400x600px → 300x400px)
Layers: ["bg_gradient", "product_image", "title_text", "price_tag", "cta_button"]
Rules: "SPACING: 20px minimum padding", "HIERARCHY: product_image dominates"

OUTPUT:
{
  "visualAnalysis": "The source shows a vertical product card with: gradient background (blue to purple), centered product photo taking 60% of height, bold sans-serif title below image, price in accent color, rounded CTA button at bottom. Clear vertical hierarchy with generous whitespace.",

  "rulesApplied": [
    {"rule": "SPACING: 20px minimum padding", "application": "Set suggestedScale to 0.85 to ensure 20px clearance on all sides (300-40)/400 = 0.65 width, (400-40)/600 = 0.6 height, using 0.6"},
    {"rule": "HIERARCHY: product_image dominates", "application": "Assigned product_image as 'primary' role with no scale reduction, other elements scale proportionally"}
  ],

  "reasoning": "Vertical-to-vertical transition maintains hierarchy. Calculated 0.6 scale from height constraint with 20px padding rule. Product image centered as primary, text elements follow below.",

  "method": "GEOMETRIC",
  "spatialLayout": "UNIFIED_FIT",
  "suggestedScale": 0.6,
  "overrides": [
    {"layerId": "bg_gradient", "layoutRole": "background", "citedRule": "N/A - inherent background"},
    {"layerId": "product_image", "layoutRole": "flow", "citedRule": "HIERARCHY: product_image dominates"},
    {"layerId": "cta_button", "layoutRole": "static", "yOffset": -20, "citedRule": "SPACING: 20px minimum padding"}
  ]
}
</EXAMPLE>

Your output must show similar specificity and rule citation.
`;
```

### Phase 2: Update Output Schema

**Location:** Lines 941-1004

Add new required fields:

```typescript
const responseSchema = {
  type: 'object',
  properties: {
    // NEW: Mandatory visual analysis
    visualAnalysis: {
      type: 'string',
      description: 'Detailed description of what you SEE in the source image'
    },

    // NEW: Rule application tracking
    rulesApplied: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rule: { type: 'string' },
          application: { type: 'string' }
        }
      },
      description: 'Each knowledge rule and how it was applied'
    },

    // NEW: Anchor compliance
    anchorCompliance: {
      type: 'string',
      description: 'How your decisions align with visual anchor references'
    },

    // Existing fields...
    reasoning: { type: 'string' },
    method: { enum: ['GEOMETRIC', 'GENERATIVE', 'HYBRID'] },
    // ... rest of schema
  },
  required: [
    'visualAnalysis',  // NEW
    'rulesApplied',    // NEW
    'reasoning',
    'method',
    // ... rest of required
  ]
};
```

### Phase 3: Fix Image/Text Ordering in Messages

**Location:** Lines 880-939 (message construction)

Change order so descriptions come BEFORE images:

```typescript
// BEFORE (current - wrong order):
// [image] → [description text]

// AFTER (correct order):
// [description text] → [image]

if (msg.role === 'user' && msg === history[history.length - 1]) {
    // Source container - description FIRST
    if (sourcePixelsBase64) {
        content.push({
            type: 'text',
            text: 'INPUT SOURCE CONTEXT - Analyze this image of the source container layers:'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${base64Clean}`,
                detail: 'high'
            }
        });
    }

    // Visual anchors - description FIRST for each
    if (effectiveKnowledge?.visualAnchors) {
        for (let idx = 0; idx < effectiveKnowledge.visualAnchors.length; idx++) {
            content.push({
                type: 'text',
                text: `VISUAL_ANCHOR_${idx} - Style reference image (match this layout/style):`
            });
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:${anchor.mimeType};base64,${anchor.data}`,
                    detail: 'high'
                }
            });
        }
    }
}
```

### Phase 4: Enhance Chain-of-Thought Prompting

Replace the weak 4-step list with enforced reasoning structure:

```typescript
const cotSection = `
═══════════════════════════════════════════════════════════════════════════════
REASONING PROCESS (You MUST follow these steps in order)
═══════════════════════════════════════════════════════════════════════════════

In your "reasoning" field, explicitly work through:

1. VISUAL INVENTORY
   "I see [list all elements]. The dominant element is [X].
    The layout uses [alignment pattern]. Colors are [list]."

2. RULE MAPPING
   "Rule '[exact rule text]' requires [interpretation].
    I will apply this by [specific action]."

3. SEMANTIC CLASSIFICATION
   "Layer '[name]' serves as [role] because [evidence from name/position].
    It should be treated as [flow/static/overlay/background]."

4. GEOMETRY CALCULATION
   "Source is [W]x[H] ([orientation]). Target is [W]x[H] ([orientation]).
    With [N]px padding requirement, available space is [calc].
    Scale factor = min([width calc], [height calc]) = [result]."

5. ANCHOR ALIGNMENT
   "VISUAL_ANCHOR_[N] shows [pattern]. My layout matches this by [how]."

DO NOT skip steps. Each must appear in your reasoning.
`;
```

## Files to Modify

1. **[components/DesignAnalystNode.tsx](components/DesignAnalystNode.tsx)**
   - `generateSystemInstruction()` function (lines 706-853)
   - Message construction logic (lines 880-939)
   - Response schema (lines 941-1004)
   - Response validation/defaults (lines 1006-1070)

## Verification Plan

1. **Before/After Comparison**
   - Run analysis on same container before and after changes
   - Compare `reasoning` field depth
   - Check for rule citations in overrides
   - Verify `visualAnalysis` contains image-specific details

2. **Rule Application Test**
   - Add knowledge rules with specific spacing requirements
   - Verify output `rulesApplied` array cites each rule
   - Check `suggestedScale` math against padding rules

3. **Visual Anchor Test**
   - Add 2-3 visual anchor images
   - Verify `anchorCompliance` field references specific anchors
   - Check layout decisions match anchor patterns

4. **Console Logging**
   - Add debug log showing full system prompt before send
   - Log token count to ensure within limits
   - Log response to verify new fields populated
