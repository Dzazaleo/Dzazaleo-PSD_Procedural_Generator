# Qwen2.5-VL Integration Guide

This guide explains how to replace Google Gemini with a local Qwen2.5-VL model via vLLM.

## Overview

The integration uses a new abstraction layer (`aiProviderService.ts`) that allows switching between:
- **Gemini (Cloud)**: Original provider, requires API key
- **Qwen-Local (vLLM)**: Local inference via OpenAI-compatible API
- **ComfyUI**: For image generation using Qwen-Image-Edit-2511

## Files Created/Modified

| File | Description |
|------|-------------|
| `services/aiProviderService.ts` | New abstraction layer for AI providers |
| `.env.local.example` | Configuration template |
| `components/DesignAnalystNode.tsx` | Needs modification (see below) |

---

## Part 1: Server Setup (WSL2)

### Prerequisites
- Windows 10/11 with WSL2 and Ubuntu
- NVIDIA GPU with 16GB+ VRAM (7B model) or 8GB+ (3B model)
- NVIDIA drivers 550.xx+

### Installation

```bash
# In WSL Ubuntu
python3 -m venv ~/vllm-env
source ~/vllm-env/bin/activate
pip install vllm

# Launch server
vllm serve Qwen/Qwen2.5-VL-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --gpu-memory-utilization 0.90 \
  --trust-remote-code
```

### Verify Server

```bash
curl http://localhost:8000/v1/models
```

---

## Part 2: Modify DesignAnalystNode.tsx

### Step 1: Update Imports

Replace:
```typescript
import { GoogleGenAI, Type } from "@google/genai";
```

With:
```typescript
import {
  generateCompletion,
  generateImageWithComfyUI,
  getAIProviderConfig,
  ContentPart,
  StructuredOutputSchema
} from '../services/aiProviderService';
```

### Step 2: Update Model Configuration

Replace the `MODELS` constant with a provider-agnostic version:

```typescript
type ModelKey = 'flash' | 'standard' | 'deep';

const MODELS: Record<ModelKey, ModelConfig> = {
  'flash': {
    apiModel: 'qwen-2.5-vl-3b',  // Fast, lower quality
    label: 'FLASH',
    badgeClass: 'bg-yellow-500 text-yellow-950 border-yellow-400',
    headerClass: 'border-yellow-500/50 bg-yellow-900/20'
  },
  'standard': {
    apiModel: 'qwen-2.5-vl-7b',  // Balanced
    label: 'STANDARD',
    badgeClass: 'bg-blue-600 text-white border-blue-500',
    headerClass: 'border-blue-500/50 bg-blue-900/20'
  },
  'deep': {
    apiModel: 'qwen-2.5-vl-7b',  // Same model, higher token budget
    label: 'DEEP THINKING',
    badgeClass: 'bg-purple-600 text-white border-purple-500',
    headerClass: 'border-purple-500/50 bg-purple-900/20',
    thinkingBudget: 16384
  }
};
```

### Step 3: Replace performAnalysis Function

The core `performAnalysis` function (around line 876) needs these changes:

```typescript
const performAnalysis = async (index: number, history: ChatMessage[]) => {
    const sourceData = getSourceData(index);
    const targetData = getTargetData(index);
    if (!sourceData || !targetData) return;

    const instanceState = analystInstances[index] || DEFAULT_INSTANCE_STATE;
    const modelConfig = MODELS[instanceState.selectedModel as ModelKey];
    const isMuted = instanceState.isKnowledgeMuted || false;

    const targetName = targetData.name.toUpperCase();
    const globalRules = scopes['GLOBAL CONTEXT'] || [];
    const specificRules = scopes[targetName] || [];

    const effectiveRules = (!isMuted && activeKnowledge)
        ? [...globalRules, ...specificRules].join('\n')
        : null;

    const effectiveKnowledge = (!isMuted && activeKnowledge) ? activeKnowledge : null;

    setAnalyzingInstances(prev => ({ ...prev, [index]: true }));

    try {
        const systemInstruction = generateSystemInstruction(sourceData, targetData, effectiveRules);
        const sourcePixelsBase64 = await extractSourcePixels(
            sourceData.layers as SerializableLayer[],
            sourceData.container.bounds
        );

        // Build messages in OpenAI format
        const messages: { role: 'user' | 'assistant'; content: ContentPart[] }[] = [];

        for (const msg of history) {
            const content: ContentPart[] = [];

            // For the last user message, inject images
            if (msg.role === 'user' && msg === history[history.length - 1]) {
                // Add visual anchors
                if (effectiveKnowledge?.visualAnchors) {
                    effectiveKnowledge.visualAnchors.forEach((anchor, idx) => {
                        content.push({ type: 'text', text: `[VISUAL_ANCHOR_${idx}]` });
                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:${anchor.mimeType};base64,${anchor.data}`,
                                detail: 'high'
                            }
                        });
                    });
                    if (effectiveKnowledge.visualAnchors.length > 0) {
                        content.push({
                            type: 'text',
                            text: 'REFERENCED VISUAL ANCHORS (Strict Style & Layout Adherence Required):'
                        });
                    }
                }

                // Add source image
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
            }

            // Add the message text
            content.push({ type: 'text', text: msg.parts[0]?.text || '' });

            messages.push({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content
            });
        }

        // Define the response schema (same as before, but in standard JSON Schema format)
        const responseSchema: StructuredOutputSchema = {
            type: 'object',
            properties: {
                reasoning: { type: 'string' },
                method: {
                    type: 'string',
                    enum: ['GEOMETRIC', 'GENERATIVE', 'HYBRID']
                },
                spatialLayout: {
                    type: 'string',
                    enum: ['STRETCH_FILL', 'UNIFIED_FIT', 'ABSOLUTE_PIN']
                },
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
                layoutMode: {
                    type: 'string',
                    enum: ['STANDARD', 'DISTRIBUTE_HORIZONTAL', 'DISTRIBUTE_VERTICAL', 'GRID']
                },
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
                            citedRule: { type: 'string' },
                            anchorIndex: { type: 'integer' },
                            layoutRole: { type: 'string', enum: ['flow', 'static', 'overlay', 'background'] },
                            linkedAnchorId: { type: 'string' }
                        },
                        required: ['layerId', 'xOffset', 'yOffset', 'individualScale']
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
            required: [
                'reasoning', 'method', 'spatialLayout', 'suggestedScale', 'anchor',
                'generativePrompt', 'semanticAnchors', 'clearance', 'overrides',
                'safetyReport', 'knowledgeApplied', 'directives', 'replaceLayerId', 'triangulation'
            ]
        };

        // Call the unified API
        const response = await generateCompletion({
            systemPrompt: systemInstruction,
            messages,
            responseSchema,
            maxTokens: modelConfig.thinkingBudget || 4096,
            temperature: 0.7
        });

        const json = response.json || JSON.parse(response.text);

        // ... rest of the function remains the same (geometry flag injection, etc.)

    } catch (e: any) {
        console.error("Analysis Failed:", e);
    } finally {
        setAnalyzingInstances(prev => ({ ...prev, [index]: false }));
    }
};
```

### Step 4: Replace generateDraft Function

Replace the `generateDraft` function with:

```typescript
const generateDraft = async (prompt: string, sourceReference?: string): Promise<string | null> => {
    const config = getAIProviderConfig();

    if (config.provider === 'qwen-local' || config.provider === 'qwen-comfyui') {
        // Use ComfyUI for image generation
        const sourceUrl = sourceReference
            ? `data:image/png;base64,${sourceReference}`
            : undefined;

        return generateImageWithComfyUI(prompt, sourceUrl, {
            width: 256,
            height: 256,
            steps: 20
        });
    }

    // Fallback to Gemini image generation
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const apiKey = import.meta.env.VITE_API_KEY;
        if (!apiKey) return null;

        const ai = new GoogleGenAI({ apiKey });
        const parts: any[] = [];

        if (sourceReference) {
            parts.push({ inlineData: { mimeType: 'image/png', data: sourceReference } });
        }
        parts.push({ text: `Generate a draft sketch (256x256) for: ${prompt}` });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { imageConfig: { aspectRatio: "1:1" } }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Draft Generation Failed", e);
        return null;
    }
};
```

---

## Part 3: Environment Configuration

Copy `.env.local.example` to `.env.local` and configure:

```bash
# For local Qwen
VITE_AI_PROVIDER=qwen-local
VITE_QWEN_BASE_URL=http://localhost:8000/v1
VITE_QWEN_MODEL=Qwen/Qwen2.5-VL-7B-Instruct
VITE_COMFYUI_URL=http://127.0.0.1:8188
```

---

## Part 4: ComfyUI Workflow for Draft Generation

Your existing Qwen-Image-Edit-2511 workflow in ComfyUI can be called via API. The `aiProviderService.ts` includes a basic workflow template.

For a custom workflow:

1. Design your workflow in ComfyUI
2. Click "Save (API Format)" to export as JSON
3. Replace the workflow object in `generateImageWithComfyUI()`

---

## Performance Comparison

| Model | VRAM | Speed | Quality |
|-------|------|-------|---------|
| Qwen2.5-VL-3B | ~8GB | Fast | Good |
| Qwen2.5-VL-7B | ~16GB | Medium | Very Good |
| Qwen2.5-VL-72B | ~48GB | Slow | Excellent |
| Gemini Pro | Cloud | Medium | Excellent |

---

## Troubleshooting

### vLLM Server Won't Start
```bash
# Check CUDA
nvidia-smi
nvcc --version

# Try with less memory
vllm serve Qwen/Qwen2.5-VL-3B-Instruct \
  --gpu-memory-utilization 0.80 \
  --max-model-len 2048
```

### Connection Refused from Browser
WSL2 network: Use `localhost` instead of `127.0.0.1`

### JSON Parse Errors
Qwen models may occasionally output markdown-wrapped JSON. The service handles this with fallback parsing.

### ComfyUI Not Responding
Ensure ComfyUI is running with `--listen` flag:
```bash
python main.py --listen 0.0.0.0
```

---

## Summary

1. **vLLM Server** handles layout analysis (replaces Gemini text+vision)
2. **ComfyUI** handles draft generation (uses your existing Qwen-Image-Edit-2511)
3. **aiProviderService.ts** provides unified interface for both
4. Switch providers via `VITE_AI_PROVIDER` environment variable
