
import * as React from 'react';
import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Handle, Position, NodeResizer, useEdges, useReactFlow, useUpdateNodeInternals, useNodes } from 'reactflow';
import type { NodeProps, Node, Edge } from 'reactflow';
import { PSDNodeData, LayoutStrategy, SerializableLayer, ChatMessage, AnalystInstanceState, ContainerContext, TemplateMetadata, ContainerDefinition, MappingContext, KnowledgeContext, SourceAnalysis, VerificationResult, LayerOverride } from '../types';
import { useProceduralStore } from '../store/ProceduralContext';
import { getSemanticThemeObject, findLayerByPath, calculateGroupBounds } from '../services/psdService';
import { useKnowledgeScoper } from '../hooks/useKnowledgeScoper';
import {
  generateCompletion,
  generateImageWithComfyUI,
  checkQwenServerHealth,
  ContentPart,
  StructuredOutputSchema
} from '../services/aiProviderService';
import { Brain, BrainCircuit, Ban, ClipboardList, AlertCircle, RefreshCw, RotateCcw, Play, Eye, BookOpen, Tag, Activity, Expand, Minimize2, MapPin, Scaling, Copy, Check } from 'lucide-react';
import { Psd } from 'ag-psd';

// Layout/Analysis Constants
const ASPECT_RATIO_TOLERANCE = 0.15;
const HEALTH_CHECK_INTERVAL_MS = 30000;
const MAX_LAYER_DEPTH = 3;
// Layer count for prompt context - provides good coverage of container contents
const MAX_LAYERS_IN_PROMPT = 20;
const DRAFT_DEBOUNCE_MS = 500;

// Helper function to infer layout role from layer name
const inferLayoutRoleFromName = (name: string): 'flow' | 'static' | 'overlay' | 'background' => {
  const lower = name.toLowerCase();
  if (lower.includes('bg') || lower.includes('background') || lower.includes('fill')) return 'background';
  if (lower.includes('button') || lower.includes('cta') ||
      lower.includes('counter') || lower.includes('score') || lower.includes('header') ||
      lower.includes('footer') || lower.includes('nav') ||
      lower.includes('window') || lower.includes('winner_counter') ||
      lower === 'win' || lower.startsWith('win ') ||
      lower === 'text' || lower.startsWith('text ')) return 'static';
  if (lower.includes('label') || lower.includes('badge') || lower.includes('tag')) return 'overlay';
  return 'flow';
};

// Model configuration for Qwen local
type ModelKey = 'qwen-local';

const MODELS: Record<ModelKey, { badgeClass: string; label: string }> = {
  'qwen-local': {
    badgeClass: 'bg-cyan-900/30 border-cyan-500/30 text-cyan-300',
    label: 'QWEN LOCAL'
  }
};

const getModelKey = (_value: string | undefined): ModelKey => 'qwen-local';

const DEFAULT_INSTANCE_STATE: AnalystInstanceState = {
    chatHistory: [],
    layoutStrategy: null,
    isKnowledgeMuted: false
};

const StrategyCard: React.FC<{ strategy: LayoutStrategy }> = ({ strategy }) => {
    const overrideCount = strategy.overrides?.length || 0;
    const directives = strategy.directives || [];
    const triangulation = strategy.triangulation;
    const anchors = strategy.semanticAnchors || [];

    let methodColor = 'text-slate-400 border-slate-600';
    if (strategy.method === 'GENERATIVE') methodColor = 'text-purple-300 border-purple-500 bg-purple-900/20';
    else if (strategy.method === 'HYBRID') methodColor = 'text-pink-300 border-pink-500 bg-pink-900/20';
    else if (strategy.method === 'GEOMETRIC') methodColor = 'text-emerald-300 border-emerald-500 bg-emerald-900/20';

    let confidenceColor = 'text-slate-400 border-slate-600 bg-slate-800';
    if (triangulation?.confidence_verdict === 'HIGH') confidenceColor = 'text-emerald-300 border-emerald-500 bg-emerald-900/20';
    else if (triangulation?.confidence_verdict === 'MEDIUM') confidenceColor = 'text-yellow-300 border-yellow-500 bg-yellow-900/20';
    else if (triangulation?.confidence_verdict === 'LOW') confidenceColor = 'text-red-300 border-red-500 bg-red-900/20';

    let spatialIcon = <Minimize2 className="w-3 h-3" />;
    let spatialLabel = 'FIT';
    let spatialClass = 'text-blue-300 border-blue-500 bg-blue-900/20';

    if (strategy.spatialLayout === 'STRETCH_FILL') {
        spatialIcon = <Expand className="w-3 h-3" />;
        spatialLabel = 'FILL';
        spatialClass = 'text-purple-300 border-purple-500 bg-purple-900/20';
    } else if (strategy.spatialLayout === 'ABSOLUTE_PIN') {
        spatialIcon = <MapPin className="w-3 h-3" />;
        spatialLabel = 'PIN';
        spatialClass = 'text-orange-300 border-orange-500 bg-orange-900/20';
    }

    return (
        <div
            className={`bg-slate-800/80 border-l-2 border-cyan-500 p-3 rounded text-xs space-y-3 w-full cursor-text`}
            onMouseDown={(e) => e.stopPropagation()}
        >
             <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="font-bold text-cyan-300">SEMANTIC RECOMPOSITION</span>
                <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold tracking-wider flex items-center gap-1 ${spatialClass}`}>
                        {spatialIcon} {spatialLabel}
                    </span>
                    <span className="text-slate-400 text-[10px]">{strategy.anchor || 'CENTER'}</span>
                </div>
             </div>

             <div className="flex flex-wrap gap-1 mt-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold tracking-wider ${methodColor}`}>
                    {strategy.method || 'GEOMETRIC'}
                </span>
                {strategy.forceGeometryChange && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-500 text-orange-300 bg-orange-900/20 font-mono font-bold flex items-center gap-1">
                        <Scaling className="w-2.5 h-2.5" /> RESIZED
                    </span>
                )}
                {strategy.clearance && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-500 text-orange-300 bg-orange-900/20 font-mono font-bold">
                        CLEARANCE
                    </span>
                )}
                {strategy.sourceReference && (
                     <span className="text-[9px] px-1.5 py-0.5 rounded border border-blue-500 text-blue-300 bg-blue-900/20 font-mono font-bold" title="Source Pixels Attached">
                        REF ATTACHED
                     </span>
                )}
                {strategy.replaceLayerId && (
                    <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded border border-red-500/50 bg-red-900/20">
                        <RefreshCw className="w-2.5 h-2.5 text-red-400" />
                        <span className="text-[9px] text-red-300 font-mono font-bold" title={`Replaces layer ${strategy.replaceLayerId}`}>
                            SWAP
                        </span>
                    </div>
                )}
             </div>

             {triangulation && (
                 <div className="mt-2 border border-slate-700 rounded overflow-hidden">
                     <div className={`px-2 py-1 flex items-center justify-between border-b border-slate-700/50 ${confidenceColor}`}>
                         <div className="flex items-center space-x-1.5">
                             <Activity className="w-3 h-3" />
                             <span className="text-[9px] font-bold uppercase tracking-wider">Confidence Audit</span>
                         </div>
                         <span className="text-[9px] font-mono font-bold">{triangulation.confidence_verdict} ({triangulation.evidence_count}/3)</span>
                     </div>
                     <div className="p-2 bg-slate-900/40 space-y-1.5">
                         <div className="flex items-start space-x-2">
                             <Eye className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
                             <div className="flex flex-col">
                                 <span className="text-[8px] text-slate-500 uppercase tracking-wide">Visual</span>
                                 <span className="text-[9px] text-purple-200 leading-tight">{triangulation.visual_identification}</span>
                             </div>
                         </div>
                         <div className="flex items-start space-x-2">
                             <BookOpen className="w-3 h-3 text-teal-400 mt-0.5 shrink-0" />
                             <div className="flex flex-col">
                                 <span className="text-[8px] text-slate-500 uppercase tracking-wide">Knowledge</span>
                                 <span className="text-[9px] text-teal-200 leading-tight">{triangulation.knowledge_correlation}</span>
                             </div>
                         </div>
                         <div className="flex items-start space-x-2">
                             <Tag className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                             <div className="flex flex-col">
                                 <span className="text-[8px] text-slate-500 uppercase tracking-wide">Metadata</span>
                                 <span className="text-[9px] text-blue-200 leading-tight">{triangulation.metadata_validation}</span>
                             </div>
                         </div>
                     </div>
                 </div>
             )}

             {anchors.length > 0 && (
                 <div className="mt-2 p-2 bg-indigo-900/20 border border-indigo-500/20 rounded">
                     <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider mb-1 block">Visual Anchors</span>
                     <div className="flex flex-wrap gap-1">
                         {anchors.map((anchor, i) => (
                             <span key={i} className="text-[9px] px-1.5 py-0.5 bg-indigo-900/40 border border-indigo-500/30 rounded text-indigo-200 font-mono">
                                 {anchor}
                             </span>
                         ))}
                     </div>
                 </div>
             )}

             {strategy.knowledgeApplied && !triangulation && (
                 <div className="flex items-center space-x-1.5 p-1 bg-teal-900/30 border border-teal-500/30 rounded mt-1">
                     <Brain className="w-3 h-3 text-teal-400" />
                     <span className="text-[9px] text-teal-300 font-bold uppercase tracking-wider">
                         Knowledge Informed
                     </span>
                 </div>
             )}
             
             {strategy.knowledgeMuted && (
                 <div className="flex items-center space-x-1.5 p-1 bg-slate-800/50 border border-slate-600 rounded mt-1 opacity-75">
                     <Ban className="w-3 h-3 text-slate-400" />
                     <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider line-through decoration-slate-500">
                         Rules Ignored
                     </span>
                 </div>
             )}
             
             {directives.length > 0 && (
                 <div className="space-y-1 mt-2 border-t border-slate-700/50 pt-2">
                     <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Mandatory Directives</span>
                     <div className="flex flex-wrap gap-1">
                         {directives.map((d, i) => (
                             <div key={i} className="flex items-center space-x-1 px-1.5 py-0.5 bg-red-900/30 border border-red-500/30 rounded text-[9px] text-red-200 font-mono">
                                 <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                                 <span>{d}</span>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
             
             <div className="grid grid-cols-2 gap-4 mt-1">
                <div>
                    <span className="block text-slate-500 text-[10px] uppercase tracking-wider">Global Scale</span>
                    <span className="text-slate-200 font-mono text-sm">{(strategy.suggestedScale ?? 1).toFixed(3)}x</span>
                </div>
                <div>
                    <span className="block text-slate-500 text-[10px] uppercase tracking-wider">Overrides</span>
                    <span className={`text-sm ${overrideCount > 0 ? 'text-pink-400 font-bold' : 'text-slate-400'}`}>
                        {overrideCount} Layers
                    </span>
                </div>
             </div>

             {strategy.safetyReport && strategy.safetyReport.violationCount > 0 && (
                 <div className="bg-orange-900/30 text-orange-200 p-2 rounded flex items-center space-x-2">
                     <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     <span>{strategy.safetyReport.violationCount} Boundary Warnings</span>
                 </div>
             )}
        </div>
    );
};

interface InstanceRowProps {
  nodeId: string;
  index: number;
  state: AnalystInstanceState;
  sourceData: MappingContext | null;
  targetData: { bounds: { x: number; y: number; w: number; h: number }; name: string } | null;
  onAnalyze: (index: number) => void;
  onToggleMute: (index: number) => void;
  onReset: (index: number) => void;
  isAnalyzing: boolean;
  compactMode: boolean;
  activeKnowledge: KnowledgeContext | null;
  error: string | null;
  analysisStage: AnalysisStage;
}

const formatStrategyForCopy = (snapshot: LayoutStrategy): string => {
    const lines: string[] = [];
    if (snapshot.visualAnalysis) {
        lines.push('=== VISUAL ANALYSIS ===', snapshot.visualAnalysis, '');
    }
    if (snapshot.rulesApplied && snapshot.rulesApplied.length > 0) {
        lines.push('=== RULES APPLIED ===');
        snapshot.rulesApplied.forEach((r: { rule: string; application: string }) => {
            lines.push(`  ${r.rule} → ${r.application}`);
        });
        lines.push('');
    }
    if (snapshot.reasoning) {
        lines.push('=== EXPERT DESIGN AUDIT ===', snapshot.reasoning, '');
    }
    lines.push('=== STRATEGY ===');
    lines.push(`Method: ${snapshot.method || 'GEOMETRIC'}`);
    lines.push(`Spatial Layout: ${snapshot.spatialLayout || 'UNIFIED_FIT'}`);
    lines.push(`Anchor: ${snapshot.anchor || 'CENTER'}`);
    lines.push(`Suggested Scale: ${(snapshot.suggestedScale ?? 1).toFixed(3)}x`);
    if (snapshot.overrides && snapshot.overrides.length > 0) {
        lines.push(`Overrides (${snapshot.overrides.length}):`);
        snapshot.overrides.forEach((o: LayerOverride) => {
            lines.push(`  [${o.layoutRole || 'flow'}] ${o.layerId} — scale: ${o.scaleX ?? o.individualScale ?? 1}x${o.scaleY ? '/' + o.scaleY + 'y' : ''}`);
        });
    }
    if (snapshot.triangulation) {
        const t = snapshot.triangulation;
        lines.push('', '=== CONFIDENCE AUDIT ===');
        lines.push(`Verdict: ${t.confidence_verdict} (${t.evidence_count}/3)`);
        lines.push(`Visual: ${t.visual_identification}`);
        lines.push(`Knowledge: ${t.knowledge_correlation}`);
        lines.push(`Metadata: ${t.metadata_validation}`);
    }
    return lines.join('\n');
};

const InstanceRow: React.FC<InstanceRowProps> = ({
    index, state, sourceData, targetData, onAnalyze, onToggleMute, onReset, isAnalyzing, compactMode, activeKnowledge, error, analysisStage
}) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
    const activeModelConfig = MODELS[getModelKey(state.selectedModel)];
    const isReady = !!sourceData && !!targetData;
    const targetName = targetData?.name || (sourceData?.container.containerName) || 'Unknown';
    const theme = getSemanticThemeObject(targetName, index);

    // Calculate Aspect Ratio Mismatch for UI Flag
    const sRatio = sourceData ? sourceData.container.bounds.w / sourceData.container.bounds.h : 1;
    const tRatio = targetData ? targetData.bounds.w / targetData.bounds.h : 1;
    // 15% tolerance threshold for significance
    const isGeoMismatch = sourceData && targetData && Math.abs(sRatio - tRatio) > ASPECT_RATIO_TOLERANCE;

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [state.chatHistory.length, isAnalyzing]);

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;
        const handleWheel = (e: WheelEvent) => { e.stopPropagation(); };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => { container.removeEventListener('wheel', handleWheel); };
    }, []);
    
    const getPreviewStyle = (w: number, h: number, color: string) => {
        const maxDim = compactMode ? 24 : 32; 
        const ratio = w / h;
        let styleW = maxDim;
        let styleH = maxDim;
        if (ratio > 1) { styleH = maxDim / ratio; }
        else { styleW = maxDim * ratio; }
        return { width: `${styleW}px`, height: `${styleH}px`, borderColor: color };
    };

    return (
        <div className={`relative border-b border-slate-700/50 bg-slate-800/30 first:border-t-0 ${compactMode ? 'py-2' : ''}`}>
             {/* Header */}
            <div className={`px-3 py-2 flex items-center justify-between ${theme.bg.replace('/20', '/10')}`}>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${theme.dot}`}></div>
                    <span className={`text-[11px] font-bold tracking-wide uppercase ${theme.text}`}>
                        {targetData?.name || `Instance ${index + 1}`}
                    </span>
                    {activeKnowledge && state.isKnowledgeMuted && (
                         <span className="flex items-center space-x-1 text-[9px] text-slate-500 font-bold bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50 ml-2">
                             <Ban className="w-2.5 h-2.5" />
                             <span className="line-through decoration-slate-500">RULES</span>
                         </span>
                    )}
                </div>
                
                <div className="flex items-center space-x-2">
                    {/* GEOMETRY SHIFT TOGGLE (High Fidelity Status) */}
                    <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-md border text-[9px] font-bold tracking-wider transition-colors select-none ${
                        isGeoMismatch 
                        ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' 
                        : 'bg-slate-900/40 border-slate-700/50 text-slate-600'
                    }`} title={isGeoMismatch ? "Significant aspect ratio shift detected. Geometry transformation active." : "Geometry stable."}>
                        <Scaling className={`w-3 h-3 ${isGeoMismatch ? 'text-cyan-400' : 'text-slate-600'}`} />
                        <span>GEOM SHIFT</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${isGeoMismatch ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'bg-slate-700'}`}></div>
                    </div>

                    {activeKnowledge && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleMute(index); }}
                            className={`nodrag nopan p-1 rounded transition-colors border ${
                                state.isKnowledgeMuted 
                                    ? 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-400' 
                                    : 'bg-teal-900/30 text-teal-400 border-teal-500/30 hover:bg-teal-900/50 animate-pulse-slow'
                            }`}
                            title={state.isKnowledgeMuted ? "Knowledge Muted (Geometric Mode)" : "Knowledge Active"}
                        >
                            {state.isKnowledgeMuted ? <BrainCircuit className="w-3 h-3 opacity-50" /> : <Brain className="w-3 h-3" />}
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); onReset(index); }}
                        className="nodrag nopan p-1 rounded transition-colors bg-slate-800 text-slate-500 border border-slate-700 hover:text-red-400 hover:border-red-900/50"
                        title="Reset Instance (Clear History & Strategy)"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>

                    <div className="relative">
                        <span className={`text-[9px] px-2 py-1 rounded font-mono font-bold border ${activeModelConfig.badgeClass}`}>
                            {activeModelConfig.label}
                        </span>
                    </div>
                </div>
            </div>

            <div className={`p-3 space-y-3 ${compactMode ? 'text-[10px]' : ''}`}>
                 <div className="flex items-center justify-between bg-slate-900/40 rounded p-2 border border-slate-700/30 relative min-h-[60px] overflow-visible">
                    
                    <div className="flex flex-col gap-4 relative justify-center h-full">
                         <div className="relative flex items-center group h-4">
                            <Handle type="target" position={Position.Left} id={`source-in-${index}`} className="!absolute !-left-7 !w-3 !h-3 !rounded-full !bg-indigo-500 !border-2 !border-slate-800 z-50 transition-transform hover:scale-125" style={{ top: '50%', transform: 'translate(-50%, -50%)' }} title="Input: Source Context" />
                            <span className={`text-[9px] font-mono font-bold leading-none ${sourceData ? 'text-indigo-300' : 'text-slate-600'} ml-1`}>SRC</span>
                         </div>
                         <div className="relative flex items-center group h-4">
                            <Handle type="target" position={Position.Left} id={`target-in-${index}`} className="!absolute !-left-7 !w-3 !h-3 !rounded-full !bg-emerald-500 !border-2 !border-slate-800 z-50 transition-transform hover:scale-125" style={{ top: '50%', transform: 'translate(-50%, -50%)' }} title="Input: Target Definition" />
                            <span className={`text-[9px] font-mono font-bold leading-none ${targetData ? 'text-emerald-300' : 'text-slate-600'} ml-1`}>TGT</span>
                         </div>
                    </div>

                    <div className="flex items-center justify-center space-x-3 mx-4 border-x border-slate-700/20 px-4 flex-1 relative">
                        {/* Old Geometry Shift Indicator Removed from Here */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="border-2 border-dashed flex items-center justify-center bg-indigo-500/10 transition-all duration-300" style={sourceData ? getPreviewStyle(sourceData.container.bounds.w, sourceData.container.bounds.h, '#6366f1') : { width: 24, height: 24, borderColor: '#334155' }}></div>
                            {sourceData && (<span className="text-[8px] font-mono text-slate-500 leading-none">{Math.round(sourceData.container.bounds.w)}x{Math.round(sourceData.container.bounds.h)}</span>)}
                        </div>
                        <div className=""><svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="border-2 border-dashed flex items-center justify-center bg-emerald-500/10 transition-all duration-300" style={targetData ? getPreviewStyle(targetData.bounds.w, targetData.bounds.h, '#10b981') : { width: 24, height: 24, borderColor: '#334155' }}></div>
                             {targetData && (<span className="text-[8px] font-mono text-slate-500 leading-none">{Math.round(targetData.bounds.w)}x{Math.round(targetData.bounds.h)}</span>)}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 items-end relative justify-center h-full">
                        <div className="relative flex items-center justify-end group h-4">
                            <span className="text-[9px] font-mono font-bold leading-none text-slate-500 mr-1">SOURCE</span>
                            <Handle type="source" position={Position.Right} id={`source-out-${index}`} className="!absolute !-right-7 !w-3 !h-3 !rounded-full !bg-indigo-500 !border-2 !border-white z-50 transition-transform hover:scale-125" style={{ top: '50%', transform: 'translate(50%, -50%)' }} title="Relay: Source Data + AI Strategy" />
                        </div>
                        <div className="relative flex items-center justify-end group h-4">
                            <span className="text-[9px] font-mono font-bold leading-none text-slate-500 mr-1">TARGET</span>
                            <Handle type="source" position={Position.Right} id={`target-out-${index}`} className="!absolute !-right-7 !w-3 !h-3 !rounded-full !bg-emerald-500 !border-2 !border-white z-50 transition-transform hover:scale-125" style={{ top: '50%', transform: 'translate(50%, -50%)' }} title="Relay: Target Definition" />
                        </div>
                    </div>
                </div>

                <div 
                    ref={chatContainerRef} 
                    className={`nodrag nopan ${compactMode ? 'h-48' : 'h-64'} overflow-y-auto border border-slate-700 bg-slate-900 rounded p-3 space-y-3 custom-scrollbar transition-all shadow-inner cursor-auto`} 
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {state.chatHistory.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-xs opacity-50"><span>Ready to analyze {targetData?.name || 'slot'}</span></div>
                    )}
                    {state.chatHistory.map((msg: ChatMessage, idx: number) => (
                        <div key={msg.id || idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[95%] rounded border p-3 text-xs leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-800 border-slate-600 text-slate-200' : `bg-slate-800/50 ${activeModelConfig.badgeClass.replace('bg-', 'border-').split(' ')[0]} text-slate-300`}`}>
                                {msg.parts?.[0]?.text && msg.role === 'user' && (<div className="whitespace-pre-wrap break-words">{msg.parts[0].text}</div>)}
                                
                                {msg.role === 'model' && msg.strategySnapshot && (
                                    <div className="flex flex-col gap-3 relative">
                                        <button
                                            className="absolute top-0 right-0 p-1 rounded hover:bg-slate-700/60 text-slate-500 hover:text-slate-200 transition-colors z-10"
                                            title="Copy analysis to clipboard"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const text = formatStrategyForCopy(msg.strategySnapshot!);
                                                try {
                                                    await navigator.clipboard.writeText(text);
                                                    setCopiedMsgId(msg.id || String(idx));
                                                    setTimeout(() => setCopiedMsgId(null), 2000);
                                                } catch (err) { console.error('Copy failed', err); }
                                            }}
                                        >
                                            {copiedMsgId === (msg.id || String(idx))
                                                ? <Check className="w-3 h-3 text-emerald-400" />
                                                : <Copy className="w-3 h-3" />}
                                        </button>
                                        <div className="space-y-1.5">
                                            {/* Visual Analysis Section (new) */}
                                            {msg.strategySnapshot.visualAnalysis && (
                                                <div className="mb-2">
                                                    <div className="flex items-center space-x-2 border-b border-teal-700/50 pb-1.5">
                                                        <div className="p-1 bg-teal-500/20 rounded">
                                                            <Eye className="w-3 h-3 text-teal-300" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-teal-200 uppercase tracking-widest">
                                                            Visual Analysis
                                                        </span>
                                                    </div>
                                                    <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap pl-1 mt-1">
                                                        {msg.strategySnapshot.visualAnalysis}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Rules Applied Section (new) */}
                                            {msg.strategySnapshot.rulesApplied && msg.strategySnapshot.rulesApplied.length > 0 && (
                                                <div className="mb-2">
                                                    <div className="flex items-center space-x-2 border-b border-amber-700/50 pb-1.5">
                                                        <div className="p-1 bg-amber-500/20 rounded">
                                                            <BookOpen className="w-3 h-3 text-amber-300" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">
                                                            Rules Applied ({msg.strategySnapshot.rulesApplied.length})
                                                        </span>
                                                    </div>
                                                    <div className="pl-1 mt-1 space-y-1">
                                                        {msg.strategySnapshot.rulesApplied.map((r: {rule: string, application: string}, idx: number) => (
                                                            <div key={idx} className="text-xs">
                                                                <span className="text-amber-300 font-mono">{r.rule}</span>
                                                                <span className="text-slate-400"> → </span>
                                                                <span className="text-slate-300">{r.application}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Expert Design Audit (reasoning) */}
                                            <div className="flex items-center space-x-2 border-b border-slate-700/50 pb-1.5">
                                                <div className="p-1 bg-purple-500/20 rounded">
                                                    <Brain className="w-3 h-3 text-purple-300" />
                                                </div>
                                                <span className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">
                                                    Expert Design Audit
                                                </span>
                                            </div>
                                            <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                                                {msg.strategySnapshot.reasoning}
                                            </div>
                                        </div>

                                        <StrategyCard strategy={msg.strategySnapshot} modelConfig={activeModelConfig} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isAnalyzing && (
                        <div className="space-y-2 pl-1">
                            {/* 3-Stage Pipeline Progress */}
                            <div className="flex items-center gap-2 text-[10px]">
                                <div className={`flex items-center gap-1 px-2 py-1 rounded border transition-all ${
                                    analysisStage === 'comprehension'
                                        ? 'bg-purple-900/40 border-purple-500/50 text-purple-300 animate-pulse'
                                        : analysisStage === 'layout' || analysisStage === 'verification' || analysisStage === 'complete'
                                            ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'
                                            : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                                }`}>
                                    <span className="font-bold">1</span>
                                    <span>Comprehend</span>
                                    {(analysisStage === 'layout' || analysisStage === 'verification' || analysisStage === 'complete') && <span>✓</span>}
                                </div>
                                <div className="text-slate-600">→</div>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded border transition-all ${
                                    analysisStage === 'layout'
                                        ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-300 animate-pulse'
                                        : analysisStage === 'verification' || analysisStage === 'complete'
                                            ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'
                                            : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                                }`}>
                                    <span className="font-bold">2</span>
                                    <span>Layout</span>
                                    {(analysisStage === 'verification' || analysisStage === 'complete') && <span>✓</span>}
                                </div>
                                <div className="text-slate-600">→</div>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded border transition-all ${
                                    analysisStage === 'verification'
                                        ? 'bg-amber-900/40 border-amber-500/50 text-amber-300 animate-pulse'
                                        : analysisStage === 'complete'
                                            ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'
                                            : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                                }`}>
                                    <span className="font-bold">3</span>
                                    <span>Verify</span>
                                    {analysisStage === 'complete' && <span>✓</span>}
                                </div>
                            </div>
                            {/* Current stage description */}
                            <div className="flex items-center space-x-2 text-xs text-slate-400 animate-pulse">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                <span>
                                    {analysisStage === 'comprehension' && 'Understanding source composition...'}
                                    {analysisStage === 'layout' && 'Generating adaptive layout...'}
                                    {analysisStage === 'verification' && 'Verifying semantic integrity...'}
                                    {analysisStage === 'idle' && 'Initializing analysis...'}
                                </span>
                                {activeKnowledge && !state.isKnowledgeMuted && (
                                    <span className="text-[9px] text-teal-400 font-bold ml-1 flex items-center gap-1">
                                        <Brain className="w-3 h-3" />
                                        + Rules & Anchors
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="flex items-center space-x-2 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-xs">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="break-words">{error}</span>
                    </div>
                )}

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-700/30">
                     <button
                        onClick={(e) => { e.stopPropagation(); onAnalyze(index); }} 
                        onMouseDown={(e) => e.stopPropagation()} 
                        disabled={!isReady || isAnalyzing} 
                        className={`nodrag nopan h-9 w-full rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center space-x-2 
                            ${isReady && !isAnalyzing 
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white border border-indigo-400/50' 
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                            }`}
                     >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run Design Analysis</span>
                     </button>
                </div>
            </div>
        </div>
    );
};

// Analysis stage type for 3-stage semantic pipeline
type AnalysisStage = 'idle' | 'comprehension' | 'layout' | 'verification' | 'complete' | 'error';

export const DesignAnalystNode = memo(({ id, data }: NodeProps<PSDNodeData>) => {
  const [analyzingInstances, setAnalyzingInstances] = useState<Record<number, boolean>>({});
  const [instanceErrors, setInstanceErrors] = useState<Record<number, string | null>>({});
  const [analysisStages, setAnalysisStages] = useState<Record<number, AnalysisStage>>({});
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const instanceCount = data.instanceCount || 1;
  const activeInstances = data.activeInstances;
  const analystInstances = data.analystInstances || {};
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edges = useEdges();
  const nodes = useNodes();
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const { resolvedRegistry, templateRegistry, knowledgeRegistry, registerResolved, registerTemplate, unregisterNode, psdRegistry, flushPipelineInstance } = useProceduralStore();

  const hasFunctionalInput = useMemo(() => {
    return edges.some(e => e.target === id && e.targetHandle !== 'knowledge-in');
  }, [edges, id]);

  const effectiveIndices = useMemo(() => {
     return activeInstances && activeInstances.length > 0
       ? activeInstances
       : Array.from({ length: instanceCount }, (_, i) => i);
  }, [instanceCount, activeInstances]);

  // Server health check for Qwen/Ollama
  useEffect(() => {
    const checkServer = async () => {
      const healthy = await checkQwenServerHealth();
      setServerStatus(healthy ? 'online' : 'offline');
    };
    checkServer();
    const interval = setInterval(checkServer, HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => unregisterNode(id);
  }, [id, unregisterNode]);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, instanceCount, activeInstances, updateNodeInternals]);

  const activeContainerNames = useMemo(() => {
    const names: string[] = [];
    for (const i of effectiveIndices) {
        const sourceEdge = edges.find(e => e.target === id && e.targetHandle === `source-in-${i}`);
        if (sourceEdge) {
            const registry = resolvedRegistry[sourceEdge.source];
            const context = registry ? registry[sourceEdge.sourceHandle || ''] : null;
            if (context?.container?.containerName) {
                names.push(context.container.containerName);
            }
        }
    }
    return names;
  }, [edges, id, effectiveIndices, resolvedRegistry]);
    
  const titleSuffix = activeContainerNames.length > 0 ? `(${activeContainerNames.join(', ')})` : '(Waiting...)';

  const activeKnowledge = useMemo(() => {
    const edge = edges.find(e => e.target === id && e.targetHandle === 'knowledge-in');
    if (!edge) return null;
    return knowledgeRegistry[edge.source];
  }, [edges, id, knowledgeRegistry]);

  const { scopes } = useKnowledgeScoper(activeKnowledge?.rules);

  const getSourceData = useCallback((index: number) => {
    const edge = edges.find(e => e.target === id && e.targetHandle === `source-in-${index}`);
    if (!edge || !edge.sourceHandle) return null;
    const registry = resolvedRegistry[edge.source];
    return registry ? registry[edge.sourceHandle] : null;
  }, [edges, id, resolvedRegistry]);

  const getTargetData = useCallback((index: number) => {
    const edge = edges.find(e => e.target === id && e.targetHandle === `target-in-${index}`);
    if (!edge) return null;
    const template = templateRegistry[edge.source];
    if (!template) return null;
    let containerName = edge.sourceHandle;
    if (containerName?.startsWith('slot-bounds-')) {
        containerName = containerName.replace('slot-bounds-', '');
    }
    const container = template.containers.find(c => c.name === containerName);
    return container ? { bounds: container.bounds, name: container.name } : null;
  }, [edges, id, templateRegistry]);

  const extractSourcePixels = async (
      layers: SerializableLayer[], 
      bounds: {x: number, y: number, w: number, h: number},
      targetLayerId?: string
  ): Promise<string | null> => {
      const loadPsdNode = nodes.find(n => n.type === 'loadPsd');
      if (!loadPsdNode) return null;
      const psd = psdRegistry[loadPsdNode.id];
      if (!psd) return null;

      const canvas = document.createElement('canvas');
      canvas.width = bounds.w;
      canvas.height = bounds.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.clearRect(0, 0, bounds.w, bounds.h);

      if (targetLayerId) {
          const targetLayer = findLayerByPath(psd, targetLayerId);
          if (targetLayer && targetLayer.canvas) {
              const dx = (targetLayer.left || 0) - bounds.x;
              const dy = (targetLayer.top || 0) - bounds.y;
              ctx.drawImage(targetLayer.canvas, dx, dy);
              return canvas.toDataURL('image/png');
          }
          console.warn("Target layer isolation failed for:", targetLayerId);
          return null; 
      }

      // Debug: Log layers being composited for AI analysis
      console.log('[extractSourcePixels] Compositing layers for AI:', layers.map(l => ({
          name: l.name,
          visible: l.isVisible,
          type: l.type,
          childCount: l.children?.length || 0
      })));

      // Draw layers from bottom to top for correct compositing
      // Based on logs: array is [BG, OPTIONS, PRIZE_FONT, TEXT, WIN_COUNTER] (bottom-to-top)
      // So iterate FORWARD: index 0 (BG/bottom) first, index 4 (WIN_COUNTER/top) last
      const drawLayers = (layerNodes: SerializableLayer[], depth = 0) => {
          for (let i = 0; i < layerNodes.length; i++) {
              const node = layerNodes[i];
              if (!node.isVisible) {
                  console.log(`[extractSourcePixels] SKIP invisible: ${node.name}`);
                  continue;
              }
              if (node.children) {
                  console.log(`[extractSourcePixels] ${'  '.repeat(depth)}GROUP: ${node.name} (${node.children.length} children)`);
                  drawLayers(node.children, depth + 1);
              } else {
                  const agLayer = findLayerByPath(psd, node.id);
                  if (agLayer && agLayer.canvas) {
                      const dx = (agLayer.left || 0) - bounds.x;
                      const dy = (agLayer.top || 0) - bounds.y;
                      console.log(`[extractSourcePixels] ${'  '.repeat(depth)}DRAW: ${node.name} at (${dx},${dy}) size ${agLayer.canvas.width}x${agLayer.canvas.height}`);
                      ctx.drawImage(agLayer.canvas, dx, dy);
                  } else {
                      console.log(`[extractSourcePixels] ${'  '.repeat(depth)}SKIP no canvas: ${node.name}`);
                  }
              }
          }
      };
      drawLayers(layers);
      return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    const syntheticContainers: ContainerDefinition[] = [];
    let canvasDims = { width: 0, height: 0 };

    for (const i of effectiveIndices) {
        const sourceData = getSourceData(i);
        const targetData = getTargetData(i);
        const instanceState = analystInstances[i] || DEFAULT_INSTANCE_STATE;

        if (sourceData) {
            const history = instanceState.chatHistory || [];
            const hasExplicitKeywords = history.some(msg => msg.role === 'user' && /\b(generate|recreate)\b/i.test(msg.parts[0].text));
            
            const augmentedContext: MappingContext = {
                ...sourceData,
                aiStrategy: instanceState.layoutStrategy ? {
                    ...instanceState.layoutStrategy,
                    isExplicitIntent: hasExplicitKeywords
                } : undefined,
                previewUrl: undefined,
                targetDimensions: targetData ? { w: targetData.bounds.w, h: targetData.bounds.h } : undefined
            };
            
             registerResolved(id, `source-out-${i}`, augmentedContext);
        }

        if (targetData) {
            if (canvasDims.width === 0) {
                const edge = edges.find(e => e.target === id && e.targetHandle === `target-in-${i}`);
                if (edge) {
                    const t = templateRegistry[edge.source];
                    if (t) canvasDims = t.canvas;
                }
            }
            syntheticContainers.push({
                id: `proxy-target-${i}`,
                name: `target-out-${i}`, 
                originalName: targetData.name,
                bounds: targetData.bounds,
                normalized: {
                    x: canvasDims.width ? targetData.bounds.x / canvasDims.width : 0,
                    y: canvasDims.height ? targetData.bounds.y / canvasDims.height : 0,
                    w: canvasDims.width ? targetData.bounds.w / canvasDims.width : 0,
                    h: canvasDims.height ? targetData.bounds.h / canvasDims.height : 0,
                }
            });
        }
    }
    if (syntheticContainers.length > 0) {
        const syntheticTemplate: TemplateMetadata = {
            canvas: canvasDims.width > 0 ? canvasDims : { width: 1024, height: 1024 },
            containers: syntheticContainers
        };
        registerTemplate(id, syntheticTemplate);
    }
  }, [id, effectiveIndices, analystInstances, getSourceData, getTargetData, registerResolved, registerTemplate, edges, templateRegistry]);

  const addInstance = useCallback(() => {
    setNodes((nds) => nds.map((n) => {
        if (n.id === id) {
            return { ...n, data: { ...n.data, instanceCount: (n.data.instanceCount || 0) + 1 } };
        }
        return n;
    }));
  }, [id, setNodes]);

  const updateInstanceState = useCallback((index: number, updates: Partial<AnalystInstanceState>) => {
    setNodes((nds) => nds.map((n) => {
        if (n.id === id) {
            const currentInstances = n.data.analystInstances || {};
            const oldState = currentInstances[index] || DEFAULT_INSTANCE_STATE;
            return {
                ...n,
                data: {
                    ...n.data,
                    analystInstances: {
                        ...currentInstances,
                        [index]: { ...oldState, ...updates }
                    }
                }
            };
        }
        return n;
    }));
  }, [id, setNodes]);
  
  const handleReset = useCallback((index: number) => {
      updateInstanceState(index, DEFAULT_INSTANCE_STATE);
      flushPipelineInstance(id, `source-out-${index}`);
  }, [updateInstanceState, flushPipelineInstance, id]);

  const handleToggleMute = useCallback((index: number) => {
      const currentState = analystInstances[index]?.isKnowledgeMuted || false;
      updateInstanceState(index, { isKnowledgeMuted: !currentState });
  }, [analystInstances, updateInstanceState]);

  const generateDraft = async (prompt: string, sourceReference?: string): Promise<string | null> => {
     // Use ComfyUI for local image generation (returns null when disabled)
     const sourceUrl = sourceReference
         ? `data:image/png;base64,${sourceReference}`
         : undefined;
     return generateImageWithComfyUI(prompt, sourceUrl, {
         width: 256,
         height: 256,
         steps: 20
     });
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // STAGE 1: SOURCE COMPREHENSION
  // Deep understanding of the source composition before any layout decisions
  // ═══════════════════════════════════════════════════════════════════════════════
  const generateSourceComprehension = async (
    sourceImage: string,
    containerName: string,
    sourceW: number,
    sourceH: number,
    visibleLayerCount?: number
  ): Promise<SourceAnalysis> => {
    const comprehensionPrompt = `You are an expert visual analyst. Your task is to deeply understand this design composition BEFORE any layout decisions are made.

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
Container: "${containerName}" (${sourceW}x${sourceH}px)${visibleLayerCount ? `\nThis container has ${visibleLayerCount} visible content layers. Use this count to verify your element identification — make sure you identify ALL of them.` : ''}

OUTPUT FORMAT:
Respond with a JSON object matching the SourceAnalysis schema.
Focus on UNDERSTANDING, not layout decisions.`;

    const sourceAnalysisSchema: StructuredOutputSchema = {
      type: 'object',
      properties: {
        narrative: { type: 'string', description: 'What story/purpose does this convey?' },
        userExperience: { type: 'string', description: 'What is the user supposed to do/feel?' },
        primaryElements: { type: 'array', items: { type: 'string' }, description: 'Main characters/objects' },
        secondaryElements: { type: 'array', items: { type: 'string' }, description: 'Supporting elements' },
        backgroundElements: { type: 'array', items: { type: 'string' }, description: 'Background/decorative elements' },
        attentionOrder: { type: 'array', items: { type: 'string' }, description: 'What draws the eye: 1st, 2nd, 3rd...' },
        dominantElement: { type: 'string', description: 'Single most important element' },
        arrangement: { type: 'string', description: 'How elements are arranged' },
        arrangementRationale: { type: 'string', description: 'WHY this arrangement is effective' },
        keyRelationships: { type: 'array', items: { type: 'string' }, description: 'Spatial relationships that matter' },
        mustPreserve: { type: 'array', items: { type: 'string' }, description: 'What MUST be maintained' },
        canAdapt: { type: 'array', items: { type: 'string' }, description: 'What can be rearranged' },
        canScale: { type: 'array', items: { type: 'string' }, description: 'What can be scaled down' },
        semanticGroups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              anchor: { type: 'string', description: 'Main/larger element in the group' },
              companions: { type: 'array', items: { type: 'string' }, description: 'Smaller elements that should stay with the anchor' },
              relationship: { type: 'string', description: 'How they relate (e.g., "prize label on object")' }
            },
            required: ['anchor', 'companions', 'relationship']
          },
          description: 'Groups of elements that must move together (labels on objects, values with counters, etc.)'
        }
      },
      required: ['narrative', 'userExperience', 'primaryElements', 'secondaryElements', 'backgroundElements',
                 'attentionOrder', 'dominantElement', 'arrangement', 'arrangementRationale', 'keyRelationships',
                 'mustPreserve', 'canAdapt', 'canScale', 'semanticGroups']
    };

    console.log('[Analyst] Stage 1 Full Prompt:\n', comprehensionPrompt);

    const response = await generateCompletion({
      systemPrompt: 'You are a visual composition analyst. Analyze images deeply and output structured JSON.',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${sourceImage}`, detail: 'high' } },
          { type: 'text', text: comprehensionPrompt }
        ]
      }],
      responseSchema: sourceAnalysisSchema,
      maxTokens: 2048,
      temperature: 0.3
    });

    const rawJson = response.json || {};

    // Provide defaults for missing fields
    return {
      narrative: rawJson.narrative || 'Unable to determine narrative',
      userExperience: rawJson.userExperience || 'Unable to determine user experience',
      primaryElements: rawJson.primaryElements || [],
      secondaryElements: rawJson.secondaryElements || [],
      backgroundElements: rawJson.backgroundElements || [],
      attentionOrder: rawJson.attentionOrder || [],
      dominantElement: rawJson.dominantElement || 'unknown',
      arrangement: rawJson.arrangement || 'unknown arrangement',
      arrangementRationale: rawJson.arrangementRationale || 'unknown rationale',
      keyRelationships: rawJson.keyRelationships || [],
      mustPreserve: rawJson.mustPreserve || [],
      canAdapt: rawJson.canAdapt || [],
      canScale: rawJson.canScale || [],
      semanticGroups: rawJson.semanticGroups || []
    };
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // STAGE 3: SEMANTIC VERIFICATION
  // Cross-check layout result against original composition intent
  // ═══════════════════════════════════════════════════════════════════════════════
  const verifyLayoutSemantically = async (
    sourceAnalysis: SourceAnalysis,
    layoutStrategy: LayoutStrategy,
    sourceImage: string,
    targetW: number,
    targetH: number,
    sourceLayers?: { id: string; name: string; coords: { x: number; y: number; w: number; h: number } }[]
  ): Promise<VerificationResult> => {
    // Build layer dimension reference table so Stage 3 knows actual sizes
    const layerDimTable = sourceLayers && sourceLayers.length > 0
      ? `\nLAYER DIMENSIONS (for coordinate validation):\n${sourceLayers.map(l => `${l.id} ${l.name}: ${l.coords.w}x${l.coords.h} at (${l.coords.x},${l.coords.y})`).join('\n')}\n`
      : '';

    // Compact override summary (only key fields to save tokens) — include layer names for cross-referencing
    const layerNameMap = new Map((sourceLayers || []).map(l => [l.id, l.name]));
    const overrideSummary = (layoutStrategy.overrides || []).map(o =>
      `${o.layerId} (${layerNameMap.get(o.layerId) || '?'}): role=${o.layoutRole}, pos=(${Math.round(o.xOffset)},${Math.round(o.yOffset)}), scale=${o.individualScale?.toFixed(2) || '1.00'}${o.scaleX ? ` scaleXY=(${o.scaleX.toFixed(2)},${o.scaleY?.toFixed(2)})` : ''}`
    ).join('\n');

    const verificationPrompt = `You are a design QA specialist verifying a layout preserves the original composition.

ORIGINAL: ${sourceAnalysis.narrative}
Primary: ${sourceAnalysis.primaryElements.join(', ')}
Attention: ${sourceAnalysis.attentionOrder.join(' → ')}
Must preserve: ${sourceAnalysis.mustPreserve.join('; ')}

PROPOSED LAYOUT: Target ${targetW}x${targetH}, scale=${layoutStrategy.suggestedScale}x, mode=${layoutStrategy.spatialLayout || 'UNIFIED_FIT'}
${overrideSummary}
${layerDimTable}
VERIFY (YES/NO each):
1. Narrative preserved? Story still clear?
2. Hierarchy maintained? "${sourceAnalysis.dominantElement}" still dominates?
3. All elements visible? No cropping/off-screen? (Check: xOffset >= 0, yOffset >= 0, xOffset + layerWidth*scale <= ${targetW}, yOffset + layerHeight*scale <= ${targetH})
4. Visual balance? Evenly distributed?
5. Scale appropriate? Text readable?

IF ANY CHECK FAILS (passed=false), you MUST populate "correctedOverrides" — do NOT leave it empty.
For each corrected override: { layerId, xOffset, yOffset, individualScale, layoutRole }
An empty correctedOverrides with passed=false is INVALID output.
Provide correctedOverrides with ABSOLUTE xOffset/yOffset (from target top-left 0,0).
All coordinates must be >= 0 and fit within ${targetW}x${targetH}.

Output JSON: { "passed": bool, "issues": [...], "correctedOverrides": [...] (if needed), "confidenceScore": 0-1 }`;

    const verificationSchema: StructuredOutputSchema = {
      type: 'object',
      properties: {
        passed: { type: 'boolean' },
        narrativePreserved: { type: 'boolean' },
        hierarchyMaintained: { type: 'boolean' },
        allElementsVisible: { type: 'boolean' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['missing_element', 'hierarchy_violation', 'balance_issue', 'cropping', 'other'] },
              description: { type: 'string' },
              suggestedFix: { type: 'string' }
            },
            required: ['type', 'description', 'suggestedFix']
          }
        },
        correctedOverrides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              layerId: { type: 'string' },
              xOffset: { type: 'number' },
              yOffset: { type: 'number' },
              individualScale: { type: 'number' },
              layoutRole: { type: 'string', enum: ['flow', 'static', 'overlay', 'background'] },
              linkedAnchorId: { type: 'string' },
              citedRule: { type: 'string' }
            },
            required: ['layerId', 'xOffset', 'yOffset', 'individualScale']
          }
        },
        correctedScale: { type: 'number' },
        confidenceScore: { type: 'number' },
        verificationNotes: { type: 'string' }
      },
      required: ['passed', 'narrativePreserved', 'hierarchyMaintained', 'allElementsVisible', 'issues', 'confidenceScore', 'verificationNotes']
    };

    console.log('[Analyst] Stage 3 Full Prompt:\n', verificationPrompt);

    const response = await generateCompletion({
      systemPrompt: 'You are a design QA specialist verifying layout compositions. Output structured JSON.',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${sourceImage}`, detail: 'high' } },
          { type: 'text', text: verificationPrompt }
        ]
      }],
      responseSchema: verificationSchema,
      maxTokens: 2048,
      temperature: 0.2
    });

    const rawJson = response.json || {};
    console.log('[Analyst] Stage 3 Full Response:', rawJson);

    return {
      passed: rawJson.passed ?? false,
      narrativePreserved: rawJson.narrativePreserved ?? false,
      hierarchyMaintained: rawJson.hierarchyMaintained ?? false,
      allElementsVisible: rawJson.allElementsVisible ?? false,
      issues: rawJson.issues || [],
      correctedOverrides: rawJson.correctedOverrides,
      correctedScale: rawJson.correctedScale,
      confidenceScore: rawJson.confidenceScore ?? 0,
      verificationNotes: rawJson.verificationNotes || ''
    };
  };

  const generateSystemInstruction = (
    sourceData: any,
    targetData: any,
    effectiveRules: string | null,
    effectiveKnowledge: KnowledgeContext | null,
    sourceAnalysis?: SourceAnalysis  // Stage 1 comprehension result
  ) => {
    const sourceW = sourceData.container.bounds.w;
    const sourceH = sourceData.container.bounds.h;
    const targetW = targetData.bounds.w;
    const targetH = targetData.bounds.h;

    // Depth-limited flattening to prevent token explosion on nested containers
    // maxDepth=3 allows deeper nesting while avoiding explosion (24GB VRAM has headroom)
    const flattenLayers = (layers: SerializableLayer[], depth = 0, maxDepth = MAX_LAYER_DEPTH): any[] => {
        if (depth > maxDepth) return [];

        let flat: any[] = [];
        layers.forEach(l => {
            // Only include actual content layers + top-level groups (skip deep nested groups)
            if (l.type === 'layer' || depth <= 1) {
                let effectiveCoords = l.coords;

                if (l.type === 'group' && l.children && l.children.length > 0) {
                    const tightBounds = calculateGroupBounds(l.children);
                    if (tightBounds.w > 0 && tightBounds.h > 0) {
                         effectiveCoords = tightBounds;
                    }
                }

                flat.push({
                    id: l.id,
                    name: l.name,
                    type: l.type,
                    depth: depth,
                    relX: (effectiveCoords.x - sourceData.container.bounds.x) / sourceW,
                    relY: (effectiveCoords.y - sourceData.container.bounds.y) / sourceH,
                    absX: effectiveCoords.x,
                    absY: effectiveCoords.y,
                    width: effectiveCoords.w,
                    height: effectiveCoords.h,
                    childCount: l.children?.length ?? 0,
                    isVisible: l.isVisible !== false
                });
            }

            if (l.children && depth < maxDepth) {
                flat = flat.concat(flattenLayers(l.children, depth + 1, maxDepth));
            }
        });
        return flat;
    };

    const layerAnalysisData = flattenLayers(sourceData.layers as SerializableLayer[]);

    // Compute spatial proximity: for each layer, find the closest larger layer it overlaps with
    // This helps the AI detect companion elements (labels on objects, values near counters)
    const proximityMap = new Map<string, string>(); // small layer id -> anchor layer id
    for (const layer of layerAnalysisData) {
      if (!layer.isVisible) continue;
      const layerArea = layer.width * layer.height;
      let bestAnchor: { id: string; name: string; area: number } | null = null;

      for (const candidate of layerAnalysisData) {
        if (candidate.id === layer.id || !candidate.isVisible) continue;
        const candidateArea = candidate.width * candidate.height;
        // Candidate must be significantly larger (at least 1.5x area)
        if (candidateArea <= layerArea * 1.5) continue;

        // Check bounding box overlap
        const overlapX = Math.max(0,
          Math.min(layer.absX + layer.width, candidate.absX + candidate.width) -
          Math.max(layer.absX, candidate.absX));
        const overlapY = Math.max(0,
          Math.min(layer.absY + layer.height, candidate.absY + candidate.height) -
          Math.max(layer.absY, candidate.absY));
        const overlapArea = overlapX * overlapY;

        // Significant overlap: > 30% of the smaller layer's area
        if (overlapArea > layerArea * 0.3) {
          // Pick the smallest qualifying anchor (most specific parent)
          if (!bestAnchor || candidateArea < bestAnchor.area) {
            bestAnchor = { id: candidate.id, name: candidate.name, area: candidateArea };
          }
        }
      }

      if (bestAnchor) {
        proximityMap.set(layer.id, bestAnchor.id);
      }
    }

    const sourceRatio = sourceW / sourceH;
    const targetRatio = targetW / targetH;
    const isMismatch = Math.abs(sourceRatio - targetRatio) > ASPECT_RATIO_TOLERANCE;

    const getOrientation = (w: number, h: number) => w > h ? "Landscape" : (h > w ? "Portrait" : "Square");
    const sourceOrientation = getOrientation(sourceW, sourceH);
    const targetOrientation = getOrientation(targetW, targetH);
    const geometryContext = isMismatch
        ? `GEOMETRY SHIFT: ${sourceOrientation} -> ${targetOrientation}. You must RECOMPOSE the layout, not just scale it.`
        : `Geometry stable: similar aspect ratios.`;

    // Expert Designer Persona - Compact constraint-first design philosophy
    const expertPersona = `You are a Senior Art Director specializing in adaptive layout across aspect ratios.

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
`;

    // Visual Analysis Section (only used when Stage 1 comprehension is missing)
    const visualAnalysisSection = `
VISUAL ANALYSIS (REQUIRED):
Examine the source image. In "visualAnalysis" describe:
1. Every visual element (text, graphics, decorative, background)
2. Spatial arrangement (hierarchy, alignment, spacing)
3. Style (colors, typography, mood)
Be specific to THIS image, not generic.
`;

    // Knowledge Rules Section
    const knowledgeSection = effectiveRules ? `
MANDATORY DESIGN RULES (cite each in rulesApplied):
<RULES>
${effectiveRules}
</RULES>
Every override implementing a rule must include "citedRule". Uncited rules = invalid output.
` : '';

    // Visual Anchor Context Section
    const anchorSection = effectiveKnowledge?.visualAnchors?.length ? `
VISUAL ANCHORS: ${effectiveKnowledge.visualAnchors.length} reference image(s) follow. Match layout/spacing/style. Use anchorIndex in overrides.
` : '';

    // Layer Data Section (compact table format to save tokens)
    const layerRows = layerAnalysisData.slice(0, MAX_LAYERS_IN_PROMPT).map(l => {
      const vis = l.isVisible ? '' : ' [HIDDEN]';
      const near = proximityMap.has(l.id) ? ` near:${proximityMap.get(l.id)}` : '';
      return `${l.id} | ${l.name}${vis} | ${l.relX.toFixed(2)},${l.relY.toFixed(2)} | ${l.width}x${l.height} | ${l.type}${l.childCount > 0 ? ` (${l.childCount}ch)` : ''}${near}`;
    }).join('\n');
    const layerDataSection = `
LAYERS (${layerAnalysisData.length} total, showing ${Math.min(MAX_LAYERS_IN_PROMPT, layerAnalysisData.length)}):
CRITICAL: Use ONLY the first column (ID) as "layerId" in overrides. Do NOT use the Name column.
[HIDDEN] = invisible layer (skip or minimal override). "near:ID" = spatially overlaps that layer.
ID | Name | RelX,RelY | WxH | Type
${layerRows}
`;

    // Per-Layer Strategy Section (compact)
    const proportionalScale = Math.min(targetW/sourceW, targetH/sourceH);
    const perLayerSection = `
PER-LAYER OVERRIDES (one override per layer, NO EXCEPTIONS):

Role behaviors:
- "background": stretch to fill. scaleX=${(targetW/sourceW).toFixed(3)}, scaleY=${(targetH/sourceH).toFixed(3)}, xOffset=0, yOffset=0
- "flow": independent element with proportional positioning. scale=${proportionalScale.toFixed(3)}, position = relativePos × targetDims
- "static": edge-pinned UI. scale~1.0, use edgeAnchor {horizontal,vertical}
- "overlay": COMPANION element that MOVES WITH its parent. Set linkedAnchorId to the parent layer's ID.
  The overlay will be repositioned relative to its anchor automatically — just set same xOffset/yOffset as anchor.
  USE THIS for: labels on objects, values near counters, badges on items, captions with images.
  If a layer has "near:ID" in the layer table, it likely overlaps that layer and may be its companion.

SEMANTIC GROUPING RULE (CRITICAL):
When elements are visually paired (a label sits on/near an object), the SMALLER element must be "overlay" with
linkedAnchorId pointing to the LARGER element. This ensures they move together during layout recomposition.
Do NOT make both elements "flow" — they will be separated.

Source ${sourceW}x${sourceH} → Target ${targetW}x${targetH}
Proportional scale: ${proportionalScale.toFixed(3)}

Each override MUST have: layerId, layoutRole, xOffset, yOffset, individualScale.
layerId MUST be the ID from the first column of the layer table (e.g. "1.0", "1.8"), NOT the layer name.
Missing layers = INVALID OUTPUT.
`;

    // Constraint summary for the task header
    const constraintSummary = `CONSTRAINT SUMMARY:
- Target bounds: ${targetW}x${targetH}px (HARD LIMIT - content must fit)
${effectiveRules ? `- Design rules: ${effectiveRules.split('\n').filter(r => r.trim()).length} rules to apply (see MANDATORY DESIGN RULES)` : '- Design rules: None provided'}
${effectiveKnowledge?.visualAnchors?.length ? `- Visual anchors: ${effectiveKnowledge.visualAnchors.length} reference image(s) to match` : '- Visual anchors: None provided'}`;

    // SOURCE COMPREHENSION section (from Stage 1 analysis) - CONCISE version
    const semanticGroupsText = sourceAnalysis?.semanticGroups && sourceAnalysis.semanticGroups.length > 0
      ? `\nSEMANTIC GROUPS (elements that MUST move together — use "overlay" + linkedAnchorId):\n${sourceAnalysis.semanticGroups.map(g =>
          `  ${g.anchor} ← [${g.companions.join(', ')}] (${g.relationship})`
        ).join('\n')}\nMatch these groups to layer IDs in the table below. Companions → overlay role, linkedAnchorId = anchor's layer ID.\n`
      : '';

    const sourceComprehensionSection = sourceAnalysis && sourceAnalysis.primaryElements.length > 0 ? `
SOURCE ANALYSIS (from Stage 1 - use this, don't re-analyze):
- Primary elements: ${sourceAnalysis.primaryElements.join(', ')}
- Arrangement: ${sourceAnalysis.arrangement}
- Dominant: ${sourceAnalysis.dominantElement}
- Must preserve: ${sourceAnalysis.mustPreserve.join(', ') || 'all visible'}
${semanticGroupsText}
TASK: Adapt from ${sourceOrientation} (${sourceW}x${sourceH}) to ${targetOrientation} (${targetW}x${targetH})
${targetW > targetH ? 'Target is LANDSCAPE - spread elements horizontally.' : 'Target is PORTRAIT - stack elements vertically.'}

Your visualAnalysis must mention: ${sourceAnalysis.primaryElements.slice(0, 3).join(', ')}
` : '';

    // Constraint verification (compact)
    const constraintVerification = `
VERIFY BEFORE OUTPUT:
- All content visible (no cropping)? Fits in ${targetW}x${targetH}?
- Text centered? Visual balance? Geometry recomposed (not just scaled)?
- All rules cited? If ANY fails, adjust before responding.
`;

    const prompt = `${expertPersona}
TASK: "${sourceData.container.containerName}" (${sourceW}x${sourceH}) → "${targetData.name}" (${targetW}x${targetH})
${geometryContext}
${constraintSummary}
${sourceComprehensionSection}
${sourceAnalysis ? '' : visualAnalysisSection}
${knowledgeSection}
${anchorSection}
${layerDataSection}
${perLayerSection}
DECISIONS:
1. spatialLayout: "UNIFIED_FIT" (scale+center) | "STRETCH_FILL" (fill container) | "ABSOLUTE_PIN" (exact positions)
2. layoutMode: "STANDARD" | "GRID" | "DISTRIBUTE_HORIZONTAL" | "DISTRIBUTE_VERTICAL"
3. Classify each layer role: flow/static/overlay/background
4. suggestedScale: min scale so ALL content fits (account for padding rules)
5. overrides: one per layer with layerId, xOffset, yOffset, individualScale, layoutRole

TRIANGULATION: Verify against visual (image), knowledge (rules), metadata (layer names).
HIGH=3/3 agree, MEDIUM=2/3, LOW=0-1 (use geometric fallback).
${constraintVerification}
OUTPUT: method, spatialLayout, suggestedScale, overrides (ALL layers), rulesApplied. Keep visualAnalysis and reasoning BRIEF (1-2 sentences max).
IMPORTANT: Output the "overrides" array EARLY in your JSON — it is the CRITICAL output. Do not write long text before overrides.
Think: 1) What's here? 2) How to arrange in ${targetW}x${targetH}? 3) What scale fits all? 4) Nothing cropped?`;

    return prompt;
  };

  const performAnalysis = async (index: number, history: ChatMessage[]) => {
      const sourceData = getSourceData(index);
      const targetData = getTargetData(index);
      if (!sourceData || !targetData) return;

      const instanceState = analystInstances[index] || DEFAULT_INSTANCE_STATE;
      const isMuted = instanceState.isKnowledgeMuted || false;

      const targetName = targetData.name.toUpperCase();
      const globalRules = scopes['GLOBAL CONTEXT'] || [];
      const specificRules = scopes[targetName] || [];

      const effectiveRules = (!isMuted && activeKnowledge)
          ? [...globalRules, ...specificRules].join('\n')
          : null;

      const effectiveKnowledge = (!isMuted && activeKnowledge) ? activeKnowledge : null;

      setAnalyzingInstances(prev => ({ ...prev, [index]: true }));
      setInstanceErrors(prev => ({ ...prev, [index]: null }));
      setAnalysisStages(prev => ({ ...prev, [index]: 'comprehension' }));

      try {
        // Extract source pixels once for all stages
        const sourcePixelsBase64 = await extractSourcePixels(sourceData.layers as SerializableLayer[], sourceData.container.bounds);
        const base64Clean = sourcePixelsBase64 ? sourcePixelsBase64.split(',')[1] : '';

        // --- Reusable layer flattener (used by reconciliation, fallback defaults, and Stage 1 count) ---
        const flattenLayerIds = (layers: SerializableLayer[], depth = 0, maxDepth = MAX_LAYER_DEPTH): { id: string; name: string; coords: any; isVisible: boolean; }[] => {
            if (depth > maxDepth) return [];
            let result: { id: string; name: string; coords: any; isVisible: boolean; }[] = [];
            for (const layer of layers) {
                if (layer.type === 'layer' || depth <= 1) {
                    result.push({ id: layer.id, name: layer.name, coords: layer.coords, isVisible: layer.isVisible !== false });
                }
                if (layer.children && depth < maxDepth) {
                    result = result.concat(flattenLayerIds(layer.children, depth + 1, maxDepth));
                }
            }
            return result;
        };
        const allLayers = flattenLayerIds(sourceData.layers as SerializableLayer[]);
        const visibleLayerCount = allLayers.filter(l => l.isVisible).length;

        // ═══════════════════════════════════════════════════════════════════════════════
        // STAGE 1: SOURCE COMPREHENSION
        // Deep understanding of the source composition before any layout decisions
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('[Analyst] Stage 1: Source Comprehension');
        let sourceAnalysis: SourceAnalysis | undefined;

        if (base64Clean) {
          sourceAnalysis = await generateSourceComprehension(
            base64Clean,
            sourceData.container.containerName,
            sourceData.container.bounds.w,
            sourceData.container.bounds.h,
            visibleLayerCount
          );
          console.log('[Analyst] Stage 1 Response (Source comprehension):', sourceAnalysis);
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // STAGE 2: LAYOUT GENERATION
        // Use comprehension to guide intelligent layout decisions
        // ═══════════════════════════════════════════════════════════════════════════════
        setAnalysisStages(prev => ({ ...prev, [index]: 'layout' }));
        console.log('[Analyst] Stage 2: Layout Generation');

        const systemInstruction = generateSystemInstruction(sourceData, targetData, effectiveRules, effectiveKnowledge, sourceAnalysis);
        console.log('[Analyst] Stage 2 System Prompt (' + systemInstruction.length + ' chars):\n', systemInstruction);

        // Build messages in provider-agnostic format
        const messages: { role: 'user' | 'assistant'; content: ContentPart[] }[] = [];

        for (const msg of history) {
            const content: ContentPart[] = [];

            // For the last user message, inject images
            // IMPORTANT: Source image is prioritized first to ensure it's always included
            // Visual anchors are added after, but may be skipped by aiProviderService
            // to avoid GGML tensor dimension errors in Ollama 0.13+ (MAX_IMAGES_PER_REQUEST limit)
            if (msg.role === 'user' && msg === history[history.length - 1]) {
                // Add source container image (primary visual context)
                if (sourcePixelsBase64) {
                    const base64Clean = sourcePixelsBase64.split(',')[1];
                    content.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${base64Clean}`,
                            detail: 'high'
                        }
                    });
                    content.push({
                        type: 'text',
                        text: 'INPUT SOURCE CONTEXT (Visual Representation of the Layers provided in JSON):'
                    });
                }

                // Add visual anchors from knowledge for style reference
                if (effectiveKnowledge?.visualAnchors) {
                    for (let idx = 0; idx < effectiveKnowledge.visualAnchors.length; idx++) {
                        const anchor = effectiveKnowledge.visualAnchors[idx];
                        content.push({ type: 'text', text: `[VISUAL_ANCHOR_${idx}]` });
                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:${anchor.mimeType};base64,${anchor.data}`,
                                detail: 'high'
                            }
                        });
                    }
                    if (effectiveKnowledge.visualAnchors.length > 0) {
                        content.push({
                            type: 'text',
                            text: 'REFERENCED VISUAL ANCHORS (Strict Style & Layout Adherence Required. Reference by index in anchorIndex):'
                        });
                    }
                }
            }

            // Add the actual message text
            const msgText = msg.parts?.[0]?.text || '';
            if (msgText) {
                content.push({ type: 'text', text: msgText });
            }

            messages.push({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content
            });
        }

        // Define JSON Schema for structured output
        const responseSchema: StructuredOutputSchema = {
            type: 'object',
            properties: {
                visualAnalysis: { type: 'string' },
                rulesApplied: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            rule: { type: 'string' },
                            application: { type: 'string' }
                        },
                        required: ['rule', 'application']
                    }
                },
                reasoning: { type: 'string' },
                method: { type: 'string', enum: ['GEOMETRIC', 'GENERATIVE', 'HYBRID'] },
                spatialLayout: { type: 'string', enum: ['STRETCH_FILL', 'UNIFIED_FIT', 'ABSOLUTE_PIN'] },
                suggestedScale: { type: 'number' },
                anchor: { type: 'string', enum: ['TOP', 'CENTER', 'BOTTOM', 'STRETCH'] },
                generativePrompt: { type: 'string' },
                semanticAnchors: { type: 'array', items: { type: 'string' } },
                clearance: { type: 'boolean' },
                knowledgeApplied: { type: 'boolean' },
                directives: { type: 'array', items: { type: 'string' } },
                replaceLayerId: { type: 'string' },
                triangulation: {
                    type: 'object',
                    properties: {
                        visual_identification: { type: 'string' },
                        knowledge_correlation: { type: 'string' },
                        metadata_validation: { type: 'string' },
                        evidence_count: { type: 'number' },
                        confidence_verdict: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] }
                    },
                    required: ['visual_identification', 'knowledge_correlation', 'metadata_validation', 'evidence_count', 'confidence_verdict']
                },
                layoutMode: { type: 'string', enum: ['STANDARD', 'DISTRIBUTE_HORIZONTAL', 'DISTRIBUTE_VERTICAL', 'GRID'] },
                physicsRules: {
                    type: 'object',
                    properties: {
                        preventOverlap: { type: 'boolean' },
                        preventClipping: { type: 'boolean' }
                    }
                },
                overrides: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            layerId: { type: 'string' },
                            xOffset: { type: 'number' },
                            yOffset: { type: 'number' },
                            individualScale: { type: 'number' },
                            scaleX: { type: 'number' },
                            scaleY: { type: 'number' },
                            citedRule: { type: 'string' },
                            anchorIndex: { type: 'integer' },
                            layoutRole: { type: 'string', enum: ['flow', 'static', 'overlay', 'background'] },
                            linkedAnchorId: { type: 'string' },
                            edgeAnchor: {
                                type: 'object',
                                properties: {
                                    horizontal: { type: 'string', enum: ['left', 'center', 'right'] },
                                    vertical: { type: 'string', enum: ['top', 'center', 'bottom'] }
                                }
                            }
                        },
                        required: ['layerId', 'layoutRole', 'xOffset', 'yOffset']
                    }
                },
                safetyReport: {
                    type: 'object',
                    properties: {
                        allowedBleed: { type: 'boolean' },
                        violationCount: { type: 'integer' }
                    },
                    required: ['allowedBleed', 'violationCount']
                }
            },
            // Only require critical fields — verbose text fields are optional to prevent token exhaustion
            // before the model can output the overrides array (the most important data)
            required: ['method', 'spatialLayout', 'suggestedScale', 'anchor', 'overrides',
                       'rulesApplied', 'clearance', 'knowledgeApplied']
        };

        // Log Stage 2 user messages (text parts only, images omitted for readability)
        console.log('[Analyst] Stage 2 User Messages:', messages.map(m => ({
            role: m.role,
            textParts: m.content.filter(c => c.type === 'text').map(c => (c as any).text),
            imageCount: m.content.filter(c => c.type === 'image_url').length
        })));

        // Call unified AI provider
        const response = await generateCompletion({
            systemPrompt: systemInstruction,
            messages,
            responseSchema,
            maxTokens: 8192,
            temperature: 0.7
        });

        const rawJson = response.json || {};

        // Validate and provide defaults for required properties
        const json = {
            visualAnalysis: rawJson.visualAnalysis || '',
            rulesApplied: rawJson.rulesApplied || [],
            method: rawJson.method || 'GEOMETRIC',
            spatialLayout: rawJson.spatialLayout || 'UNIFIED_FIT',
            suggestedScale: rawJson.suggestedScale ?? 1,
            anchor: rawJson.anchor || 'CENTER',
            generativePrompt: rawJson.generativePrompt || '',
            semanticAnchors: rawJson.semanticAnchors || [],
            clearance: rawJson.clearance ?? false,
            knowledgeApplied: rawJson.knowledgeApplied ?? false,
            directives: rawJson.directives || [],
            replaceLayerId: rawJson.replaceLayerId || '',
            triangulation: rawJson.triangulation || null,
            overrides: rawJson.overrides || [],
            safetyReport: rawJson.safetyReport || { allowedBleed: false, violationCount: 0 },
            reasoning: rawJson.reasoning || '',
            layoutMode: rawJson.layoutMode,
            physicsRules: rawJson.physicsRules,
            sourceReference: undefined as string | undefined,
            forceGeometryChange: false,
            knowledgeMuted: false,
        };

        // --- NAME-TO-ID RECONCILIATION (Step 2) ---
        // AI sometimes uses layer NAMES as layerId instead of actual path IDs.
        // Partition overrides: id-based (valid) vs orphaned (layerId not in allLayers).
        // Resolve orphans via name matching, merge semantic fields over positional ones.
        {
            const idSet = new Set(allLayers.map(l => l.id));
            const nameToLayers = new Map<string, { id: string; name: string }[]>();
            for (const l of allLayers) {
                const existing = nameToLayers.get(l.name) || [];
                existing.push({ id: l.id, name: l.name });
                nameToLayers.set(l.name, existing);
            }
            // Case-insensitive index (only unique lower-case names)
            const lowerNameToLayers = new Map<string, { id: string; name: string }[]>();
            for (const l of allLayers) {
                const key = l.name.toLowerCase();
                const existing = lowerNameToLayers.get(key) || [];
                existing.push({ id: l.id, name: l.name });
                lowerNameToLayers.set(key, existing);
            }

            const idBasedMap = new Map<string, LayerOverride>();
            const orphaned: LayerOverride[] = [];
            for (const ov of json.overrides as LayerOverride[]) {
                if (idSet.has(ov.layerId)) {
                    idBasedMap.set(ov.layerId, ov);
                } else {
                    orphaned.push(ov);
                }
            }

            let remapped = 0, merged = 0, discarded = 0;
            for (const ov of orphaned) {
                let resolvedId: string | null = null;
                // Try exact name match (unique names only)
                const exactMatch = nameToLayers.get(ov.layerId);
                if (exactMatch && exactMatch.length === 1) {
                    resolvedId = exactMatch[0].id;
                }
                // Fallback: case-insensitive name match (unique only)
                if (!resolvedId) {
                    const ciMatch = lowerNameToLayers.get(ov.layerId.toLowerCase());
                    if (ciMatch && ciMatch.length === 1) {
                        resolvedId = ciMatch[0].id;
                    }
                }

                if (resolvedId) {
                    const existing = idBasedMap.get(resolvedId);
                    if (existing) {
                        // Merge: keep ID-based positional fields, take name-based semantic fields
                        if (ov.layoutRole) existing.layoutRole = ov.layoutRole;
                        if (ov.edgeAnchor) existing.edgeAnchor = ov.edgeAnchor;
                        if (ov.linkedAnchorId) existing.linkedAnchorId = ov.linkedAnchorId;
                        if (ov.citedRule) existing.citedRule = ov.citedRule;
                        merged++;
                    } else {
                        // Remap: use real ID, keep all fields
                        ov.layerId = resolvedId;
                        idBasedMap.set(resolvedId, ov);
                        remapped++;
                    }
                } else {
                    console.warn(`[Analyst] Discarding unresolvable override: layerId="${ov.layerId}" (not a valid ID or unique name)`);
                    discarded++;
                }
            }

            // Also reconcile linkedAnchorId fields that may reference names instead of IDs
            for (const [, ov] of idBasedMap) {
                if (ov.linkedAnchorId && !idSet.has(ov.linkedAnchorId)) {
                    const anchorMatch = nameToLayers.get(ov.linkedAnchorId);
                    if (anchorMatch && anchorMatch.length === 1) {
                        ov.linkedAnchorId = anchorMatch[0].id;
                    } else {
                        const ciMatch = lowerNameToLayers.get(ov.linkedAnchorId.toLowerCase());
                        if (ciMatch && ciMatch.length === 1) {
                            ov.linkedAnchorId = ciMatch[0].id;
                        }
                    }
                }
            }

            json.overrides = Array.from(idBasedMap.values());
            if (remapped > 0 || merged > 0 || discarded > 0) {
                console.log(`[Analyst] Override reconciliation: ${remapped} remapped, ${merged} merged, ${discarded} discarded`);
            }
        }

        // --- PER-LAYER OVERRIDE VALIDATION ---
        // Ensure every layer has an override (generate defaults for missing layers)
        const overrideLayerIds = new Set((json.overrides || []).map((o: LayerOverride) => o.layerId));
        const missingLayers = allLayers.filter(l => !overrideLayerIds.has(l.id));

        if (missingLayers.length > 0) {
            console.log(`[Analyst] Missing overrides for ${missingLayers.length} layers, generating defaults`);
            const sourceW = sourceData.container.bounds.w;
            const sourceH = sourceData.container.bounds.h;
            const sourceX = sourceData.container.bounds.x;
            const sourceY = sourceData.container.bounds.y;
            const tgtW = targetData.bounds.w;
            const tgtH = targetData.bounds.h;
            const proportionalScale = Math.min(tgtW / sourceW, tgtH / sourceH);

            // Detect geometry shift direction for smart redistribution
            const srcRatio = sourceW / sourceH;
            const tgtRatio = tgtW / tgtH;
            const isGeometryShift = Math.abs(srcRatio - tgtRatio) > ASPECT_RATIO_TOLERANCE;
            const isPortraitToLandscape = isGeometryShift && sourceH > sourceW && tgtW > tgtH;
            const isLandscapeToPortrait = isGeometryShift && sourceW > sourceH && tgtH > tgtW;

            // Collect VISIBLE flow layers for redistribution when geometry shifts
            // Invisible layers (e.g. !FONT) must not participate in gap calculations
            const flowLayers = missingLayers.filter(l => {
                if (!l.isVisible) return false;
                const role = inferLayoutRoleFromName(l.name);
                return role === 'flow' || role === 'overlay';
            });

            // --- SPATIAL PROXIMITY DETECTION ---
            // Detect companion elements (labels on objects, values near counters) via bbox overlap.
            // Companions become 'overlay' with linkedAnchorId so they move with their parent.
            // Computed on ALL layers so a missing companion can reference an AI-overridden anchor.
            const fallbackProximity = new Map<string, string>(); // companion id -> anchor id
            for (const layer of allLayers) {
                if (!layer.isVisible) continue;
                const role = inferLayoutRoleFromName(layer.name);
                if (role === 'background') continue;

                const layerArea = layer.coords.w * layer.coords.h;
                let bestAnchor: { id: string; area: number } | null = null;

                for (const candidate of allLayers) {
                    if (candidate.id === layer.id || !candidate.isVisible) continue;
                    const candRole = inferLayoutRoleFromName(candidate.name);
                    if (candRole === 'background') continue;

                    const candidateArea = candidate.coords.w * candidate.coords.h;
                    // Anchor must be significantly larger (at least 1.5x area)
                    if (candidateArea <= layerArea * 1.5) continue;

                    // Check bounding box overlap
                    const overlapX = Math.max(0,
                        Math.min(layer.coords.x + layer.coords.w, candidate.coords.x + candidate.coords.w) -
                        Math.max(layer.coords.x, candidate.coords.x));
                    const overlapY = Math.max(0,
                        Math.min(layer.coords.y + layer.coords.h, candidate.coords.y + candidate.coords.h) -
                        Math.max(layer.coords.y, candidate.coords.y));
                    const overlapArea = overlapX * overlapY;

                    // Significant overlap: > 30% of the smaller layer's area
                    if (overlapArea > layerArea * 0.3) {
                        // Pick the smallest qualifying anchor (most specific parent)
                        if (!bestAnchor || candidateArea < bestAnchor.area) {
                            bestAnchor = { id: candidate.id, area: candidateArea };
                        }
                    }
                }

                if (bestAnchor) {
                    fallbackProximity.set(layer.id, bestAnchor.id);
                }
            }

            // Exclude companion layers from redistribution — they'll be placed by overlay solver
            const independentFlowLayers = flowLayers.filter(l => !fallbackProximity.has(l.id));

            // --- REDISTRIBUTION BAND DETECTION ---
            // Not all flow layers belong in the same horizontal/vertical redistribution.
            // Wide spanning elements (titles, headers) should keep proportional centering.
            // Only elements at similar vertical positions form a redistribution band.
            const SPANNING_THRESHOLD = 0.5; // element wider than 50% of source = spanning
            const BAND_THRESHOLD = 0.25;    // Y-center must be within 25% of source height to be same band

            const redistributableLayers: typeof independentFlowLayers = [];
            const spanningLayers: typeof independentFlowLayers = [];

            if (isPortraitToLandscape && independentFlowLayers.length > 1) {
                // Find the vertical band with the most elements (the "main row")
                const withCenter = independentFlowLayers.map(l => ({
                    layer: l,
                    cx: (l.coords.x + l.coords.w / 2 - sourceX) / sourceW,
                    cy: (l.coords.y + l.coords.h / 2 - sourceY) / sourceH,
                    widthRatio: l.coords.w / sourceW,
                }));
                // Wide spanning elements never redistribute
                const nonSpanning = withCenter.filter(e => e.widthRatio <= SPANNING_THRESHOLD);
                const spanning = withCenter.filter(e => e.widthRatio > SPANNING_THRESHOLD);
                spanning.forEach(e => spanningLayers.push(e.layer));

                if (nonSpanning.length > 1) {
                    // Cluster by Y-center: find the Y-center with the most neighbors
                    let bestBandY = nonSpanning[0].cy;
                    let bestCount = 0;
                    for (const e of nonSpanning) {
                        const count = nonSpanning.filter(o => Math.abs(o.cy - e.cy) < BAND_THRESHOLD).length;
                        if (count > bestCount) { bestCount = count; bestBandY = e.cy; }
                    }
                    for (const e of nonSpanning) {
                        if (Math.abs(e.cy - bestBandY) < BAND_THRESHOLD) {
                            redistributableLayers.push(e.layer);
                        } else {
                            spanningLayers.push(e.layer); // Outside main band → proportional
                        }
                    }
                } else {
                    nonSpanning.forEach(e => spanningLayers.push(e.layer));
                }
            } else if (isLandscapeToPortrait && independentFlowLayers.length > 1) {
                // Mirror: tall spanning elements and horizontal band detection
                const withCenter = independentFlowLayers.map(l => ({
                    layer: l,
                    cx: (l.coords.x + l.coords.w / 2 - sourceX) / sourceW,
                    cy: (l.coords.y + l.coords.h / 2 - sourceY) / sourceH,
                    heightRatio: l.coords.h / sourceH,
                }));
                const nonSpanning = withCenter.filter(e => e.heightRatio <= SPANNING_THRESHOLD);
                const spanning = withCenter.filter(e => e.heightRatio > SPANNING_THRESHOLD);
                spanning.forEach(e => spanningLayers.push(e.layer));

                if (nonSpanning.length > 1) {
                    let bestBandX = nonSpanning[0].cx;
                    let bestCount = 0;
                    for (const e of nonSpanning) {
                        const count = nonSpanning.filter(o => Math.abs(o.cx - e.cx) < BAND_THRESHOLD).length;
                        if (count > bestCount) { bestCount = count; bestBandX = e.cx; }
                    }
                    for (const e of nonSpanning) {
                        if (Math.abs(e.cx - bestBandX) < BAND_THRESHOLD) {
                            redistributableLayers.push(e.layer);
                        } else {
                            spanningLayers.push(e.layer);
                        }
                    }
                } else {
                    nonSpanning.forEach(e => spanningLayers.push(e.layer));
                }
            }

            if (spanningLayers.length > 0) {
                console.log(`[Analyst] Redistribution: ${redistributableLayers.length} row items, ${spanningLayers.length} spanning/outlier (proportional):`,
                    spanningLayers.map(l => l.name).join(', '));
            }

            if (fallbackProximity.size > 0) {
                console.log(`[Analyst] Spatial proximity detected ${fallbackProximity.size} companion layers:`,
                    Array.from(fallbackProximity.entries()).map(([comp, anch]) => `${comp}→${anch}`).join(', '));
            }

            for (const layer of missingLayers) {
                const role = inferLayoutRoleFromName(layer.name);
                const relX = (layer.coords.x - sourceX) / sourceW;
                const relY = (layer.coords.y - sourceY) / sourceH;

                let override: LayerOverride;
                // Invisible layers get simple proportional placement — don't participate in redistribution
                if (!layer.isVisible) {
                    override = {
                        layerId: layer.id,
                        layoutRole: role,
                        xOffset: relX * tgtW,
                        yOffset: relY * tgtH,
                        individualScale: proportionalScale,
                    };
                    json.overrides.push(override);
                    continue;
                }
                // Companion layers (spatially overlapping a larger element) become overlays
                // The Remapper overlay solver will position them relative to their anchor
                const anchorLayerId = fallbackProximity.get(layer.id);
                if (anchorLayerId && role !== 'background' && role !== 'static') {
                    override = {
                        layerId: layer.id,
                        layoutRole: 'overlay',
                        linkedAnchorId: anchorLayerId,
                        xOffset: relX * tgtW,  // Initial position; overridden by Remapper overlay solver
                        yOffset: relY * tgtH,
                        individualScale: proportionalScale,
                    };
                    json.overrides.push(override);
                    continue;
                }
                if (role === 'background') {
                    // Stretch to fill
                    override = {
                        layerId: layer.id,
                        layoutRole: 'background',
                        xOffset: 0,
                        yOffset: 0,
                        individualScale: 1,
                        scaleX: tgtW / layer.coords.w,
                        scaleY: tgtH / layer.coords.h,
                    };
                } else if (role === 'static') {
                    // Pin to edges with proportional positioning
                    override = {
                        layerId: layer.id,
                        layoutRole: 'static',
                        xOffset: relX * tgtW,
                        yOffset: relY * tgtH,
                        individualScale: 1,
                        edgeAnchor: {
                            horizontal: relX < 0.33 ? 'left' : (relX > 0.66 ? 'right' : 'center'),
                            vertical: relY < 0.33 ? 'top' : (relY > 0.66 ? 'bottom' : 'center'),
                        },
                    };
                } else if ((isPortraitToLandscape || isLandscapeToPortrait) && redistributableLayers.length > 1) {
                    // Geometry-shift-aware redistribution for row items only.
                    // Spanning/outlier elements get proportional centered positioning.
                    const flowIndex = redistributableLayers.indexOf(layer);
                    if (flowIndex === -1) {
                        // Not in redistribution band — proportional positioning preserving source center
                        const centerX = (layer.coords.x + layer.coords.w / 2 - sourceX) / sourceW;
                        const centerY = (layer.coords.y + layer.coords.h / 2 - sourceY) / sourceH;
                        override = {
                            layerId: layer.id,
                            layoutRole: role,
                            xOffset: Math.max(0, centerX * tgtW - layer.coords.w * proportionalScale / 2),
                            yOffset: Math.max(0, centerY * tgtH - layer.coords.h * proportionalScale / 2),
                            individualScale: proportionalScale,
                        };
                    } else if (isPortraitToLandscape) {
                        // Portrait→Landscape: distribute row items horizontally
                        const heightScale = tgtH / sourceH;
                        let fitScale = Math.min(heightScale, proportionalScale * 1.2); // Allow slightly larger than proportional
                        let totalFlowWidth = redistributableLayers.reduce((sum, l) => sum + l.coords.w * fitScale, 0);
                        const availableWidth = tgtW;
                        // If content exceeds available space, shrink to fit with margin for gaps
                        if (totalFlowWidth > availableWidth * 0.9) {
                            fitScale = fitScale * (availableWidth * 0.85) / totalFlowWidth;
                            totalFlowWidth = redistributableLayers.reduce((sum, l) => sum + l.coords.w * fitScale, 0);
                        }
                        const gapTotal = availableWidth - totalFlowWidth;
                        const gap = Math.max(0, gapTotal / (redistributableLayers.length + 1));
                        // Calculate cumulative x position
                        let cumulativeX = gap;
                        for (let i = 0; i < flowIndex; i++) {
                            cumulativeX += redistributableLayers[i].coords.w * fitScale + gap;
                        }
                        override = {
                            layerId: layer.id,
                            layoutRole: role,
                            xOffset: Math.max(0, cumulativeX),
                            yOffset: (tgtH - layer.coords.h * fitScale) / 2, // vertically center
                            individualScale: fitScale,
                        };
                    } else {
                        // Landscape→Portrait: distribute row items vertically
                        const widthScale = tgtW / sourceW;
                        let fitScale = Math.min(widthScale, proportionalScale * 1.2);
                        let totalFlowHeight = redistributableLayers.reduce((sum, l) => sum + l.coords.h * fitScale, 0);
                        const availableHeight = tgtH;
                        // If content exceeds available space, shrink to fit with margin for gaps
                        if (totalFlowHeight > availableHeight * 0.9) {
                            fitScale = fitScale * (availableHeight * 0.85) / totalFlowHeight;
                            totalFlowHeight = redistributableLayers.reduce((sum, l) => sum + l.coords.h * fitScale, 0);
                        }
                        const gapTotal = availableHeight - totalFlowHeight;
                        const gap = Math.max(0, gapTotal / (redistributableLayers.length + 1));
                        let cumulativeY = gap;
                        for (let i = 0; i < flowIndex; i++) {
                            cumulativeY += redistributableLayers[i].coords.h * fitScale + gap;
                        }
                        override = {
                            layerId: layer.id,
                            layoutRole: role,
                            xOffset: (tgtW - layer.coords.w * fitScale) / 2, // horizontally center
                            yOffset: Math.max(0, cumulativeY),
                            individualScale: fitScale,
                        };
                    }
                } else {
                    // Flow - proportional scaling and positioning (no geometry shift)
                    override = {
                        layerId: layer.id,
                        layoutRole: role,
                        xOffset: relX * tgtW,
                        yOffset: relY * tgtH,
                        individualScale: proportionalScale,
                    };
                }
                json.overrides.push(override);
            }
            console.log(`[Analyst] Total overrides after defaults: ${json.overrides.length}${isGeometryShift ? ` (geometry-shift redistribution: ${isPortraitToLandscape ? 'P→L horizontal' : isLandscapeToPortrait ? 'L→P vertical' : 'none'})` : ''}`);
        }

        // --- GEOMETRY FLAG INJECTION ---
        // Calculate ratio difference to flag the payload
        const sourceRatio = sourceData.container.bounds.w / sourceData.container.bounds.h;
        const targetRatio = targetData.bounds.w / targetData.bounds.h;
        json.forceGeometryChange = Math.abs(sourceRatio - targetRatio) > ASPECT_RATIO_TOLERANCE;

        if ((json.method === 'GENERATIVE' || json.method === 'HYBRID') && json.replaceLayerId) {
             const isolatedTexture = await extractSourcePixels(
                 sourceData.layers as SerializableLayer[], 
                 sourceData.container.bounds,
                 json.replaceLayerId
             );
             if (isolatedTexture) {
                 json.sourceReference = isolatedTexture.split(',')[1];
             } else {
                 if (sourcePixelsBase64) json.sourceReference = sourcePixelsBase64.split(',')[1];
             }
        } else if (json.method === 'GENERATIVE' || json.method === 'HYBRID') {
             if (sourcePixelsBase64) {
                 json.sourceReference = sourcePixelsBase64.split(',')[1];
             }
        }
        
        if (isMuted) json.knowledgeMuted = true;

        // Debug: Log full Stage 2 response
        console.log('[Analyst] Stage 2 Full Response:', json);

        // ═══════════════════════════════════════════════════════════════════════════════
        // STAGE 3: SEMANTIC VERIFICATION
        // Cross-check layout result against original composition intent
        // ═══════════════════════════════════════════════════════════════════════════════
        let finalStrategy = json;

        if (sourceAnalysis && base64Clean) {
          setAnalysisStages(prev => ({ ...prev, [index]: 'verification' }));
          console.log('[Analyst] Stage 3: Semantic Verification');

          try {
            const verification = await verifyLayoutSemantically(
              sourceAnalysis,
              json as LayoutStrategy,
              base64Clean,
              targetData.bounds.w,
              targetData.bounds.h,
              allLayers
            );

            console.log('[Analyst] Verification result:', {
              passed: verification.passed,
              narrativePreserved: verification.narrativePreserved,
              hierarchyMaintained: verification.hierarchyMaintained,
              allElementsVisible: verification.allElementsVisible,
              issueCount: verification.issues.length,
              confidence: verification.confidenceScore
            });

            // Apply corrections if verification failed and corrections are provided
            // MERGE corrections over existing overrides instead of full replacement
            if (!verification.passed && verification.correctedOverrides && verification.correctedOverrides.length > 0) {
              console.log('[Analyst] Merging verification corrections:', verification.correctedOverrides.length, 'override corrections over', json.overrides.length, 'existing');
              const correctionMap = new Map<string, LayerOverride>();
              for (const corr of verification.correctedOverrides) {
                correctionMap.set(corr.layerId, corr);
              }
              // Merge: Stage 3 corrections override Stage 2 values per-layer, uncorrected layers keep Stage 2 values
              const mergedOverrides = json.overrides.map((existing: LayerOverride) => {
                const correction = correctionMap.get(existing.layerId);
                if (correction) {
                  return { ...existing, ...correction }; // correction fields overwrite existing
                }
                return existing;
              });
              // Add any corrections for layers not in Stage 2 (shouldn't normally happen)
              for (const [layerId, corr] of correctionMap) {
                if (!json.overrides.some((o: LayerOverride) => o.layerId === layerId)) {
                  mergedOverrides.push(corr);
                }
              }
              // Clamp all coordinates to target bounds — reject off-screen positions
              const tW = targetData.bounds.w;
              const tH = targetData.bounds.h;
              let clampedCount = 0;
              for (const ov of mergedOverrides) {
                if (ov.layoutRole === 'background') continue; // backgrounds always at 0,0
                const origX = ov.xOffset;
                const origY = ov.yOffset;
                ov.xOffset = Math.max(0, Math.min(ov.xOffset, tW));
                ov.yOffset = Math.max(0, Math.min(ov.yOffset, tH));
                if (origX !== ov.xOffset || origY !== ov.yOffset) clampedCount++;
              }
              if (clampedCount > 0) {
                console.log(`[Analyst] Clamped ${clampedCount} overrides to target bounds ${tW}x${tH}`);
              }

              finalStrategy = {
                ...json,
                overrides: mergedOverrides,
                suggestedScale: verification.correctedScale ?? json.suggestedScale,
                reasoning: json.reasoning + '\n\n[STAGE 3 VERIFICATION CORRECTIONS MERGED]\n' +
                  verification.issues.map(i => `- ${i.type}: ${i.description}`).join('\n')
              };
            } else if (!verification.passed) {
              console.log('[Analyst] Verification failed but no corrections provided:', verification.issues);
              finalStrategy = {
                ...json,
                reasoning: json.reasoning + '\n\n[STAGE 3 VERIFICATION WARNINGS]\n' +
                  verification.issues.map(i => `- ${i.type}: ${i.description} (Suggested: ${i.suggestedFix})`).join('\n')
              };
            }
          } catch (verifyError) {
            console.warn('[Analyst] Stage 3 verification failed, using Stage 2 result:', verifyError);
            // Continue with Stage 2 result if verification fails
          }
        }

        setAnalysisStages(prev => ({ ...prev, [index]: 'complete' }));

        // Create stripped version for persistence (removes base64 image data to prevent file bloat)
        // sourceReference can be 20MB+ and would be stored in both chatHistory and layoutStrategy
        const { sourceReference, ...persistableStrategy } = finalStrategy;

        const newAiMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'model',
            parts: [{ text: response.text || '' }],
            strategySnapshot: persistableStrategy,  // No base64 data
            timestamp: Date.now()
        };

        const finalHistory = [...history, newAiMessage];

        updateInstanceState(index, { chatHistory: finalHistory, layoutStrategy: persistableStrategy });

        const isExplicitIntent = history.some(msg => msg.role === 'user' && /\b(generate|recreate)\b/i.test(msg.parts[0].text));

        const augmentedContext: MappingContext = {
            ...sourceData,
            aiStrategy: { ...finalStrategy, isExplicitIntent },
            previewUrl: undefined,
            targetDimensions: targetData ? { w: targetData.bounds.w, h: targetData.bounds.h } : undefined
        };

        registerResolved(id, `source-out-${index}`, augmentedContext);

        if ((finalStrategy.method === 'GENERATIVE' || finalStrategy.method === 'HYBRID') && finalStrategy.generativePrompt) {
             if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
             draftTimeoutRef.current = setTimeout(async () => {
                 const url = await generateDraft(finalStrategy.generativePrompt, finalStrategy.sourceReference);
                 if (url) {
                     const contextWithPreview: MappingContext = {
                         ...augmentedContext,
                         previewUrl: url,
                         message: "Free Preview: Draft"
                     };
                     registerResolved(id, `source-out-${index}`, contextWithPreview);
                 }
             }, DRAFT_DEBOUNCE_MS);
        }

      } catch (e: any) {
          console.error("Analysis Failed:", e);
          const errorMessage = e?.message || 'Analysis failed. Check console for details.';
          setInstanceErrors(prev => ({ ...prev, [index]: errorMessage }));
          setAnalysisStages(prev => ({ ...prev, [index]: 'error' }));
      } finally {
          setAnalyzingInstances(prev => ({ ...prev, [index]: false }));
      }
  };

  const handleAnalyze = (index: number) => {
      const initialMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          parts: [{ text: "Generate grid layout." }],
          timestamp: Date.now()
      };
      updateInstanceState(index, { chatHistory: [initialMsg] });
      performAnalysis(index, [initialMsg]);
  };

  return (
    <div className={`w-[650px] bg-slate-800 rounded-lg shadow-2xl border border-slate-600 font-sans flex flex-col transition-all duration-300 ${!hasFunctionalInput ? 'opacity-50 grayscale' : ''}`}>
      <NodeResizer minWidth={650} minHeight={500} isVisible={true} handleStyle={{ background: 'transparent', border: 'none' }} lineStyle={{ border: 'none' }} />
      
      <Handle type="target" position={Position.Top} id="knowledge-in" className={`!w-4 !h-4 !-top-2 !bg-emerald-500 !border-2 !border-slate-900 z-50 transition-all duration-300 ${activeKnowledge ? 'shadow-[0_0_10px_#10b981]' : ''}`} style={{ left: '50%', transform: 'translateX(-50%)' }} title="Input: Global Design Rules" />

      <div className="bg-slate-900 p-2 border-b border-slate-700 flex items-center justify-between shrink-0 rounded-t-lg relative">
         <div className="flex items-center space-x-2">
           {activeKnowledge && (
             <span className="absolute left-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
           )}
           <svg className={`w-4 h-4 ${activeKnowledge ? 'text-emerald-400' : 'text-purple-400'} ml-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
           </svg>
           <div className="flex flex-col leading-none">
             <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-purple-100">Design Analyst</span>
                {activeKnowledge && (
                    <span className="text-[9px] bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold tracking-wider">
                        KNOWLEDGE LINKED
                    </span>
                )}
             </div>
             <span className="text-[9px] text-purple-400 max-w-[200px] truncate">{titleSuffix}</span>
           </div>
         </div>
         {/* Server Status Indicator */}
         <div className="flex items-center space-x-2">
           <span className="text-[9px] px-2 py-1 rounded font-mono font-bold tracking-wider border flex items-center gap-1.5 bg-cyan-900/30 border-cyan-500/30 text-cyan-300">
             QWEN LOCAL
             <span className={`w-2 h-2 rounded-full ${
               serverStatus === 'checking' ? 'bg-yellow-400 animate-pulse' :
               serverStatus === 'online' ? 'bg-emerald-400 shadow-[0_0_4px_#10b981]' :
               'bg-red-400 shadow-[0_0_4px_#f87171]'
             }`} title={`Server ${serverStatus}`}></span>
           </span>
         </div>
      </div>
      <div className="flex flex-col">
          {effectiveIndices.map((i) => {
              const state = analystInstances[i] || DEFAULT_INSTANCE_STATE;
              return (
                  <InstanceRow
                      key={i} nodeId={id} index={i} state={state} sourceData={getSourceData(i)} targetData={getTargetData(i)}
                      onAnalyze={handleAnalyze} onToggleMute={handleToggleMute} onReset={handleReset}
                      isAnalyzing={!!analyzingInstances[i]} compactMode={effectiveIndices.length > 1}
                      activeKnowledge={activeKnowledge} error={instanceErrors[i] || null}
                      analysisStage={analysisStages[i] || 'idle'}
                  />
              );
          })}
      </div>
      <button onClick={addInstance} className="w-full py-2 bg-slate-900 hover:bg-slate-700 border-t border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center space-x-1 rounded-b-lg">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        <span className="text-[10px] font-medium uppercase tracking-wider">Add Analysis Instance</span>
      </button>
    </div>
  );
});
