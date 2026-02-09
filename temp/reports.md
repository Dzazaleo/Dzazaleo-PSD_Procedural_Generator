# Container Analysis Reports

## Container: REEL (1074x773 → 1280x799)

**Transform:** Landscape → Landscape, modest upscale (1.19x width, 1.03x height)
**Layers:** 3 root layers — BG (background), FRAME (golden border), DIV (group: 4 dividers + 1 symbol composite)

### Root Cause 1: AI gave trivially short Stage 2 output

Stage 2 (layout generation) returned only **575 characters** — absurdly short for a response that must contain per-layer overrides, method, spatialLayout, and scale. For comparison, Stage 1 returned 4058 chars and Stage 3 returned 2088 chars.

Result: **all three root items got `xOffset=0, yOffset=0`** — the AI said "put everything at the origin."

### Root Cause 2: Zero-position propagation to children

When the DIV group got position (0,0), group-override propagation calculated children's positions as source-space deltas from (0,0). Children got *relative* offsets but the *base* was wrong.

| Layer | Unprocessed Position | Processed Position | Shift |
|-------|--------------------|--------------------|-------|
| BG | (101, 32) | (0, 0) | -101px, -32px |
| FRAME | (84, 0) | (0, 0) | -84px |
| !SIMUL_SYMBOL | (98, 41) | (13, 0) | -85px, -41px |

Everything shifted **up and left**, losing the centering offsets.

### Root Cause 3: Coordinate sanity check didn't trigger

The sanity check ("if all non-background xOffset/yOffset < 2% of target dimensions → invalid") didn't fire because propagated child dividers had xOffsets of 868, 650, 434, 217 — these exceed 2% of 1280, so the check passed even though the **root** positions were all zero.

### Root Cause 4: Stage 3 verification was incomplete

Verification correctly detected cropping issues (`passed: false`) but only corrected **3 of 8 layers**. The corrections weren't enough to restore proper centering — final render still has everything anchored to (0,0).

### Visual Impact

- **Unprocessed**: Content properly centered within the frame. BG offset (101,32), FRAME offset (84,0) — symmetric margins.
- **Processed**: Everything flush to the **top-left corner**. Frame, background, and symbols shifted left ~84-101px and up ~32-41px. More empty space visible on the right side of the container border.
- Processed BG stretched with `scaleXY=(1.19, 1.03)` from (0,0), reaching ~1247px wide — 33px gap before the 1280px target edge.

### Suggested Fix Direction

- Coordinate sanity check should inspect **root-level overrides specifically**, not just all overrides (including propagated children).
- Stage 2 should validate that FRAME/content layers aren't all at (0,0) when they had non-zero source positions.
- Consider a fallback that uses proportionally-mapped source positions when AI output is suspiciously short (<1000 chars).

---

## Container: BONUS1 (1080x1920 → 1280x1024)

**Transform:** Portrait → Landscape (major geometry shift), proportional scale 0.533
**Layers:** 5 root layers — BG, OPTIONS (group: 3 potions), PRIZE_FONT (group: 3 "1300" labels), TEXT ("SCEGLI UNA POZIONE"), WIN_COUNTER ("WIN 1700")
**Severity:** Much worse than REEL — layout is fundamentally broken

### Root Cause 1: Title moved from top to bottom

Stage 1 explicitly identified: *"title text 'SCEGLI UNA POZIONE' must remain at the top center."*
The AI assigned TEXT as `static` role at pos=(640, 922) with scale=1.0. Source position was (287, 253) — top center. It ended up at the very bottom of the canvas, violating the AI's own Stage 1 analysis.

### Root Cause 2: TEXT and WIN_COUNTER at identical position — overlap

Both TEXT and WIN_COUNTER received `static, pos=(640, 922), scale=1.0`. They render on top of each other at the bottom of the canvas. In the final output, "SCEGLI UNA POZIONE" and "1700" are visually smashed together and partially cropped.

### Root Cause 3: Cross-group semantic pairing failure (labels detached from potions)

The PSD separates potions (OPTIONS group) from prize labels (PRIZE_FONT group) by element type, not by semantic unit. The AI positioned them as independent groups:
- OPTIONS at (216, 115), scale 0.53
- PRIZE_FONT at (216, 486), scale 0.53

Group propagation preserved internal deltas within each group, but the groups themselves are misaligned. Labels ended up ~250-370px below their respective potions.

| Potion Position | Label Position | Vertical Gap |
|----------------|---------------|-------------|
| (495, 189) | (743, 555) | 366px |
| (216, 115) | (465, 486) | 371px |
| (346, 468) | (593, 838) | 370px |

Stage 1 correctly identified: *"value labels '1300' must remain attached to their respective bottles"* — but the system has no mechanism to enforce cross-group pairing during group-level positioning.

### Root Cause 4: WIN_COUNTER child propagated to negative Y

WIN_COUNTER at (640, 922) with scale 1.0 → child FONT group propagated to pos=(488, **-814**). 2 overrides required clamping to target bounds (line 294). Clamping to y=0 prevents off-screen rendering but doesn't fix the broken layout.

### Root Cause 5: Scale mismatch — static (1.0) vs flow (0.533)

The AI incorrectly assigned `static` role (scale~1.0) to TEXT and WIN_COUNTER. In a portrait→landscape transform (proportional scale 0.533), these should be `flow` scaled down. TEXT at 1.0x is 508px wide — at x:640 it extends to x:1148, far from centered.

### Root Cause 6: Stage 2 output again suspiciously short (867 chars)

Only 867 characters for 5 root items with a complex portrait→landscape recomposition. The 8B model can't produce meaningful layout coordinates in this budget.

### Root Cause 7: Stage 3 corrections incomplete

5 corrections over 17 existing overrides. The fundamental role/position errors on TEXT and WIN_COUNTER persisted into the final render.

### Visual Impact

- **Unprocessed (Image 1)**: Portrait content centered in landscape target with BG at x:352. Title at top, three potions in triangle with labels attached, "WIN 1700" at bottom center. Clean, readable layout.
- **Processed (Image 2)**: BG stretched to fill (correct). Potions visible but shifted, labels detached and floating. Title and WIN text overlap at bottom-right, partially cropped. Layout completely broken — not recomposed for landscape at all.

### Suggested Fix Direction

- **Cross-group semantic pairing**: When Stage 1 identifies label→potion pairings but they're in different PSD groups, the system needs post-processing to link PRIZE_FONT children to their corresponding OPTIONS children (by spatial proximity in source).
- **Role classification validation**: TEXT with name containing "text/title" at source y < 30% of canvas height should never get `static` role with y > 80% of target.
- **Identical-position detection**: Two non-background root layers at the exact same (x,y) is always wrong — trigger fallback.
- **Short response fallback (recurring pattern)**: <1000 chars from Stage 2 should trigger proportional-mapping fallback rather than trusting the AI output.

---

## Container: BONUS2 (1080x1920 → 1280x1024)

**Transform:** Portrait → Landscape (major geometry shift), proportional scale 0.533
**Layers:** 7 root layers — BG, !SIMUL (right pointer), LEVEL_POINTER (left pointer), PRIZE_FONT (group: 6vis/21hid "100" labels), HIGH_PRIZES (MAX_WIN), LIFE_COUNTER ("TENTATIVI" + trees), TEXT ("SCEGLI LA FINESTRA")
**Severity:** Critical — content disappeared due to clamping bug + truncated Stage 3

### Root Cause 1: "SCEGLI LA FINESTRA" invisible — clamping bug (CODE-LEVEL)

Stage 2 gave TEXT a reasonable position: `flow, pos=(495, 670), scale=0.53`. But Stage 3 issued a corrected override pushing TEXT off-screen (y > 1024). The clamping system set `y = 1024` — the exact bottom edge.

TEXT is 495x70 at 0.53x scale = ~263x37px. At y=1024, it starts at the last row and renders **entirely below the visible area** (canvas rows 0-1023).

**This is a code bug:** `y = min(y, targetHeight)` doesn't account for layer dimensions. Fix:
```
y = min(y, targetHeight - layerHeight * scale)  // = 1024 - 37 = 987
x = min(x, targetWidth - layerWidth * scale)
```

### Root Cause 2: Same clamping bug killed bottom-row "100" labels

Two visible PRIZE_FONT "100" labels also clamped to y=1024:
- `!SIMUL` at (284, **1024**) — invisible
- `!SIMUL` at (696, **1024**) — invisible

Only ~4 of 6 visible "100" labels appear in the final output.

### Root Cause 3: Stage 3 JSON parse error — truncated response

`SyntaxError: Unexpected non-whitespace character after JSON at position 5142`

The 8B model produced 5143 chars of malformed JSON. Repair extracted a partial result with **confidence 0.3** (extremely low). Despite being unreliable, all 28 corrected overrides were merged, causing **14 layers to need clamping**.

### Root Cause 4: Stage 3 corrections made things WORSE

Before Stage 3 corrections: TEXT at (495, 670) — visible.
After Stage 3 corrections: TEXT at y > 1024 → clamped to 1024 — invisible.

The verification "fix" broke what Stage 2 got right. Low-confidence corrections (0.3) should not be blindly merged.

### Root Cause 5: PRIZE_FONT children using near-source Y positions

Visible "100" labels ended up at y=976, 783, 641 in the 1024px target. These are near-source positions from a 1920px canvas, not properly scaled for the 47% height reduction.

### Root Cause 6: Stage 2 output 1289 chars — recurring short-response pattern

### Visual Impact

- **Unprocessed (Image 1)**: Portrait centered in landscape. All elements visible: mansion, "MAX WIN", all "100" labels, "SCEGLI LA FINESTRA", "TENTATIVI" + trees.
- **Processed (Image 2)**: Mansion fills more width (good). "MAX WIN" and "TENTATIVI" visible. **"SCEGLI LA FINESTRA" completely gone.** Bottom-row "100" labels gone. Content extends to very bottom edge with no margin.

### Suggested Fix Direction (NEW findings)

- **Clamping must account for layer dimensions** — clamp to `targetDim - layerDim * scale`, not just `targetDim`. This is a code bug independent of AI quality.
- **Low-confidence Stage 3 corrections should be rejected** — confidence < 0.5 should skip merging corrections entirely, or at minimum apply the old proportional-mapping fallback instead.
- **Stage 3 JSON truncation at 5143 chars** — consider increasing maxTokens for Stage 3 when the layout has many layers (41 overrides to verify is a lot for 8192 tokens).

---

## Container: LINE (1080x608 → 1280x698)

**Transform:** Landscape → Landscape (modest upscale), proportional scale 1.148
**Layers:** 11 root items — 10 individual colored line layers (~1054px wide) + NUMBER group (20 left/right number labels)
**Severity:** AI made a perfect layout worse — unprocessed UNIFIED_FIT was already optimal

### Root Cause 1: Lines shifted right, right edge cropped

All 10 lines got `xOffset=128` instead of ~15 (proportional mapping of source x=13). Lines are 1054px × 1.15 = 1212px wide. Starting at x=128 → extends to **x=1340, which is 60px past the 1280px right edge**. Content cropped.

| | Unprocessed | Processed | Issue |
|---|-----------|---------|-------|
| Lines x | 35 | 128 | +93px shift → right cropped by 60px |
| Right numbers x | 1232 | 1276 | Extends to 1304, 24px off-canvas |
| Left numbers x | 20 | 64 | 64px gap from line start at 128 |

### Root Cause 2: Left numbers misaligned from line endpoints

Source: left numbers at x=0, line starts at x=13 (13px gap). Processed: left numbers at x=64, lines at x=128 (64px gap). The tight label-to-line alignment is destroyed.

### Root Cause 3: Right-side numbers partially off-screen

Right numbers at x=1276 + 24×1.15 = 1304px, extending **24px beyond** the 1280px canvas. Labels clipped in Image 2.

### Root Cause 4: Vertical spacing distorted

Lines redistributed vertically with deltas up to +65px from their proportional positions. The balanced visual pattern of the source is disrupted.

### Root Cause 5: Stage 3 truncated — only 1 of 31 corrections recovered

`finishReason: null` (model cut off). JSON parse error at position 2166. Truncation repair recovered the JSON but `correctedOverrides` contained only **1 entry** out of 31 needed. The 5 detected issues went unfixed.

### Key Insight: This Container Should Have Bypassed AI Entirely

The prompt itself says *"Geometry stable: similar aspect ratios."* The proportional scale is only 1.148x — a simple upscale. **UNIFIED_FIT already produced the optimal layout** (Image 1). There was nothing for the AI to recompose. The AI processing added 0 value and introduced cropping, misalignment, and distortion.

### Visual Impact

- **Unprocessed (Image 1)**: Lines perfectly fill the container with ~19px centered margins. All numbers visible and aligned with their line endpoints. Clean, symmetric grid pattern.
- **Processed (Image 2)**: Lines shifted right, right-side endpoints and numbers cropped. Left numbers float 64px away from line starts. Vertical spacing irregular. **Strictly worse than doing nothing.**

### Suggested Fix Direction (NEW pattern)

- **Skip AI for geometry-stable transforms**: When source and target have similar aspect ratios (within `ASPECT_RATIO_TOLERANCE=0.15`) AND proportional scale is close to 1.0 (e.g., 0.85–1.25), bypass the 3-stage AI pipeline entirely and use UNIFIED_FIT. The AI only adds value when recomposition is needed (e.g., portrait→landscape).
- **Overflow detection post-Stage 2**: After generating overrides, check `xOffset + layerWidth * scale > targetWidth` for all layers. If any content extends beyond the canvas, trigger proportional-mapping fallback.
- **This is the strongest argument for a "fast path"**: simple upscale/downscale with preserved aspect ratio should never go through the AI.

---
