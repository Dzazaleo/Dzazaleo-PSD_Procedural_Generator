
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
import { Brain, BrainCircuit, Ban, ClipboardList, AlertCircle, RefreshCw, RotateCcw, Play, Eye, BookOpen, Tag, Activity, Expand, Minimize2, MapPin, Scaling } from 'lucide-react';
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
  if (lower.includes('button') || lower.includes('cta') || lower.includes('win') ||
      lower.includes('counter') || lower.includes('score') || lower.includes('header') ||
      lower.includes('footer') || lower.includes('nav')) return 'static';
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

const InstanceRow: React.FC<InstanceRowProps> = ({
    index, state, sourceData, targetData, onAnalyze, onToggleMute, onReset, isAnalyzing, compactMode, activeKnowledge, error, analysisStage
}) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);
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
                                    <div className="flex flex-col gap-3">
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
    sourceH: number
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

CONTEXT:
Container: "${containerName}" (${sourceW}x${sourceH}px)

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
        canScale: { type: 'array', items: { type: 'string' }, description: 'What can be scaled down' }
      },
      required: ['narrative', 'userExperience', 'primaryElements', 'secondaryElements', 'backgroundElements',
                 'attentionOrder', 'dominantElement', 'arrangement', 'arrangementRationale', 'keyRelationships',
                 'mustPreserve', 'canAdapt', 'canScale']
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
      canScale: rawJson.canScale || []
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
    targetH: number
  ): Promise<VerificationResult> => {
    const verificationPrompt = `You are a design QA specialist. Your task is to verify that a proposed layout preserves the original composition's intent.

═══════════════════════════════════════════════════════════════════════════════
ORIGINAL COMPOSITION ANALYSIS
═══════════════════════════════════════════════════════════════════════════════
NARRATIVE: ${sourceAnalysis.narrative}
USER EXPERIENCE: ${sourceAnalysis.userExperience}
PRIMARY ELEMENTS: ${sourceAnalysis.primaryElements.join(', ')}
ATTENTION ORDER: ${sourceAnalysis.attentionOrder.join(' → ')}
MUST PRESERVE: ${sourceAnalysis.mustPreserve.join('; ')}

═══════════════════════════════════════════════════════════════════════════════
PROPOSED LAYOUT
═══════════════════════════════════════════════════════════════════════════════
Target: ${targetW}x${targetH}px
Scale: ${layoutStrategy.suggestedScale}x
Layout Mode: ${layoutStrategy.spatialLayout || 'UNIFIED_FIT'}
Method: ${layoutStrategy.method}

Layer Overrides:
${JSON.stringify(layoutStrategy.overrides || [], null, 2)}

═══════════════════════════════════════════════════════════════════════════════
VERIFICATION CHECKLIST
═══════════════════════════════════════════════════════════════════════════════
Answer YES or NO with explanation:

1. NARRATIVE PRESERVED: Does the layout still tell the same story?
   - Can the user still understand the purpose?
   - Is the message clear?

2. HIERARCHY MAINTAINED: Is the attention order preserved?
   - Does "${sourceAnalysis.dominantElement}" still dominate?
   - Do eyes flow in the intended order?

3. ALL ELEMENTS VISIBLE: Will every element from "mustPreserve" be fully visible?
   - No cropping?
   - No off-screen elements?

4. BALANCE: Is visual balance maintained?
   - Elements evenly distributed?
   - No awkward empty spaces?

5. SCALE APPROPRIATE: At ${layoutStrategy.suggestedScale}x scale:
   - Are primary elements still prominent enough?
   - Is text still readable?

═══════════════════════════════════════════════════════════════════════════════
IF ISSUES FOUND - PROVIDE CORRECTIONS
═══════════════════════════════════════════════════════════════════════════════
If any check fails, you MUST provide corrected overrides.

OVERRIDE COORDINATE SYSTEM:
- xOffset/yOffset are ABSOLUTE positions relative to target container's top-left (0,0)
- NOT relative offsets from original position
- Each override completely REPLACES the geometric baseline

Example for horizontal distribution in ${targetW}x${targetH} target:
If 3 items need horizontal arrangement with 50px padding:
- Item 1: xOffset = 50 + (itemWidth/2)
- Item 2: xOffset = ${targetW}/2
- Item 3: xOffset = ${targetW} - 50 - (itemWidth/2)

Provide correctedOverrides with specific xOffset/yOffset values that fix the issues.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════════════════════════════════════
If ALL checks pass: { "passed": true, "confidenceScore": 0.9, ... }
If ANY check fails: { "passed": false, "issues": [...], "correctedOverrides": [...], ... }

Respond with JSON matching the VerificationResult schema.`;

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
                    width: effectiveCoords.w,
                    height: effectiveCoords.h,
                    childCount: l.children?.length ?? 0
                });
            }

            if (l.children && depth < maxDepth) {
                flat = flat.concat(flattenLayers(l.children, depth + 1, maxDepth));
            }
        });
        return flat;
    };

    const layerAnalysisData = flattenLayers(sourceData.layers as SerializableLayer[]);

    const sourceRatio = sourceW / sourceH;
    const targetRatio = targetW / targetH;
    const isMismatch = Math.abs(sourceRatio - targetRatio) > ASPECT_RATIO_TOLERANCE;

    const getOrientation = (w: number, h: number) => w > h ? "Landscape" : (h > w ? "Portrait" : "Square");
    const sourceOrientation = getOrientation(sourceW, sourceH);
    const targetOrientation = getOrientation(targetW, targetH);
    const geometryContext = isMismatch
        ? `GEOMETRY SHIFT: ${sourceOrientation} -> ${targetOrientation}. You must RECOMPOSE the layout, not just scale it.`
        : `Geometry stable: similar aspect ratios.`;

    // Expert Designer Persona - Constraint-First Design Philosophy
    const expertPersona = `You are a Senior Art Director with 15 years of experience in adaptive layout design. You specialize in translating design assets across different aspect ratios and formats while preserving visual hierarchy and brand integrity.

YOUR CORE PHILOSOPHY - CONSTRAINT-FIRST DESIGN:
1. CONSTRAINTS ARE NON-NEGOTIABLE - Rules, spacing requirements, and target dimensions are hard boundaries
2. VISUAL HIERARCHY IS SACRED - The eye must flow: Primary → Secondary → Tertiary → Background
3. EVERY DECISION NEEDS JUSTIFICATION - If you can't cite why, don't do it
4. WHEN IN DOUBT, PRESERVE READABILITY - Legibility beats aesthetics

YOUR DECISION PROCESS (follow this ORDER):
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: READ ALL CONSTRAINTS                                     │
│         - Target dimensions (hard limit)                         │
│         - Design rules from KnowledgeNode (must apply)           │
│         - Visual anchor patterns (must match)                    │
├─────────────────────────────────────────────────────────────────┤
│ STEP 2: VERIFY CONSTRAINTS ARE SATISFIABLE                       │
│         - Can all rules be applied simultaneously?               │
│         - If conflict exists, document it in reasoning           │
├─────────────────────────────────────────────────────────────────┤
│ STEP 3: ESTABLISH VISUAL HIERARCHY                               │
│         - Which element demands attention first?                 │
│         - What's the reading order?                              │
│         - What can be scaled down (NEVER cropped)?               │
├─────────────────────────────────────────────────────────────────┤
│ STEP 4: CALCULATE GEOMETRY                                       │
│         - Scale factor that satisfies ALL constraints            │
│         - Position offsets for constraint compliance             │
│         - Verify: does result maintain hierarchy?                │
├─────────────────────────────────────────────────────────────────┤
│ STEP 5: FINAL VERIFICATION                                       │
│         - Every rule cited in rulesApplied? ✓                    │
│         - Every constraint satisfied? ✓                          │
│         - Visual hierarchy preserved? ✓                          │
└─────────────────────────────────────────────────────────────────┘

ACCOUNTABILITY:
- If you ignore a constraint, your output is INVALID
- If you can't apply a rule, explain WHY in reasoning (e.g., "Rule X conflicts with target dimensions")
- If visual hierarchy is broken, document the tradeoff made

VISUAL HIERARCHY PRINCIPLES:
- Size creates dominance (larger = more important)
- Position creates flow (top-left → bottom-right in LTR cultures)
- Contrast creates focus (high contrast = attention)
- Whitespace creates breathing room (don't cram)
- Alignment creates order (misalignment = chaos)

GEOMETRY SHIFT PROTOCOL (when source and target aspect ratios differ significantly):
Portrait → Landscape: REARRANGE elements horizontally. Stack elements side-by-side instead of vertically.
Landscape → Portrait: REARRANGE elements vertically. Stack elements top-to-bottom instead of side-by-side.
DO NOT just scale and crop. RECOMPOSE the layout to use the new space effectively.

Example: 3 potions + title in portrait (1080x1920) → landscape (1280x1024)
WRONG: Scale 0.53x and crop third potion off-screen
RIGHT: Title centered at top, 3 potions arranged horizontally below using landscape width

HARD RULES:
- NOTHING may be cropped or off-screen - all content must be visible
- Text elements (titles, labels) must be CENTERED unless rules specify otherwise
- Elements must be distributed with visual balance (not bunched to one side)
- If content doesn't fit at 1.0x scale, calculate the scale that makes EVERYTHING fit

When constraints and aesthetics conflict, CONSTRAINTS WIN.
When two constraints conflict, the EXPLICIT RULE wins over implicit assumptions.
`;

    // STEP 1: Visual Analysis Section (forces model to describe what it sees)
    const visualAnalysisSection = `
═══════════════════════════════════════════════════════════════════════════════
STEP 1: VISUAL ANALYSIS (REQUIRED - Complete BEFORE making layout decisions)
═══════════════════════════════════════════════════════════════════════════════
Examine the INPUT SOURCE CONTEXT image and describe IN YOUR OUTPUT:

1. CONTENT INVENTORY: List every distinct visual element you see
   - Text elements: headlines, subheadings, body copy, labels
   - Graphics: logos, icons, illustrations, photos
   - Decorative: borders, shadows, gradients, patterns
   - Background: solid colors, textures, images

2. SPATIAL RELATIONSHIPS: How are elements arranged?
   - Visual hierarchy (most prominent to least)
   - Alignment patterns (left, center, grid)
   - Spacing patterns (uniform, varied, grouped)

3. STYLE CHARACTERISTICS: What defines the visual style?
   - Color palette (list dominant colors)
   - Typography style (serif/sans-serif, weights)
   - Overall mood (corporate, playful, minimal, bold)

Your "visualAnalysis" field MUST contain image-specific details, not generic descriptions.
`;

    // STEP 2: Knowledge Rules Section (strengthened with citation enforcement)
    const knowledgeSection = effectiveRules ? `
═══════════════════════════════════════════════════════════════════════════════
STEP 2: MANDATORY DESIGN RULES (MUST APPLY - Cite each rule)
═══════════════════════════════════════════════════════════════════════════════
The following rules are NON-NEGOTIABLE. For EACH rule you MUST:
- Apply it to your layout decisions
- Add it to the "rulesApplied" array with explanation

<RULES>
${effectiveRules}
</RULES>

RULE APPLICATION GUIDE:
- "LAYOUT_METHOD: X" -> Set layoutMode to X
- "SPACING: Npx" -> Calculate scale ensuring N pixels clearance
- "HIERARCHY: A over B" -> Layer A must be visually prominent over B
- "UI_RESERVES: Lock X" -> That element gets layoutRole="static"

EVERY override that implements a rule must include "citedRule" field.
FAILURE TO CITE RULES = OUTPUT REJECTED
` : '';

    // Visual Anchor Context Section (explains anchors before images appear)
    const anchorSection = effectiveKnowledge?.visualAnchors?.length ? `
═══════════════════════════════════════════════════════════════════════════════
VISUAL ANCHOR COMPLIANCE (Match style to reference images)
═══════════════════════════════════════════════════════════════════════════════
You will see ${effectiveKnowledge.visualAnchors.length} VISUAL_ANCHOR image(s) below.
These are AUTHORITATIVE style references.

For each anchor, analyze and apply:
- Layout patterns (grid, stack, centered)
- Spacing and alignment conventions
- Visual style elements (colors, typography feel)

Reference anchors by index in your overrides (anchorIndex field).
` : '';

    // Layer Data Section (with semantic role hints)
    const layerDataSection = `
═══════════════════════════════════════════════════════════════════════════════
LAYER DATA (Analyze PURPOSE, not just position)
═══════════════════════════════════════════════════════════════════════════════
For each layer, determine its SEMANTIC ROLE from name/position:
- "background": bg, background, fill -> layoutRole="background"
- "primary": title, headline, hero -> most important content
- "secondary": subtitle, desc -> supporting content
- "ui": button, cta, nav -> layoutRole="static"
- "decorative": border, shadow, accent -> may scale differently

LAYER INVENTORY (${Math.min(MAX_LAYERS_IN_PROMPT, layerAnalysisData.length)} of ${layerAnalysisData.length} layers):
${JSON.stringify(layerAnalysisData.slice(0, MAX_LAYERS_IN_PROMPT))}
`;

    // Per-Layer Strategy Section (REQUIRED for every layer)
    const perLayerSection = `
═══════════════════════════════════════════════════════════════════════════════
PER-LAYER LAYOUT STRATEGY (REQUIRED FOR EVERY LAYER)
═══════════════════════════════════════════════════════════════════════════════
You MUST generate an override for EVERY layer in the LAYER INVENTORY above.
Each layer must be CLASSIFIED and given appropriate scale/position for its role.

ROLE DEFINITIONS AND TRANSFORM BEHAVIORS:

▸ "background" - Full-bleed fills, textures, base images
  - ALWAYS stretch to fill entire target container (non-uniform scaling OK)
  - scaleX = ${targetW} / layerWidth
  - scaleY = ${targetH} / layerHeight
  - xOffset = 0, yOffset = 0 (fills from top-left)

▸ "flow" - Main content (game elements, images, text blocks)
  - MAINTAIN relative position within container
  - Scale proportionally (uniform scaleX = scaleY)
  - Position = (originalRelativePosition × targetDimensions)
  - Example: Element at 30% from left stays at 30% from left

▸ "static" - UI elements (buttons, counters, labels, headers)
  - PIN to relative edge distances using edgeAnchor
  - edgeAnchor: {horizontal: 'left'|'center'|'right', vertical: 'top'|'center'|'bottom'}
  - Keep similar size (scale ~1.0) to maintain legibility
  - Example: WIN counter 100px from bottom in ${sourceH}px source → ${Math.round(100 * targetH / sourceH)}px from bottom in ${targetH}px target

▸ "overlay" - Elements attached to other layers (labels on images, badges)
  - Specify linkedAnchorId (the parent layer's id)
  - Position relative to parent layer
  - Scale with parent

CALCULATION FORMULAS:

For source ${sourceW}x${sourceH} → target ${targetW}x${targetH}:
- Aspect scale: ${(targetW/sourceW).toFixed(3)} horizontal, ${(targetH/sourceH).toFixed(3)} vertical
- Background: scaleX=${(targetW/sourceW).toFixed(3)}, scaleY=${(targetH/sourceH).toFixed(3)}
- Content proportional scale: ${Math.min(targetW/sourceW, targetH/sourceH).toFixed(3)}

For a layer at relX=0.3, relY=0.5 (from source top-left):
- New position: xOffset = ${Math.round(0.3 * targetW)}, yOffset = ${Math.round(0.5 * targetH)}

OUTPUT REQUIREMENT:
The "overrides" array MUST contain one entry for EVERY layer in the inventory.
Each override MUST have: layerId, layoutRole, xOffset, yOffset, and scale values.
Missing layers = INVALID OUTPUT.
`;

    // Constraint summary for the task header
    const constraintSummary = `CONSTRAINT SUMMARY:
- Target bounds: ${targetW}x${targetH}px (HARD LIMIT - content must fit)
${effectiveRules ? `- Design rules: ${effectiveRules.split('\n').filter(r => r.trim()).length} rules to apply (see MANDATORY DESIGN RULES)` : '- Design rules: None provided'}
${effectiveKnowledge?.visualAnchors?.length ? `- Visual anchors: ${effectiveKnowledge.visualAnchors.length} reference image(s) to match` : '- Visual anchors: None provided'}`;

    // SOURCE COMPREHENSION section (from Stage 1 analysis) - CONCISE version
    const sourceComprehensionSection = sourceAnalysis && sourceAnalysis.primaryElements.length > 0 ? `
SOURCE ANALYSIS (from Stage 1 - use this, don't re-analyze):
- Primary elements: ${sourceAnalysis.primaryElements.join(', ')}
- Arrangement: ${sourceAnalysis.arrangement}
- Dominant: ${sourceAnalysis.dominantElement}
- Must preserve: ${sourceAnalysis.mustPreserve.join(', ') || 'all visible'}

TASK: Adapt from ${sourceOrientation} (${sourceW}x${sourceH}) to ${targetOrientation} (${targetW}x${targetH})
${targetW > targetH ? 'Target is LANDSCAPE - spread elements horizontally.' : 'Target is PORTRAIT - stack elements vertically.'}

Your visualAnalysis must mention: ${sourceAnalysis.primaryElements.slice(0, 3).join(', ')}
` : '';

    // Constraint verification checklist
    const constraintVerification = `
═══════════════════════════════════════════════════════════════════════════════
CONSTRAINT VERIFICATION CHECKLIST (Complete before outputting)
═══════════════════════════════════════════════════════════════════════════════
Before finalizing your response, verify:

□ ALL CONTENT VISIBLE: Will EVERY element from the source be visible in the target? (NO cropping allowed)
□ TARGET BOUNDS: Does scaled content fit within ${targetW}x${targetH}? If not, reduce suggestedScale.
□ TEXT CENTERED: Are title/text elements horizontally centered (unless rules say otherwise)?
□ VISUAL BALANCE: Are elements distributed evenly, not bunched to one side?
□ GEOMETRY SHIFT: If aspect ratio changed significantly, did you RECOMPOSE (not just scale)?
□ PADDING RULES: If rules specify padding, is suggestedScale adjusted to leave that clearance?
□ RULE COVERAGE: Is every rule from <RULES> block cited in rulesApplied array?

If ANY check fails, adjust your output before responding.

CRITICAL: If you would crop content to fit, STOP. Reduce scale or recompose layout instead.
`;

    const prompt = `${expertPersona}

═══════════════════════════════════════════════════════════════════════════════
CURRENT TASK
═══════════════════════════════════════════════════════════════════════════════
Source Container: "${sourceData.container.containerName}" (${sourceW}x${sourceH}px)
Target Container: "${targetData.name}" (${targetW}x${targetH}px)
${geometryContext}

${constraintSummary}
${sourceComprehensionSection}
${sourceAnalysis ? '' : visualAnalysisSection}
${knowledgeSection}
${anchorSection}
${layerDataSection}
${perLayerSection}
═══════════════════════════════════════════════════════════════════════════════
YOUR DECISIONS (Apply your constraint-first methodology)
═══════════════════════════════════════════════════════════════════════════════

1. SPATIAL LAYOUT (pick ONE):
   - "UNIFIED_FIT" (default) - Scale all content as one unit, maintain aspect ratio, center it
   - "STRETCH_FILL" - For backgrounds/textures that should fill the entire container
   - "ABSOLUTE_PIN" - For UI elements that need exact positioning (requires xOffset/yOffset)

2. LAYOUT MODE (if rules specify distribution):
   - "STANDARD" - No special distribution
   - "GRID" - Distribute elements in a grid pattern
   - "DISTRIBUTE_HORIZONTAL" - Space elements evenly horizontally
   - "DISTRIBUTE_VERTICAL" - Space elements evenly vertically

3. LAYER ROLES (classify each major layer):
   - "flow" - Part of the main content, participates in grid/distribution
   - "static" - Fixed UI element (headers, titles) - doesn't move with grid
   - "overlay" - Attached to another layer (MUST specify linkedAnchorId)
   - "background" - Full-bleed texture at bottom of stack

4. SCALE CALCULATION:
   - Calculate suggestedScale so ALL content fits within target bounds
   - If rules specify padding (e.g., "50px from edges"), account for it:
     availableWidth = targetW - (2 x padding)
   - Scale = min(availableWidth / contentWidth, availableHeight / contentHeight)
   - NEVER choose a scale that would crop content

5. OVERRIDES (for layers needing special treatment):
   Each override needs: layerId, xOffset, yOffset, individualScale, layoutRole
   If applying a rule: add citedRule with the rule text

═══════════════════════════════════════════════════════════════════════════════
CONFIDENCE TRIANGULATION
═══════════════════════════════════════════════════════════════════════════════
Before finalizing, verify your decisions against THREE evidence sources:
1. VISUAL: What do you actually see in the image?
2. KNOWLEDGE: What do the design rules say?
3. METADATA: What do the layer names suggest?

Confidence levels:
- HIGH (3/3 sources agree)
- MEDIUM (2/3 sources agree)
- LOW (0-1 sources agree - use geometric fallback)
${constraintVerification}
OUTPUT REQUIREMENTS:
- visualAnalysis: Describe what you see (be specific, not generic)
- rulesApplied: Array of {rule, application} for each design rule
- method: "GEOMETRIC" (default) or "GENERATIVE" if rules say so
- generativePrompt: "" unless method is GENERATIVE
- suggestedScale: Scale factor so all content fits in target
- overrides: Array of layer adjustments with xOffset, yOffset, individualScale
- reasoning: Explain your layout decisions

Think step by step:
1. What content is in this container?
2. How should elements be arranged in the new ${targetW}x${targetH} space?
3. What scale keeps ALL content visible?
4. Verify nothing is cropped`;

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
            sourceData.container.bounds.h
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
            required: ['visualAnalysis', 'rulesApplied', 'reasoning', 'method', 'spatialLayout', 'suggestedScale', 'anchor',
                       'generativePrompt', 'semanticAnchors', 'clearance', 'overrides',
                       'safetyReport', 'knowledgeApplied', 'directives', 'replaceLayerId']
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
            maxTokens: 4096,
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

        // --- PER-LAYER OVERRIDE VALIDATION ---
        // Ensure every layer has an override (generate defaults for missing layers)
        const flattenLayerIds = (layers: SerializableLayer[], depth = 0, maxDepth = MAX_LAYER_DEPTH): { id: string; name: string; coords: any; }[] => {
            if (depth > maxDepth) return [];
            let result: { id: string; name: string; coords: any; }[] = [];
            for (const layer of layers) {
                if (layer.type === 'layer' || depth <= 1) {
                    result.push({ id: layer.id, name: layer.name, coords: layer.coords });
                }
                if (layer.children && depth < maxDepth) {
                    result = result.concat(flattenLayerIds(layer.children, depth + 1, maxDepth));
                }
            }
            return result;
        };

        const allLayers = flattenLayerIds(sourceData.layers as SerializableLayer[]);
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

            for (const layer of missingLayers) {
                const role = inferLayoutRoleFromName(layer.name);
                const relX = (layer.coords.x - sourceX) / sourceW;
                const relY = (layer.coords.y - sourceY) / sourceH;

                let override: LayerOverride;
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
                        individualScale: 1, // Keep readable
                        edgeAnchor: {
                            horizontal: relX < 0.33 ? 'left' : (relX > 0.66 ? 'right' : 'center'),
                            vertical: relY < 0.33 ? 'top' : (relY > 0.66 ? 'bottom' : 'center'),
                        },
                    };
                } else {
                    // Flow - proportional scaling and positioning
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
            console.log(`[Analyst] Total overrides after defaults: ${json.overrides.length}`);
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
              targetData.bounds.h
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
            if (!verification.passed && verification.correctedOverrides && verification.correctedOverrides.length > 0) {
              console.log('[Analyst] Applying verification corrections:', verification.correctedOverrides.length, 'override corrections');
              finalStrategy = {
                ...json,
                overrides: verification.correctedOverrides,
                suggestedScale: verification.correctedScale ?? json.suggestedScale,
                reasoning: json.reasoning + '\n\n[STAGE 3 VERIFICATION CORRECTIONS APPLIED]\n' +
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
