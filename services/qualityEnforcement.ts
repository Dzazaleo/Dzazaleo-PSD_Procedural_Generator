
import {
    TransformedPayload,
    TransformedLayer,
    SourceAnalysis,
    QualityViolation,
    QualityReport,
    LayerOverride
} from '../types';

// --- Constants ---
const POSITION_DRIFT_THRESHOLD = 0.25;      // 25% relative drift triggers correction
const MUST_PRESERVE_OVERLAP_MIN = 0.50;      // 50% overlap with target required
const GROUP_COHESION_FACTOR = 2.0;           // Companion within 2x anchor size
const BACKGROUND_COVERAGE_MIN = 0.70;        // 70% target coverage required
const OFFSCREEN_OVERLAP_MIN = 0.10;          // 10% minimum overlap with target

// --- Helpers ---

/** Flatten layer tree into a flat array */
function flattenLayers(layers: TransformedLayer[]): TransformedLayer[] {
    const result: TransformedLayer[] = [];
    const traverse = (ls: TransformedLayer[]) => {
        for (const l of ls) {
            result.push(l);
            if (l.children) traverse(l.children);
        }
    };
    traverse(layers);
    return result;
}

/** Calculate overlap area between two rects as a fraction of the first rect's area */
function overlapFraction(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
): number {
    const area = aw * ah;
    if (area <= 0) return 0;
    const ox = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
    const oy = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
    return (ox * oy) / area;
}

/** Fuzzy match: check if layer name contains any of the search terms (case-insensitive) */
function fuzzyMatchName(layerName: string, searchTerms: string[]): boolean {
    const lower = layerName.toLowerCase();
    return searchTerms.some(term => {
        const termLower = term.toLowerCase().replace(/[_\-\s]+/g, '');
        const nameLower = lower.replace(/[_\-\s]+/g, '');
        return nameLower.includes(termLower) || termLower.includes(nameLower);
    });
}

// --- Quality Checks ---

/**
 * Check 1: Position Drift
 * For flow/static layers with sourceCoords, compare relative position in source vs target container.
 * If X or Y drift > threshold, generate corrective override with proportional position.
 */
function checkPositionDrift(
    flatLayers: TransformedLayer[],
    targetBounds: { x: number; y: number; w: number; h: number },
    sourceContainerBounds?: { x: number; y: number; w: number; h: number }
): QualityViolation[] {
    if (!sourceContainerBounds || sourceContainerBounds.w <= 0 || sourceContainerBounds.h <= 0) return [];
    if (targetBounds.w <= 0 || targetBounds.h <= 0) return [];

    const violations: QualityViolation[] = [];

    for (const layer of flatLayers) {
        if (!layer.sourceCoords) continue;
        if (layer.layoutRole === 'background' || layer.layoutRole === 'overlay') continue;
        if (!layer.isVisible) continue;

        // Relative position in source container (0-1)
        const srcRelX = (layer.sourceCoords.x - sourceContainerBounds.x) / sourceContainerBounds.w;
        const srcRelY = (layer.sourceCoords.y - sourceContainerBounds.y) / sourceContainerBounds.h;

        // Relative position in target container (0-1)
        const tgtRelX = (layer.coords.x - targetBounds.x) / targetBounds.w;
        const tgtRelY = (layer.coords.y - targetBounds.y) / targetBounds.h;

        const driftX = Math.abs(tgtRelX - srcRelX);
        const driftY = Math.abs(tgtRelY - srcRelY);

        if (driftX > POSITION_DRIFT_THRESHOLD || driftY > POSITION_DRIFT_THRESHOLD) {
            // Corrective: proportional position mapping
            const correctedX = targetBounds.x + srcRelX * targetBounds.w;
            const correctedY = targetBounds.y + srcRelY * targetBounds.h;

            violations.push({
                layerId: layer.id,
                layerName: layer.name,
                checkType: 'POSITION_DRIFT',
                severity: driftX > 0.5 || driftY > 0.5 ? 'error' : 'warning',
                message: `Position drift: X=${(driftX * 100).toFixed(1)}%, Y=${(driftY * 100).toFixed(1)}% from source proportional position`,
                correctedOverride: {
                    layerId: layer.id,
                    xOffset: Math.round(correctedX - targetBounds.x),
                    yOffset: Math.round(correctedY - targetBounds.y),
                    individualScale: layer.transform.scaleX,
                    layoutRole: layer.layoutRole,
                }
            });
        }
    }

    return violations;
}

/**
 * Check 2: Must-Preserve Visibility
 * For each entry in sourceAnalysis.mustPreserve, fuzzy-match against layer names.
 * If matching layer has < 50% overlap with target bounds, flag as error.
 */
function checkMustPreserve(
    flatLayers: TransformedLayer[],
    targetBounds: { x: number; y: number; w: number; h: number },
    sourceAnalysis: SourceAnalysis
): QualityViolation[] {
    if (!sourceAnalysis.mustPreserve?.length) return [];

    const violations: QualityViolation[] = [];

    for (const preserveItem of sourceAnalysis.mustPreserve) {
        // Find layers matching this preserve directive
        const terms = preserveItem.split(/[\s,]+/).filter(t => t.length > 2);
        const matchingLayers = flatLayers.filter(l => fuzzyMatchName(l.name, terms) || fuzzyMatchName(l.name, [preserveItem]));

        for (const layer of matchingLayers) {
            if (!layer.isVisible) continue;
            const overlap = overlapFraction(
                layer.coords.x, layer.coords.y, layer.coords.w, layer.coords.h,
                targetBounds.x, targetBounds.y, targetBounds.w, targetBounds.h
            );

            if (overlap < MUST_PRESERVE_OVERLAP_MIN) {
                violations.push({
                    layerId: layer.id,
                    layerName: layer.name,
                    checkType: 'MUST_PRESERVE_OFFSCREEN',
                    severity: 'error',
                    message: `Must-preserve element "${preserveItem}" only ${(overlap * 100).toFixed(0)}% visible (need ${(MUST_PRESERVE_OVERLAP_MIN * 100).toFixed(0)}%)`,
                });
            }
        }
    }

    return violations;
}

/**
 * Check 3: Semantic Group Cohesion
 * For each semantic group, check companion-to-anchor distance.
 * If > 2x anchor size, generate corrective override snapping companion relative to anchor.
 */
function checkGroupCohesion(
    flatLayers: TransformedLayer[],
    targetBounds: { x: number; y: number; w: number; h: number },
    sourceAnalysis: SourceAnalysis
): QualityViolation[] {
    if (!sourceAnalysis.semanticGroups?.length) return [];

    const violations: QualityViolation[] = [];
    const layerMap = new Map(flatLayers.map(l => [l.id, l]));
    // Also build a name-based lookup for fuzzy matching
    const layersByName = new Map<string, TransformedLayer>();
    for (const l of flatLayers) {
        layersByName.set(l.name.toLowerCase(), l);
    }

    for (const group of sourceAnalysis.semanticGroups) {
        // Find anchor layer (try ID first, then fuzzy name match)
        let anchor = layerMap.get(group.anchor);
        if (!anchor) {
            anchor = flatLayers.find(l => fuzzyMatchName(l.name, [group.anchor]));
        }
        if (!anchor) continue;

        const anchorSize = Math.max(anchor.coords.w, anchor.coords.h);
        if (anchorSize <= 0) continue;

        for (const companionRef of group.companions) {
            let companion = layerMap.get(companionRef);
            if (!companion) {
                companion = flatLayers.find(l => fuzzyMatchName(l.name, [companionRef]));
            }
            if (!companion) continue;

            // Distance between centers
            const anchorCX = anchor.coords.x + anchor.coords.w / 2;
            const anchorCY = anchor.coords.y + anchor.coords.h / 2;
            const compCX = companion.coords.x + companion.coords.w / 2;
            const compCY = companion.coords.y + companion.coords.h / 2;
            const dist = Math.sqrt((anchorCX - compCX) ** 2 + (anchorCY - compCY) ** 2);

            if (dist > anchorSize * GROUP_COHESION_FACTOR) {
                // Corrective: snap companion relative to anchor using source-space delta
                let correctedOverride: LayerOverride | undefined;
                if (anchor.sourceCoords && companion.sourceCoords) {
                    const srcDeltaX = companion.sourceCoords.x - anchor.sourceCoords.x;
                    const srcDeltaY = companion.sourceCoords.y - anchor.sourceCoords.y;
                    const scale = anchor.transform.scaleX || 1;
                    const correctedX = anchor.coords.x + srcDeltaX * scale;
                    const correctedY = anchor.coords.y + srcDeltaY * scale;

                    correctedOverride = {
                        layerId: companion.id,
                        xOffset: Math.round(correctedX - targetBounds.x),
                        yOffset: Math.round(correctedY - targetBounds.y),
                        individualScale: companion.transform.scaleX,
                        layoutRole: 'overlay',
                        linkedAnchorId: anchor.id,
                    };
                }

                violations.push({
                    layerId: companion.id,
                    layerName: companion.name,
                    checkType: 'GROUP_COHESION',
                    severity: 'error',
                    message: `Companion "${companion.name}" is ${Math.round(dist)}px from anchor "${anchor.name}" (max ${Math.round(anchorSize * GROUP_COHESION_FACTOR)}px)`,
                    correctedOverride,
                });
            }
        }
    }

    return violations;
}

/**
 * Check 4: Background Coverage
 * For background role layers, check what % of target they cover.
 * If < 70%, generate stretch override.
 */
function checkBackgroundCoverage(
    flatLayers: TransformedLayer[],
    targetBounds: { x: number; y: number; w: number; h: number }
): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const bgLayers = flatLayers.filter(l => l.layoutRole === 'background' && l.isVisible);

    for (const layer of bgLayers) {
        // Coverage = fraction of target area covered by this layer
        const targetArea = targetBounds.w * targetBounds.h;
        if (targetArea <= 0) continue;

        const ox = Math.max(0, Math.min(layer.coords.x + layer.coords.w, targetBounds.x + targetBounds.w) - Math.max(layer.coords.x, targetBounds.x));
        const oy = Math.max(0, Math.min(layer.coords.y + layer.coords.h, targetBounds.y + targetBounds.h) - Math.max(layer.coords.y, targetBounds.y));
        const coverage = (ox * oy) / targetArea;

        if (coverage < BACKGROUND_COVERAGE_MIN) {
            violations.push({
                layerId: layer.id,
                layerName: layer.name,
                checkType: 'BACKGROUND_COVERAGE',
                severity: coverage < 0.30 ? 'error' : 'warning',
                message: `Background covers only ${(coverage * 100).toFixed(0)}% of target (need ${(BACKGROUND_COVERAGE_MIN * 100).toFixed(0)}%)`,
                correctedOverride: {
                    layerId: layer.id,
                    xOffset: 0,
                    yOffset: 0,
                    individualScale: 1,
                    scaleX: targetBounds.w / Math.max(layer.sourceCoords?.w || layer.coords.w, 1),
                    scaleY: targetBounds.h / Math.max(layer.sourceCoords?.h || layer.coords.h, 1),
                    layoutRole: 'background',
                }
            });
        }
    }

    return violations;
}

/**
 * Check 5: Off-Screen Detection
 * For all visible non-background layers, check overlap with target bounds.
 * If < 10% visible, flag as error.
 */
function checkOffScreen(
    flatLayers: TransformedLayer[],
    targetBounds: { x: number; y: number; w: number; h: number },
    sourceContainerBounds?: { x: number; y: number; w: number; h: number }
): QualityViolation[] {
    const violations: QualityViolation[] = [];

    for (const layer of flatLayers) {
        if (!layer.isVisible) continue;
        if (layer.layoutRole === 'background') continue;
        if (layer.coords.w <= 0 || layer.coords.h <= 0) continue;

        const overlap = overlapFraction(
            layer.coords.x, layer.coords.y, layer.coords.w, layer.coords.h,
            targetBounds.x, targetBounds.y, targetBounds.w, targetBounds.h
        );

        if (overlap < OFFSCREEN_OVERLAP_MIN) {
            // Corrective: proportional position from source if available
            let correctedOverride: LayerOverride | undefined;
            if (layer.sourceCoords && sourceContainerBounds && sourceContainerBounds.w > 0 && sourceContainerBounds.h > 0) {
                const srcRelX = (layer.sourceCoords.x - sourceContainerBounds.x) / sourceContainerBounds.w;
                const srcRelY = (layer.sourceCoords.y - sourceContainerBounds.y) / sourceContainerBounds.h;
                const correctedX = targetBounds.x + srcRelX * targetBounds.w;
                const correctedY = targetBounds.y + srcRelY * targetBounds.h;

                correctedOverride = {
                    layerId: layer.id,
                    xOffset: Math.round(correctedX - targetBounds.x),
                    yOffset: Math.round(correctedY - targetBounds.y),
                    individualScale: layer.transform.scaleX,
                    layoutRole: layer.layoutRole,
                };
            }

            violations.push({
                layerId: layer.id,
                layerName: layer.name,
                checkType: 'OFFSCREEN',
                severity: 'error',
                message: `Layer only ${(overlap * 100).toFixed(0)}% visible in target (need ${(OFFSCREEN_OVERLAP_MIN * 100).toFixed(0)}%)`,
                correctedOverride,
            });
        }
    }

    return violations;
}

// --- Main Exports ---

/**
 * Run all 5 quality checks on a transformed payload.
 * Checks 2-3 (mustPreserve, groupCohesion) are skipped if no sourceAnalysis is available.
 */
export function runQualityEnforcement(
    payload: TransformedPayload,
    sourceAnalysis?: SourceAnalysis
): QualityReport {
    const targetBounds = payload.targetBounds || {
        x: 0, y: 0,
        w: payload.metrics.target.w,
        h: payload.metrics.target.h
    };
    const sourceContainerBounds = payload.sourceContainerBounds;

    const flatLayers = flattenLayers(payload.layers);
    const allViolations: QualityViolation[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Check 1: Position Drift
    totalChecks++;
    const driftViolations = checkPositionDrift(flatLayers, targetBounds, sourceContainerBounds);
    if (driftViolations.length === 0) passedChecks++;
    allViolations.push(...driftViolations);

    // Check 2: Must-Preserve Visibility (requires sourceAnalysis)
    if (sourceAnalysis) {
        totalChecks++;
        const preserveViolations = checkMustPreserve(flatLayers, targetBounds, sourceAnalysis);
        if (preserveViolations.length === 0) passedChecks++;
        allViolations.push(...preserveViolations);
    }

    // Check 3: Group Cohesion (requires sourceAnalysis)
    if (sourceAnalysis) {
        totalChecks++;
        const cohesionViolations = checkGroupCohesion(flatLayers, targetBounds, sourceAnalysis);
        if (cohesionViolations.length === 0) passedChecks++;
        allViolations.push(...cohesionViolations);
    }

    // Check 4: Background Coverage
    totalChecks++;
    const bgViolations = checkBackgroundCoverage(flatLayers, targetBounds);
    if (bgViolations.length === 0) passedChecks++;
    allViolations.push(...bgViolations);

    // Check 5: Off-Screen
    totalChecks++;
    const offscreenViolations = checkOffScreen(flatLayers, targetBounds, sourceContainerBounds);
    if (offscreenViolations.length === 0) passedChecks++;
    allViolations.push(...offscreenViolations);

    // Score: 100 - (errors * 15) - (warnings * 5)
    const errorCount = allViolations.filter(v => v.severity === 'error').length;
    const warningCount = allViolations.filter(v => v.severity === 'warning').length;
    const score = Math.max(0, Math.min(100, 100 - (errorCount * 15) - (warningCount * 5)));

    return {
        score,
        violations: allViolations,
        passedChecks,
        totalChecks,
        timestamp: Date.now(),
        wasAutoCorrected: false,
    };
}

/**
 * Extract corrective overrides from error-severity violations (deduped by layerId).
 * Only errors produce corrections — warnings are informational.
 */
export function extractCorrectiveOverrides(report: QualityReport): LayerOverride[] {
    const seen = new Set<string>();
    const overrides: LayerOverride[] = [];

    for (const violation of report.violations) {
        if (violation.severity !== 'error') continue;
        if (!violation.correctedOverride) continue;
        if (seen.has(violation.layerId)) continue;

        seen.add(violation.layerId);
        overrides.push(violation.correctedOverride);
    }

    return overrides;
}
