
import { Psd } from 'ag-psd';
import { Node, Edge } from 'reactflow';

export const MAX_BOUNDARY_VIOLATION_PERCENT = 0.03;

// --- OPTICAL METRICS ---
export interface OpticalMetrics {
  bounds: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  visualCenter: {
    x: number;
    y: number;
  };
  pixelDensity: number;
}

// --- PHASE 1: METRIC EXPANSION ---
export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ContainerDefinition {
  id: string;
  name: string;
  originalName: string;
  bounds: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  normalized: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface TemplateMetadata {
  canvas: {
    width: number;
    height: number;
  };
  containers: ContainerDefinition[];
}

// --- KNOWLEDGE INTEGRATION ---
export interface VisualAnchor {
  mimeType: string;
  data: string; // Base64 pixel data for multimodal injection
}

export interface KnowledgeContext {
  sourceNodeId: string;
  rules: string; // Distilled textual guidelines (PDF/Rules)
  visualAnchors: VisualAnchor[]; // Visual style references (Mood boards)
}

export type KnowledgeRegistry = Record<string, KnowledgeContext>;
// -----------------------------

export interface ContainerContext {
  containerName: string;
  bounds: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  canvasDimensions: {
    w: number;
    h: number;
  };
}

// --- SMART OBJECT PASSTHROUGH ---
export interface SmartObjectData {
  id: string;
  transform: number[];
  type: string;
}

export interface SerializableLayer {
  id: string;
  name: string;
  type: 'layer' | 'group' | 'generative';
  children?: SerializableLayer[];
  isVisible: boolean;
  opacity: number;
  coords: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  smartObject?: SmartObjectData;
}

export type RemapStrategy = 'STRETCH' | 'UNIFORM_FIT' | 'UNIFORM_FILL' | 'NONE';

// --- HYBRID PROTOCOL ---
export type SpatialLayoutType = 'STRETCH_FILL' | 'UNIFIED_FIT' | 'ABSOLUTE_PIN';

export interface LayerOverride {
  layerId: string;
  xOffset: number;
  yOffset: number;
  individualScale: number;
  scaleX?: number;          // Independent X scale (overrides individualScale for non-uniform scaling)
  scaleY?: number;          // Independent Y scale (overrides individualScale for non-uniform scaling)
  rotation?: number;
  citedRule?: string;
  anchorIndex?: number;

  // Phase 4D: Semantic Physics
  layoutRole?: 'flow' | 'static' | 'overlay' | 'background';
  linkedAnchorId?: string; // ID of the parent layer this overlay attaches to
  edgeAnchor?: {           // For static/UI elements: which edges to pin to
    horizontal: 'left' | 'center' | 'right';
    vertical: 'top' | 'center' | 'bottom';
  };
}

// --- PHASE 5: SEMANTIC TRIANGULATION ---
export interface TriangulationAudit {
  visual_identification: string; 
  knowledge_correlation: string; 
  metadata_validation: string;   
  evidence_count: number;        
  confidence_verdict: 'HIGH' | 'MEDIUM' | 'LOW';
}
// ----------------------------------------

export interface LayoutStrategy {
  method?: 'GEOMETRIC' | 'GENERATIVE' | 'HYBRID';
  suggestedScale: number;
  anchor: 'TOP' | 'CENTER' | 'BOTTOM' | 'STRETCH';
  spatialLayout?: SpatialLayoutType; // Hybrid Protocol Strategy
  generativePrompt: string;
  semanticAnchors?: string[]; // Procedural Feature Extraction
  forceGeometryChange?: boolean; // Flag to indicate significant aspect ratio shift
  reasoning: string;

  // Phase 1 Prompt Engineering: Visual Analysis & Rule Citation
  visualAnalysis?: string; // Detailed description of what the AI sees in the source image
  rulesApplied?: Array<{ rule: string; application: string }>; // Citation of applied knowledge rules
  overrides?: LayerOverride[];
  directives?: string[]; 
  replaceLayerId?: string | null; 
  safetyReport?: {
    allowedBleed: boolean;
    violationCount: number;
  };
  
  // Logic Gate Flags
  isExplicitIntent?: boolean;
  clearance?: boolean;
  generationAllowed?: boolean; 
  
  // Visual Grounding
  sourceReference?: string; 
  knowledgeApplied?: boolean; 
  knowledgeMuted?: boolean; 
  
  // Phase 5: Confidence Audit
  triangulation?: TriangulationAudit; 

  // Phase 4D: Physics & Layout Engine
  layoutMode?: 'STANDARD' | 'DISTRIBUTE_HORIZONTAL' | 'DISTRIBUTE_VERTICAL' | 'GRID';
  physicsRules?: {
      preventOverlap?: boolean;
      preventClipping?: boolean;
  };
}

// --- PHASE 2: 3-STAGE SEMANTIC PIPELINE ---
export interface SourceAnalysis {
  // Narrative understanding
  narrative: string;           // What story/purpose does this convey?
  userExperience: string;      // What is the user supposed to do/feel?

  // Element identification
  primaryElements: string[];   // Main characters/objects (e.g., ["potion_red", "potion_blue", "potion_green"])
  secondaryElements: string[]; // Supporting elements (e.g., ["title_text", "prize_labels"])
  backgroundElements: string[];// Background/decorative (e.g., ["library_bg", "cobwebs"])

  // Visual hierarchy
  attentionOrder: string[];    // What draws the eye: 1st, 2nd, 3rd... (e.g., ["potions", "title", "prizes"])
  dominantElement: string;     // Single most important element

  // Spatial rationale
  arrangement: string;         // How elements are arranged (e.g., "3 potions in triangular formation")
  arrangementRationale: string;// WHY this arrangement (e.g., "Triangle creates stable, balanced choice presentation")
  keyRelationships: string[];  // Spatial relationships that matter (e.g., ["potions equidistant", "title above choices"])

  // Preservation priorities (ordered)
  mustPreserve: string[];      // What MUST be maintained (e.g., ["all 3 choices visible", "equal visual weight"])
  canAdapt: string[];          // What can be rearranged (e.g., ["potion formation", "spacing"])
  canScale: string[];          // What can be scaled down (e.g., ["prize labels", "decorative elements"])
}

export interface VerificationIssue {
  type: 'missing_element' | 'hierarchy_violation' | 'balance_issue' | 'cropping' | 'other';
  description: string;
  suggestedFix: string;
}

export interface VerificationResult {
  passed: boolean;

  // Semantic checks
  narrativePreserved: boolean;
  hierarchyMaintained: boolean;
  allElementsVisible: boolean;

  // Specific issues (if any)
  issues: VerificationIssue[];

  // If failed, provide corrected strategy
  correctedOverrides?: LayerOverride[];
  correctedScale?: number;

  // Confidence
  confidenceScore: number; // 0-1
  verificationNotes: string;
}
// ----------------------------------------

export interface ReviewerStrategy {
    CARO_Audit: string;
    overrides: LayerOverride[];
}

// --- FEEDBACK LOOP ---
export interface FeedbackStrategy {
  overrides: LayerOverride[];
  directives?: string[];
  isCommitted?: boolean;
}

export type FeedbackRegistry = Record<string, Record<string, FeedbackStrategy>>;

export interface TransformedLayer extends SerializableLayer {
  transform: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
    rotation?: number; 
  };
  children?: TransformedLayer[];
  generativePrompt?: string;

  // Phase 4D: Hydration for Reviewer Visibility
  layoutRole?: 'flow' | 'static' | 'overlay' | 'background';
  linkedAnchorId?: string;
  citedRule?: string;
}

export interface MappingContext {
  container: ContainerContext;
  layers: SerializableLayer[] | TransformedLayer[];
  status: 'resolved' | 'empty' | 'transformed';
  message?: string;
  aiStrategy?: LayoutStrategy;
  previewUrl?: string; 
  targetDimensions?: { w: number, h: number };
  generationAllowed?: boolean; 
  contentBounds?: BoundingBox; // Phase 1: Metric Expansion (Visual AABB)
}

export interface ValidationIssue {
  layerName: string;
  containerName: string;
  type: 'PROCEDURAL_VIOLATION';
  message: string;
}

export interface DesignValidationReport {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface TargetAssembly {
  targetDimensions: {
    width: number;
    height: number;
  };
  slots: {
    containerName: string;
    isFilled: boolean;
    assignedLayerCount: number;
  }[];
}

export interface TransformedPayload {
  status: 'success' | 'error' | 'idle' | 'awaiting_confirmation';
  sourceNodeId: string;
  sourceContainer: string;
  targetContainer: string;
  layers: TransformedLayer[];
  scaleFactor: number;
  metrics: {
    source: { w: number, h: number };
    target: { w: number, h: number };
  };
  targetBounds?: {
      x: number;
      y: number;
      w: number;
      h: number;
  };
  requiresGeneration?: boolean;
  previewUrl?: string;
  isConfirmed?: boolean;
  isTransient?: boolean; 
  isSynthesizing?: boolean; 
  sourceReference?: string; 
  generationId?: number; 
  generationAllowed?: boolean; 
  isPolished?: boolean; 
  activeStrategy?: SpatialLayoutType; // Hybrid Protocol Strategy Active on Payload
  
  directives?: string[]; 
  isMandatory?: boolean; 
  
  replaceLayerId?: string | null; 
  triangulation?: TriangulationAudit; 
}

export interface RemapperConfig {
  targetContainerName: string | null;
  strategy?: RemapStrategy;
  generationAllowed?: boolean; 
}

export interface InstanceSettings {
  generationAllowed?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  parts: { text: string }[];
  strategySnapshot?: LayoutStrategy;
  timestamp: number;
}

export interface AnalystInstanceState {
  chatHistory: ChatMessage[];
  layoutStrategy: LayoutStrategy | null;
  isKnowledgeMuted: boolean;
}

export interface ReviewerInstanceState {
  chatHistory: ChatMessage[];
  reviewerStrategy: ReviewerStrategy | null;
}

export interface InspectorState {
  selectedContainer: string;
}

export interface PSDNodeData {
  fileName: string | null;
  template: TemplateMetadata | null;
  validation: DesignValidationReport | null;
  designLayers: SerializableLayer[] | null;
  linkedFiles?: any[]; // Retained optionally to prevent immediate breakage in legacy nodes, but deprecated
  containerContext?: ContainerContext | null;
  mappingContext?: MappingContext | null; 
  targetAssembly?: TargetAssembly | null; 
  remapperConfig?: RemapperConfig | null; 
  transformedPayload?: TransformedPayload | null; 
  knowledgeContext?: KnowledgeContext | null; 
  previewImages?: Record<string, string>; 
  
  channelCount?: number;
  instanceCount?: number;
  instanceSettings?: Record<number, InstanceSettings>; 
  activeInstances?: number[]; // MASK: Specific indices to render (e.g. [0, 3] if others are skipped)
  
  analystInstances?: Record<number, AnalystInstanceState>;
  reviewerInstances?: Record<number, ReviewerInstanceState>; 
  
  inspectorState?: InspectorState;

  smartObjectReferenceId?: string; // "Backpack" Ticket ID for Smart Object Registry
  error?: string | null;
}

export interface TargetTemplateData {
  fileName: string | null;
  template: TemplateMetadata | null;
  validation: null;
  designLayers: null;
  containerContext: null;
  mappingContext: null;
  error?: string | null;
}

export interface ProjectExport {
  version: string;
  timestamp: number;
  nodes: Node<PSDNodeData>[];
  edges: Edge[];
  viewport: { x: number, y: number, zoom: number };
}

export type { Psd };
