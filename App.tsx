import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import type { Connection, Edge, Node } from 'reactflow';

import { LoadPSDNode } from './components/LoadPSDNode';
import { TargetTemplateNode } from './components/TargetTemplateNode';
import { TargetSplitterNode } from './components/TargetSplitterNode';
import { DesignInfoNode } from './components/DesignInfoNode';
import { TemplateSplitterNode } from './components/TemplateSplitterNode';
import { ContainerResolverNode } from './components/ContainerResolverNode';
import { RemapperNode } from './components/RemapperNode';
import { DesignAnalystNode } from './components/DesignAnalystNode'; 
import { ExportPSDNode } from './components/ExportPSDNode';
import { KnowledgeNode } from './components/KnowledgeNode'; 
import { KnowledgeInspectorNode } from './components/KnowledgeInspectorNode';
import { DesignReviewerNode } from './components/DesignReviewerNode';
import { ContainerPreviewNode } from './components/ContainerPreviewNode'; 
import { ProjectControls } from './components/ProjectControls';
import { PSDNodeData } from './types';
import { ProceduralStoreProvider, useProceduralStore } from './store/ProceduralContext';

// --- KEYBOARD NAVIGATION COMPONENT (Game Loop Implementation) ---
const KeyboardNavigation = () => {
  const { getViewport, setViewport } = useReactFlow();
  
  // 30% Slower Speed Constant (approx 10px per frame @ 60fps = 600px/sec)
  const PAN_SPEED = 10; 

  // Refs to track state without triggering re-renders
  const keysPressed = useRef({ w: false, a: false, s: false, d: false });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Input Guard: Ignore if user is typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysPressed.current[key as keyof typeof keysPressed.current] = true;
        
        // Start the game loop if not already running
        if (!rafId.current) {
          tick();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysPressed.current[key as keyof typeof keysPressed.current] = false;
      }
    };

    const tick = () => {
      const { w, a, s, d } = keysPressed.current;
      
      // Stop loop if no keys are pressed
      if (!w && !a && !s && !d) {
        rafId.current = null;
        return;
      }

      const { x, y, zoom } = getViewport();
      let newX = x;
      let newY = y;

      // Apply Velocity
      if (w) newY += PAN_SPEED;
      if (s) newY -= PAN_SPEED;
      if (a) newX += PAN_SPEED;
      if (d) newX -= PAN_SPEED;

      setViewport({ x: newX, y: newY, zoom });
      rafId.current = requestAnimationFrame(tick);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [getViewport, setViewport]);

  return null; // Logic-only component
};

const INITIAL_NODES: Node<PSDNodeData>[] = [
  // 1. Knowledge Column
  {
    id: 'node-knowledge-1',
    type: 'knowledge',
    position: { x: 20, y: -338 },
    data: { fileName: null, template: null, validation: null, designLayers: null },
  },
  
  // 2. Inspector Column
  {
    id: 'node-inspector-1',
    type: 'knowledgeInspector',
    position: { x: 456, y: -278 },
    data: { fileName: null, template: null, validation: null, designLayers: null },
  },

  // 3. Source Column
  {
    id: 'node-1', // Load PSD
    type: 'loadPsd',
    position: { x: -722, y: 158 },
    data: { fileName: null, template: null, validation: null, designLayers: null },
  },
  {
    id: 'node-target-1',
    type: 'targetTemplate',
    position: { x: 658, y: 84 },
    data: { fileName: null, template: null, validation: null, designLayers: null },
  },

  // 4. Structure & Metadata Column
  {
    id: 'node-info-1',
    type: 'designInfo',
    position: { x: -252, y: -2 },
    data: { fileName: null, template: null, validation: null, designLayers: null },
  },
  {
    id: 'node-template-splitter-1',
    type: 'templateSplitter',
    position: { x: 74, y: 596 },
    data: { fileName: null, template: null, validation: null, designLayers: null },
  },

  // 5. Logic & Resolution Column
  {
    id: 'node-resolver-1',
    type: 'containerResolver',
    position: { x: 512, y: 548 },
    data: { 
      fileName: null, 
      template: null, 
      validation: null, 
      designLayers: null,
      channelCount: 10 
    },
  },
  {
    id: 'node-target-splitter-1',
    type: 'targetSplitter',
    position: { x: 1040, y: 378 },
    data: { fileName: null, template: null, validation: null, designLayers: null },
  },

  // 6. Procedural Intelligence Pipeline (Linear Flow)
  {
    id: 'node-analyst-1', 
    type: 'designAnalyst',
    position: { x: 1562, y: 248 },
    data: { fileName: null, template: null, validation: null, designLayers: null },
    style: { width: 650 },
  },
  {
    id: 'node-remapper-1',
    type: 'remapper',
    position: { x: 2300, y: 248 }, 
    data: { 
      fileName: null, 
      template: null, 
      validation: null, 
      designLayers: null, 
      remapperConfig: { targetContainerName: null },
      instanceCount: 1 
    },
    style: { width: 500 }
  },
  {
    id: 'node-reviewer-1', 
    type: 'designReviewer',
    position: { x: 2900, y: 248 }, 
    data: { 
        fileName: null, template: null, validation: null, designLayers: null,
        instanceCount: 1 
    },
    style: { width: 480 }
  },
  {
    id: 'node-preview-1',
    type: 'containerPreview',
    position: { x: 3500, y: 248 }, 
    data: { fileName: null, template: null, validation: null, designLayers: null },
    style: { width: 650, height: 500 },
  },
  {
    id: 'node-export-1',
    type: 'exportPsd',
    position: { x: 4250, y: 248 }, 
    data: { fileName: null, template: null, validation: null, designLayers: null },
  }
];

const INITIAL_EDGES: Edge[] = [
    // Source -> Info
    { id: 'e-load-info', source: 'node-1', target: 'node-info-1' },
    // Source -> Template Splitter
    { id: 'e-load-template-splitter', source: 'node-1', target: 'node-template-splitter-1' },
    // Target Template -> Target Splitter
    { 
      id: 'e-target-target-splitter', 
      source: 'node-target-1', 
      target: 'node-target-splitter-1', 
      sourceHandle: 'target-metadata-out',
      targetHandle: 'template-input'
    },
    // Knowledge -> Inspector
    {
      id: 'e-knowledge-inspector',
      source: 'node-knowledge-1',
      target: 'node-inspector-1',
      sourceHandle: 'knowledge-out',
      targetHandle: 'knowledge-in'
    }
];

const getInitialNodes = (): Node<PSDNodeData>[] => {
  try {
    const saved = localStorage.getItem('psd_graph_layout');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // SANITIZATION PROTOCOL:
        // Filter out volatile runtime state (Zombie State) while preserving structural config.
        return parsed.map((node: Node<PSDNodeData>) => ({
          ...node,
          data: {
            // 1. Reset Volatile State (Binary dependent)
            fileName: null,
            template: null,
            validation: null,
            designLayers: null,
            containerContext: null,
            mappingContext: null,
            targetAssembly: null,
            transformedPayload: null,
            knowledgeContext: null,
            previewImages: undefined,
            error: null,

            // 2. Clear Chat & Reasoning History
            analystInstances: undefined,
            reviewerInstances: undefined,

            // 3. Preserve User Configuration & Topology
            channelCount: node.data.channelCount,
            instanceCount: node.data.instanceCount,
            remapperConfig: node.data.remapperConfig,
            instanceSettings: node.data.instanceSettings,
            inspectorState: node.data.inspectorState
          }
        }));
      }
    }
  } catch (err) {
    console.warn("Failed to retrieve graph layout from storage", err);
  }
  return INITIAL_NODES;
};

// --- APP INIT COMPONENT (Hard Reset Trigger) ---
const AppInit = () => {
    const { setNodes, setEdges } = useReactFlow();
    const { resetProject } = useProceduralStore();
    const mounted = useRef(false);

    useEffect(() => {
        if (mounted.current) return;
        mounted.current = true;

        console.log('[AppInit] Enforcing Hard Project Reset on Mount...');
        
        // 1. Clear Data Registries
        resetProject();
        
        // 2. Reset View State to Defaults (ignoring previous session localStorage for a clean slate)
        setNodes(INITIAL_NODES);
        setEdges([]); // Start with clean edges (no auto-wire leftovers)
        
        // 3. Clear Storage to prevent resurrection on next soft reload
        localStorage.removeItem('psd_graph_layout');
        
    }, [resetProject, setNodes, setEdges]);

    return null;
};

const App: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const edgeReconnectSuccessful = useRef(true);

  // Persistence logic for layout state
  useEffect(() => {
    const saveLayout = setTimeout(() => {
        if (nodes.length > 0) {
            localStorage.setItem('psd_graph_layout', JSON.stringify(nodes));
        }
    }, 1000); // Debounce saves
    return () => clearTimeout(saveLayout);
  }, [nodes]);

  // --- REACTIVE EDGE STYLING ---
  
  const onEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.map((e) => {
      if (e.id === edge.id) {
        return {
          ...e,
          animated: true,
          style: { ...e.style, stroke: '#22c55e', strokeWidth: 2.5 } // Green-500, Thicker
        };
      }
      return e;
    }));
  }, [setEdges]);

  const onEdgeMouseLeave = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.map((e) => {
      if (e.id === edge.id) {
        return {
          ...e,
          animated: false,
          style: {} // REVERT TO DEFAULT (Empty Style Object)
        };
      }
      return e;
    }));
  }, [setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // 1. Validation Logic
      // Resolve source and target nodes to check their types
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (sourceNode && targetNode) {
        // Target Splitter Validation Rules
        if (targetNode.type === 'targetSplitter') {
          // Check if connecting to the Template Input handle
          if (params.targetHandle === 'template-input') {
             // Constraint: Template Input expects a TargetTemplateNode
             if (sourceNode.type !== 'targetTemplate') {
               console.warn("Invalid Connection: Target Splitter 'Template Input' requires a Target Template source.");
               return;
             }
          }
          // Note: Target Splitter Slots can connect to DesignAnalyst OR Remapper
        }
        
        // Remapper Validation Rules (Dynamic Multi-Instance)
        if (targetNode.type === 'remapper') {
            const handle = params.targetHandle || '';
            
            // Allow dynamic Target Template Slots
            if (handle.startsWith('target-in-')) {
                 // Remapper accepts Target Splitter OR Design Analyst (Proxy)
                 if (sourceNode.type !== 'targetSplitter' && sourceNode.type !== 'designAnalyst') {
                     console.warn("Remapper 'Target' input requires a Target Splitter or Design Analyst.");
                     return;
                 }
            } 
            // Allow dynamic Content Sources
            else if (handle.startsWith('source-in-')) {
                 // Remapper accepts Container Resolver OR Design Analyst (Proxy)
                 if (sourceNode.type !== 'containerResolver' && sourceNode.type !== 'designAnalyst') {
                     console.warn("Remapper 'Source' input requires a Container Resolver or Design Analyst.");
                     return;
                 }
            }
        }

        // Design Analyst Validation Rules
        if (targetNode.type === 'designAnalyst') {
            const handle = params.targetHandle || '';

            if (handle === 'knowledge-in') {
                if (sourceNode.type !== 'knowledge') {
                    console.warn("Design Analyst 'Knowledge' input requires a Knowledge Node source.");
                    return;
                }
            } else if (handle.startsWith('source-in')) {
                if (sourceNode.type !== 'containerResolver') {
                    console.warn("Design Analyst 'Source' requires a Container Resolver.");
                    return;
                }
            } else if (handle.startsWith('target-in')) {
                if (sourceNode.type !== 'targetSplitter') {
                    console.warn("Design Analyst 'Target' requires a Target Splitter.");
                    return;
                }
            }
        }

        // Knowledge Inspector Validation Rules
        if (targetNode.type === 'knowledgeInspector') {
            if (params.targetHandle === 'knowledge-in') {
                if (sourceNode.type !== 'knowledge') {
                    console.warn("Knowledge Inspector requires a Knowledge Node source.");
                    return;
                }
            }
        }

        // Design Reviewer Validation Rules
        if (targetNode.type === 'designReviewer') {
            const handle = params.targetHandle || '';

            if (handle === 'knowledge-in') {
                if (sourceNode.type !== 'knowledge' && sourceNode.type !== 'knowledgeInspector') {
                    console.warn("Design Reviewer 'Knowledge' input requires a Knowledge Node or Inspector source.");
                    return;
                }
            } else if (handle.startsWith('payload-in')) {
                // Accepts output from Remapper OR Container Resolver (Direct Bridge Exception)
                if (sourceNode.type !== 'remapper' && sourceNode.type !== 'containerResolver') {
                    console.warn("Reviewer 'Payload Input' requires a Remapper or Container Resolver source.");
                    return;
                }
            } else if (handle.startsWith('target-in')) {
                // Accepts Target Splitter (context definition)
                if (sourceNode.type !== 'targetSplitter') {
                    console.warn("Reviewer 'Target Input' requires a Target Splitter.");
                    return;
                }
            }
        }

        // Container Preview Validation Rules (UPDATED for Multi-Instance)
        if (targetNode.type === 'containerPreview') {
            const handle = params.targetHandle || '';

            if (handle.startsWith('payload-in')) {
                // Accepts output from DesignReviewer (Polished) or Remapper (Draft)
                // Strict flow: Remapper -> Reviewer -> Preview
                if (sourceNode.type !== 'designReviewer' && sourceNode.type !== 'remapper') {
                    console.warn("Preview 'Payload Input' requires a Design Reviewer or Remapper source.");
                    return;
                }
            } else if (handle.startsWith('target-in')) {
                // Needs target definition to draw bounds accurately
                if (sourceNode.type !== 'targetSplitter') {
                    console.warn("Preview 'Target Input' requires a Target Splitter.");
                    return;
                }
            }
        }

        // Export Node Validation Update (PHASE 4: STRICT GATE)
        if (targetNode.type === 'exportPsd' && params.targetHandle?.startsWith('input-')) {
            // STRICT PRODUCTION GATE: Only accept DesignReviewer OR ContainerPreview
            if (sourceNode.type !== 'designReviewer' && sourceNode.type !== 'containerPreview') {
                console.error(`[PIPELINE VIOLATION] Export Gate Locked. Input must come from 'DesignReviewer' or 'ContainerPreview'. Attempted source: ${sourceNode.type}`);
                alert("⛔ PIPELINE ENFORCEMENT: The Export Node strictly requires a 'Design Reviewer' or 'Container Preview' connection. Direct connections from Remapper or Resolvers are prohibited in Production Mode.");
                return;
            }
        }
      }

      // 2. Apply Connection
      setEdges((eds) => {
        const targetHandle = params.targetHandle || null;
        
        // Exception: Export Node Assembly Input allows multiple connections
        const isMultiInput = targetNode?.type === 'exportPsd' && targetHandle === 'assembly-input';

        const cleanEdges = isMultiInput ? eds : eds.filter((edge) => {
          const edgeTargetHandle = edge.targetHandle || null;
          // Keep the edge if it targets a different node OR a different handle on the same node
          return edge.target !== params.target || edgeTargetHandle !== targetHandle;
        });
        
        // REMOVED: Custom Style. Uses default gray.
        return addEdge(params, cleanEdges);
      });
    },
    [nodes, setEdges]
  );

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const onReconnectEnd = useCallback((_: any, edge: Edge) => {
    if (!edgeReconnectSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, [setEdges]);

  // Register custom node types
  const nodeTypes = useMemo(() => ({
    loadPsd: LoadPSDNode,
    targetTemplate: TargetTemplateNode,
    targetSplitter: TargetSplitterNode,
    designInfo: DesignInfoNode,
    templateSplitter: TemplateSplitterNode,
    containerResolver: ContainerResolverNode,
    remapper: RemapperNode,
    designAnalyst: DesignAnalystNode, 
    designReviewer: DesignReviewerNode,
    containerPreview: ContainerPreviewNode, 
    exportPsd: ExportPSDNode,
    knowledge: KnowledgeNode,
    knowledgeInspector: KnowledgeInspectorNode, 
  }), []);

  return (
    <ProceduralStoreProvider>
      <div className="w-screen h-screen bg-[#1e1e1e]">
        <ReactFlowProvider>
          <AppInit />
          <KeyboardNavigation />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onEdgeMouseEnter={onEdgeMouseEnter} // NEW: Reactive Highlight
            onEdgeMouseLeave={onEdgeMouseLeave} // NEW: Revert Style
            nodeTypes={nodeTypes}
            minZoom={0.05}
            maxZoom={4}
            fitView
            className="bg-[#1e1e1e]"
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#334155" />
            <Controls 
              className="!bg-transparent !border-none !shadow-none [&>button]:!bg-transparent [&>button]:!border-none [&>button]:!fill-gray-400 hover:[&>button]:!fill-gray-200" 
            />
            <MiniMap 
              className="bg-slate-800 border-slate-700" 
              nodeColor="#475569" 
              maskColor="rgba(15, 23, 42, 0.6)"
            />
            
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                PSD Procedural Logic Engine
              </h1>
              <p className="text-slate-400 text-sm">
                Procedural generation graph for Adobe Photoshop files
              </p>
            </div>
          </ReactFlow>
          <ProjectControls />
        </ReactFlowProvider>
      </div>
    </ProceduralStoreProvider>
  );
};

export default App;