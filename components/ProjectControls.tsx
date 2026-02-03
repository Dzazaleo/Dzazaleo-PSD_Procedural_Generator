import React, { useRef, useState, useEffect } from 'react';
import { useReactFlow, Edge, Node } from 'reactflow';
import { ProjectExport, PSDNodeData, KnowledgeContext } from '../types';
import { useProceduralStore } from '../store/ProceduralContext';
import { Wand2, Download, Upload, Save, RotateCcw, AlertCircle } from 'lucide-react';

export const ProjectControls = () => {
    const { toObject, setNodes, setEdges, setViewport, getNodes, getEdges } = useReactFlow();
    const { templateRegistry, knowledgeRegistry, resetProject } = useProceduralStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Local State for 2-Step Reset Logic
    const [isResetConfirming, setIsResetConfirming] = useState(false);
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
        };
    }, []);

    // Safety Debug Check
    if (!resetProject) {
        console.error("[ProjectControls] Critical Error: resetProject is missing from ProceduralContext!");
    }

    // HELPER: Strict Knowledge Validation
    const hasDefinedRules = (rules: string | undefined, containerName: string): boolean => {
        if (!rules) return false;
        const safeName = containerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const strictPattern = new RegExp(`^//\\s*${safeName}\\s+CONTAINER`, 'im');
        return strictPattern.test(rules);
    };

    const handleAutoWire = () => {
        const nodes = getNodes();
        const edges = getEdges();

        // 1. Node Identification
        const sourceSplitter = nodes.find(n => n.type === 'templateSplitter');
        const targetSplitter = nodes.find(n => n.type === 'targetSplitter');
        const resolver = nodes.find(n => n.type === 'containerResolver');

        // Infrastructure Nodes (Phase 1 Simulation)
        const loadPsd = nodes.find(n => n.type === 'loadPsd');
        const targetTemplate = nodes.find(n => n.type === 'targetTemplate');
        const knowledge = nodes.find(n => n.type === 'knowledge');
        const designInfo = nodes.find(n => n.type === 'designInfo');
        const knowledgeInspector = nodes.find(n => n.type === 'knowledgeInspector');
        const exportNodeExisting = nodes.find(n => n.type === 'exportPsd');

        if (!sourceSplitter || !targetSplitter || !resolver) {
            console.error("[Heuristic Engine] Auto-Wire Failed: Missing core nodes.");
            alert("Auto-Wire Failed: Requires active 'Template Splitter', 'Target Splitter', and 'Container Resolver' nodes.");
            return;
        }

        // --- PHASE 1: INFRASTRUCTURE SIMULATION ---
        const missingInfraEdges: Edge[] = [];
        const timestamp = Date.now();

        const simulateEdge = (source: Node, target: Node, sourceHandle: string | null, targetHandle: string | null) => {
             const exists = edges.some(e => 
                 e.source === source.id && 
                 e.target === target.id && 
                 (sourceHandle ? e.sourceHandle === sourceHandle : true) &&
                 (targetHandle ? e.targetHandle === targetHandle : true)
             );
             
             if (!exists) {
                 missingInfraEdges.push({
                     id: `sim-infra-${source.id}-${target.id}-${timestamp}`,
                     source: source.id,
                     target: target.id,
                     sourceHandle: sourceHandle,
                     targetHandle: targetHandle,
                     type: 'default',
                     style: {}
                 });
             }
        };

        // Simulate LoadPSD connections
        if (loadPsd) {
            if (designInfo) simulateEdge(loadPsd, designInfo, 'psd-output', null);
            if (sourceSplitter) simulateEdge(loadPsd, sourceSplitter, 'psd-output', 'input');
        }
        
        // Simulate TargetTemplate connections
        if (targetTemplate) {
            if (targetSplitter) simulateEdge(targetTemplate, targetSplitter, 'target-metadata-out', 'template-input');
            if (exportNodeExisting) simulateEdge(targetTemplate, exportNodeExisting, 'target-metadata-out', 'template-input');
        }

        // Simulate Knowledge connections
        if (knowledge && knowledgeInspector) {
            simulateEdge(knowledge, knowledgeInspector, 'knowledge-out', 'knowledge-in');
        }

        // Create Effective Edge Map for Validation
        const effectiveEdges = [...edges, ...missingInfraEdges];

        // Trace upstream connections using effective edges
        const sourceEdge = effectiveEdges.find(e => e.target === sourceSplitter.id);
        const targetEdge = effectiveEdges.find(e => e.target === targetSplitter.id && e.targetHandle === 'template-input');

        if (!sourceEdge || !targetEdge) {
            console.warn("[Heuristic Engine] Auto-Wire Failed: Splitters disconnected.");
            alert("Auto-Wire Failed: Splitters must be connected to their respective Template nodes.");
            return;
        }

        const sourceNodeId = sourceEdge.source;
        const targetNodeId = targetEdge.source;

        // 2. Metadata Extraction
        const sourceTemplate = templateRegistry[sourceNodeId];
        const targetTemplateMetadata = templateRegistry[targetNodeId];

        if (!sourceTemplate || !targetTemplateMetadata) {
            console.error("[Heuristic Engine] Auto-Wire Failed: Metadata missing.");
            alert("Auto-Wire Failed: Template metadata not found.");
            return;
        }

        // 3. Semantic Matching
        const matches: { source: string, target: string, index: number }[] = [];
        
        sourceTemplate.containers.forEach(s => {
            const targetMatch = targetTemplateMetadata.containers.find(t => t.name.toLowerCase() === s.name.toLowerCase());
            if (targetMatch) {
                matches.push({ 
                    source: s.name, 
                    target: targetMatch.name, 
                    index: matches.length 
                });
            }
        });

        if (matches.length === 0) {
            console.warn("[Heuristic Engine] No matches found.");
            alert("Auto-Wire: No containers with matching names found.");
            return;
        }

        // --- ACTIVE INSTANCE MASKING ---
        const allIndices = matches.map(m => m.index);
        
        const knowledgeIndices = matches
            .filter(m => Object.values(knowledgeRegistry).some((ctx: KnowledgeContext) => 
                hasDefinedRules(ctx.rules, m.target)
            ))
            .map(m => m.index);

        // 4. Pipeline Node Discovery
        const baseY = resolver.position.y;
        
        const getPipelineNode = (type: string, defaultId: string, xOffset: number, width?: number) => {
            const existing = nodes.find(n => n.type === type);
            if (existing) return { node: existing, isNew: false };
            
            const x = resolver.position.x + xOffset;
            const newNode: Node<PSDNodeData> = {
                id: defaultId,
                type,
                position: { x, y: baseY },
                data: { 
                    fileName: null, template: null, validation: null, designLayers: null,
                    instanceCount: matches.length 
                },
                style: width ? { width } : undefined
            };
            return { node: newNode, isNew: true };
        };

        const analyst = getPipelineNode('designAnalyst', 'designAnalyst-main', 800, 650);
        const remapper = getPipelineNode('remapper', 'remapper-main', 1600, 500);
        const reviewer = getPipelineNode('designReviewer', 'reviewer-main', 2200, 480);
        const preview = getPipelineNode('containerPreview', 'preview-main', 2800, 650);
        const exportNode = getPipelineNode('exportPsd', 'export-main', 3600);

        // 5. Graph Mutation
        
        // Step A: Update Nodes
        setNodes((nds) => {
            const semanticInstanceCount = knowledgeIndices.length > 0 ? matches.length : 0;

            const updatedNodes = nds.map((n) => {
                if (n.id === resolver.id) return { ...n, data: { ...n.data, channelCount: matches.length, activeInstances: allIndices } };
                if (n.id === remapper.node.id) return { ...n, data: { ...n.data, instanceCount: matches.length, activeInstances: allIndices } };
                if (n.id === preview.node.id) return { ...n, data: { ...n.data, instanceCount: matches.length, activeInstances: allIndices } };
                
                if (n.id === analyst.node.id) return { ...n, data: { ...n.data, instanceCount: semanticInstanceCount, activeInstances: knowledgeIndices } };
                if (n.id === reviewer.node.id) return { ...n, data: { ...n.data, instanceCount: semanticInstanceCount, activeInstances: knowledgeIndices } };
                
                return n;
            });

            if (analyst.isNew) updatedNodes.push({ ...analyst.node, data: { ...analyst.node.data, instanceCount: semanticInstanceCount, activeInstances: knowledgeIndices } });
            if (remapper.isNew) updatedNodes.push({ ...remapper.node, data: { ...remapper.node.data, instanceCount: matches.length, activeInstances: allIndices } });
            if (reviewer.isNew) updatedNodes.push({ ...reviewer.node, data: { ...reviewer.node.data, instanceCount: semanticInstanceCount, activeInstances: knowledgeIndices } });
            if (preview.isNew) updatedNodes.push({ ...preview.node, data: { ...preview.node.data, instanceCount: matches.length, activeInstances: allIndices } });
            if (exportNode.isNew) updatedNodes.push(exportNode.node);

            return updatedNodes;
        });

        // Step B: Re-wire Edges (Default/Standard Style)
        setEdges((currentEdges) => {
            const targetsToClean = [
                analyst.node.id, remapper.node.id, reviewer.node.id, preview.node.id, exportNode.node.id
            ];

            const cleanEdges = currentEdges.filter(e => {
                // Remove bypass loop if present
                if (e.source === resolver.id && e.target === targetSplitter.id) return false;
                
                // Pipeline Cleanup with Knowledge Safeguard
                if (targetsToClean.includes(e.target)) {
                    // CRITICAL FIX: Preserve manual connections from Project Brain / Knowledge Inspector
                    if (e.targetHandle === 'knowledge-in') return true;
                    
                    return false; // Remove all other auto-wired inputs
                }

                // Remove resolver outputs (to ensure clean re-index)
                if (e.source === resolver.id) return false;
                
                return true;
            });

            const newEdges: Edge[] = [];
            const standardStyle = {}; 
            
            // Step C: Commit Simulated Infrastructure Edges
            missingInfraEdges.forEach(e => {
                const exists = cleanEdges.some(ce => ce.source === e.source && ce.target === e.target && ce.targetHandle === e.targetHandle);
                if (!exists) newEdges.push(e);
            });
            
            // Step D: Ensure Export Node Infrastructure Link
            if (targetTemplate) {
                 const exportId = exportNode.node.id;
                 const hasLink = [...cleanEdges, ...newEdges].some(
                     e => e.source === targetTemplate.id && 
                     e.target === exportId && 
                     e.targetHandle === 'template-input'
                 );
                 
                 if (!hasLink) {
                      newEdges.push({
                        id: `leg-tmpl-exp-${timestamp}`,
                        source: targetTemplate.id, sourceHandle: 'target-metadata-out',
                        target: exportId, targetHandle: 'template-input',
                        type: 'default',
                        style: {}
                    });
                 }
            }

            // Step E: Knowledge Pipeline Wiring (PHASE 2)
            if (knowledge) {
                // Wiring for Analyst
                const analystId = analyst.node.id;
                const hasAnalystConn = cleanEdges.some(e => e.source === knowledge.id && e.target === analystId && e.targetHandle === 'knowledge-in');
                if (!hasAnalystConn) {
                    newEdges.push({
                        id: `auto-know-ana-${timestamp}`,
                        source: knowledge.id,
                        target: analystId,
                        sourceHandle: 'knowledge-out',
                        targetHandle: 'knowledge-in',
                        type: 'default',
                        style: {}
                    });
                }

                // Wiring for Reviewer
                const reviewerId = reviewer.node.id;
                const hasReviewerConn = cleanEdges.some(e => e.source === knowledge.id && e.target === reviewerId && e.targetHandle === 'knowledge-in');
                if (!hasReviewerConn) {
                    newEdges.push({
                        id: `auto-know-rev-${timestamp}`,
                        source: knowledge.id,
                        target: reviewerId,
                        sourceHandle: 'knowledge-out',
                        targetHandle: 'knowledge-in',
                        type: 'default',
                        style: {}
                    });
                }
            }

            // Step F: Pipeline Legs (Per-Instance)
            matches.forEach((m) => {
                const i = m.index;
                const key = `${i}-${timestamp}`;

                const hasKnowledge = Object.values(knowledgeRegistry).some((ctx: KnowledgeContext) => 
                    hasDefinedRules(ctx.rules, m.target)
                );

                // Universal Legs
                newEdges.push({
                    id: `leg-split-res-${key}`,
                    source: sourceSplitter.id, sourceHandle: m.source,
                    target: resolver.id, targetHandle: `target-${i}`,
                    type: 'default',
                    style: standardStyle
                });

                newEdges.push({
                    id: `leg-res-ts-${key}`,
                    source: resolver.id, sourceHandle: `source-${i}`,
                    target: targetSplitter.id, targetHandle: m.target,
                    type: 'default',
                    style: standardStyle
                });

                if (hasKnowledge) {
                    // Semantic Pipeline (Analyst -> Remapper -> Reviewer)
                    newEdges.push({
                        id: `leg-res-ana-${key}`,
                        source: resolver.id, sourceHandle: `source-${i}`,
                        target: analyst.node.id, targetHandle: `source-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });

                    newEdges.push({
                        id: `leg-ts-ana-${key}`,
                        source: targetSplitter.id, sourceHandle: `slot-bounds-${m.target}`,
                        target: analyst.node.id, targetHandle: `target-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });

                    newEdges.push({
                        id: `leg-ana-rem-src-${key}`,
                        source: analyst.node.id, sourceHandle: `source-out-${i}`,
                        target: remapper.node.id, targetHandle: `source-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });
                    
                    newEdges.push({
                        id: `leg-ana-rem-tgt-${key}`,
                        source: analyst.node.id, sourceHandle: `target-out-${i}`,
                        target: remapper.node.id, targetHandle: `target-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });

                    newEdges.push({
                        id: `leg-rem-rev-${key}`,
                        source: remapper.node.id, sourceHandle: `result-out-${i}`,
                        target: reviewer.node.id, targetHandle: `source-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });

                    newEdges.push({
                        id: `leg-rev-pre-${key}`,
                        source: reviewer.node.id, sourceHandle: `result-out-${i}`,
                        target: preview.node.id, targetHandle: `payload-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });

                } else {
                    // Fast Pipeline (Direct Remapper)
                    newEdges.push({
                        id: `leg-res-rem-direct-${key}`,
                        source: resolver.id, sourceHandle: `source-${i}`,
                        target: remapper.node.id, targetHandle: `source-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });

                    newEdges.push({
                        id: `leg-ts-rem-direct-${key}`,
                        source: targetSplitter.id, sourceHandle: `slot-bounds-${m.target}`,
                        target: remapper.node.id, targetHandle: `target-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });

                    newEdges.push({
                        id: `leg-rem-prev-direct-${key}`,
                        source: remapper.node.id, sourceHandle: `result-out-${i}`,
                        target: preview.node.id, targetHandle: `payload-in-${i}`,
                        type: 'default',
                        style: standardStyle
                    });
                }

                // Closing Legs
                newEdges.push({
                    id: `leg-ts-pre-${key}`,
                    source: targetSplitter.id, sourceHandle: `slot-bounds-${m.target}`,
                    target: preview.node.id, targetHandle: `target-in-${i}`,
                    type: 'default',
                    style: standardStyle
                });

                newEdges.push({
                    id: `leg-pre-exp-${key}`,
                    source: preview.node.id, sourceHandle: `payload-out-${i}`,
                    target: exportNode.node.id, targetHandle: `input-${m.target}`,
                    type: 'default',
                    style: standardStyle
                });
            });

            // ATOMIC COMMIT: Cleaned existing + New Infrastucture + Knowledge Links + Pipeline Legs
            return [...cleanEdges, ...newEdges];
        });
        
        console.log(`[Heuristic Engine] Pipeline Auto-Wired: Full Chain Complete (${matches.length} streams).`);
    };

    const handleReset = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 1. Safety Checks
        if (!resetProject) {
            console.error("[Reset] Critical Error: resetProject function missing from context.");
            return;
        }

        // 2. 2-Step Logic: ARMING
        if (!isResetConfirming) {
            console.log("[Reset] Arming confirmation...");
            setIsResetConfirming(true);
            
            // Auto-revert to safety after 3 seconds
            if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = setTimeout(() => {
                setIsResetConfirming(false);
                console.log("[Reset] Confirmation timed out.");
            }, 3000);
            return;
        }

        // 3. Execution: FIRING (Confirmed)
        if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
        setIsResetConfirming(false);

        try {
            console.log("[Reset] Confirmed. Executing Deep Clean...");

            // A. Sever Connections (Stop Data Flow)
            setEdges([]);
            console.log("[Reset] 1/3: Edges Removed");

            // B. Flush Global Store (Clear Registries)
            resetProject();
            console.log("[Reset] 2/3: Global Store Flushed");

            // C. Sanitize Nodes (Reset Local State)
            setNodes((nodes) => nodes.map((node) => {
                // Universal Error Clear
                const baseData = { ...node.data, error: null };

                switch (node.type) {
                    case 'loadPsd':
                    case 'targetTemplate':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                fileName: null,
                                template: null,
                                validation: null,
                                designLayers: null,
                            }
                        };
                    case 'designInfo':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                designLayers: null,
                                validation: null,
                                fileName: null,
                                template: null
                            }
                        };
                    case 'templateSplitter':
                    case 'targetSplitter':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                template: null,
                                activeInstances: [],
                                fileName: null
                            }
                        };
                    case 'designAnalyst':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                analystInstances: {},
                                activeInstances: [],
                                instanceCount: 1,
                            }
                        };
                    case 'designReviewer':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                reviewerInstances: {},
                                activeInstances: [],
                                instanceCount: 1,
                            }
                        };
                    case 'knowledge':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                knowledgeContext: null,
                            }
                        };
                    case 'knowledgeInspector':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                inspectorState: undefined,
                            }
                        };
                    case 'containerResolver':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                channelCount: 0,
                                activeInstances: [],
                            }
                        };
                    case 'remapper':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                transformedPayload: null,
                                activeInstances: [],
                                instanceCount: 1,
                                instanceSettings: {}
                            }
                        };
                    case 'containerPreview':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                activeInstances: [],
                                instanceCount: 1,
                                previewImages: undefined
                            }
                        };
                    case 'exportPsd':
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                validation: null,
                                designLayers: null,
                                template: null,
                                fileName: null
                            }
                        };
                    // Fallback for others
                    default:
                        return {
                            ...node,
                            data: {
                                ...baseData,
                                // Ensure common volatile fields are cleared if present on other nodes
                                fileName: null,
                                template: null
                            }
                        };
                }
            }));
            console.log("[Reset] 3/3: Nodes Sanitized. Reset Complete.");

        } catch (err) {
            console.error("[Reset] FAILED:", err);
            alert("Reset failed. Check console for details.");
        }
    };

    const onSave = () => {
        const flow = toObject();
        
        const sanitizedNodes = flow.nodes.map(node => {
            if (node.data && node.data.transformedPayload) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        transformedPayload: {
                            ...node.data.transformedPayload,
                            previewUrl: undefined,
                        }
                    }
                };
            }
            return node;
        });
        
        const projectData: ProjectExport = {
            version: '1.0.0',
            timestamp: Date.now(),
            nodes: sanitizedNodes,
            edges: flow.edges,
            viewport: flow.viewport
        };
        
        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PSD_PROJECT_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const onLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    const rawData = JSON.parse(result);
                    
                    const isValidSchema = 
                        rawData && 
                        Array.isArray(rawData.nodes) && 
                        Array.isArray(rawData.edges) && 
                        rawData.viewport && 
                        typeof rawData.viewport.x === 'number';

                    if (!isValidSchema) {
                        console.error("Schema Mismatch: Missing core React Flow properties.");
                        alert("Invalid Project File: The file structure does not match the expected schema.");
                        return;
                    }

                    const project = rawData as ProjectExport;
                    setNodes(project.nodes);
                    setEdges(project.edges);
                    setViewport(project.viewport);
                }
            } catch (err) {
                console.error("Failed to parse project file", err);
                alert("Corrupt File: Could not parse JSON data.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex space-x-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={onLoad} 
            />
            
            <button
                type="button"
                onClick={handleReset}
                className={`
                    px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-all duration-200 mr-2 border
                    ${isResetConfirming 
                        ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 scale-105 shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-600'
                    }
                `}
                title={isResetConfirming ? "Click again to wipe all data" : "Reset Project: Clear Data, Keep Layout"}
            >
                {isResetConfirming ? <AlertCircle className="w-4 h-4 animate-pulse" /> : <RotateCcw className="w-4 h-4" />}
                <span>{isResetConfirming ? "Confirm?" : "Reset"}</span>
            </button>

            <button
                onClick={handleAutoWire}
                className="bg-teal-600 hover:bg-teal-500 text-white border border-teal-500 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-colors"
                title="Auto-Connect matching containers"
            >
                <Wand2 className="w-4 h-4" />
                <span>Auto Wire</span>
            </button>

            <button 
                onClick={onSave}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-colors"
                title="Save Layout & Metadata"
            >
                <Save className="w-4 h-4" />
                <span>Save</span>
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-colors"
                title="Load Project JSON"
            >
                <Upload className="w-4 h-4" />
                <span>Load</span>
            </button>
        </div>
    );
};