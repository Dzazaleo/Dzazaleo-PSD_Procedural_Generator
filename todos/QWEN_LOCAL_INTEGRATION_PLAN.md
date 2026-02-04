# Qwen2.5-VL Local Integration Plan

**Target Hardware:** NVIDIA RTX 3090 Ti (24GB VRAM)
**Goal:** Replace Google Gemini with local Qwen2.5-VL for layout analysis
**Status:** Phase 2 Complete ✅

---

## Executive Summary

With 24GB VRAM, you can comfortably run **Qwen2.5-VL-7B-Instruct** (best quality/speed balance) or even **Qwen2.5-VL-32B** with INT4 quantization. This plan covers the complete integration of local Qwen inference for the DesignAnalyst node.

### Scope
- ✅ **Layout Analysis** via Ollama + Qwen2.5-VL (core feature)
- ⏸️ **Draft Generation** - Disabled for now (nice-to-have, can add later with ComfyUI)

### Infrastructure Decision
> **Note:** Originally planned for vLLM on WSL2, but due to FlashAttention segfaults with vision-language models on WSL, we pivoted to **Ollama on native Windows**. This provides a more stable experience with the same OpenAI-compatible API.

---

## Phase 1: Infrastructure Setup ✅ COMPLETE

> **Implementation Note:** Originally planned for vLLM on WSL2, but FlashAttention causes segfaults with vision-language models on WSL. Pivoted to Ollama on native Windows.

### Task 1.1: Install Ollama on Windows ✅
- [x] Download and install Ollama from https://ollama.com/download/windows
- [x] Ollama runs as a Windows service (auto-starts)

### Task 1.2: Pull Qwen2.5-VL Model ✅
```powershell
ollama pull qwen2.5vl:7b
```
- [x] Model downloaded (~4.7GB quantized GGUF format)
- [x] Stored in `%USERPROFILE%\.ollama\models`

### Task 1.3: Verify Server ✅
```powershell
# Test model works
ollama run qwen2.5vl:7b "Hello, can you see images?"

# Test API endpoint
curl http://localhost:11434/v1/models
```
- [x] Server responds with model list
- [x] Model responds to prompts

### Server Details
| Setting | Value |
|---------|-------|
| API Base URL | `http://localhost:11434/v1` |
| Model Name | `qwen2.5vl:7b` |
| API Key | Not required (use empty string or "ollama") |
| Format | OpenAI-compatible |

### Cleanup (Optional)
The WSL vLLM setup is no longer needed. To reclaim disk space:
```bash
# In WSL Ubuntu
rm -rf ~/qwen-vllm  # ~15GB HuggingFace model + venv
```

---

## Phase 2: Application Integration ✅ COMPLETE

### Task 2.1: Environment Configuration
**Priority:** High | **Estimated Time:** 5 mins | **STATUS: COMPLETE ✅**

- [x] Update `.env.local` for Ollama:
  ```bash
  # Switch to local Qwen
  VITE_AI_PROVIDER=qwen-local

  # Ollama server endpoint (NOT vLLM)
  VITE_QWEN_BASE_URL=http://localhost:11434/v1
  VITE_QWEN_MODEL=qwen2.5vl:7b

  # Keep Gemini key as fallback
  VITE_API_KEY=your-existing-gemini-key

  # ComfyUI for image generation (optional)
  VITE_COMFYUI_URL=http://127.0.0.1:8188
  ```

### Task 2.2: Verify aiProviderService.ts Exists
**Priority:** High | **Estimated Time:** 2 mins | **STATUS: COMPLETE**

- [x] Confirm file exists at `services/aiProviderService.ts`
- [x] If not, it needs to be created (see Phase 3)

### Task 2.2.1: Critical - vLLM API Format Requirements
**Priority:** High | **Must understand before implementation** | **STATUS: COMPLETE (implemented in aiProviderService.ts)**

> **IMPORTANT:** vLLM's OpenAI-compatible API has specific format requirements that differ from how the code abstracts them. The `aiProviderService.ts` must handle these translations internally.

#### System Prompt Handling
vLLM expects the system prompt as a **message** with `role: "system"`, NOT as a separate parameter:

```typescript
// CORRECT - How vLLM expects it
const body = {
  model: "Qwen/Qwen2.5-VL-7B-Instruct",
  messages: [
    { role: "system", content: systemPrompt },  // <-- System as first message
    { role: "user", content: [...] },
    { role: "assistant", content: [...] },
    // ... rest of conversation
  ],
  // ...
};
```

#### Structured Output Format
vLLM uses `response_format` with nested `json_schema`, NOT a top-level `responseSchema`:

```typescript
// CORRECT - How vLLM expects structured output
const body = {
  model: "Qwen/Qwen2.5-VL-7B-Instruct",
  messages: [...],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "layout_strategy",
      schema: responseSchema  // <-- Your schema goes here
    }
  },
  max_tokens: 4096,
  temperature: 0.7
};
```

#### Image Content Format
Images use `image_url` type with base64 data URLs (this is correct in the plan):

```typescript
{
  type: "image_url",
  image_url: {
    url: "data:image/png;base64,${base64Data}",
    detail: "high"
  }
}
```

#### JSON Response Parsing
Qwen may wrap JSON responses in markdown code blocks. The `aiProviderService.ts` must strip these:

```typescript
function parseJsonResponse(content: string): any {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return JSON.parse(cleaned.trim());
}
```

---

### Task 2.3: Modify DesignAnalystNode.tsx
**Priority:** High | **Estimated Time:** 45 mins | **STATUS: COMPLETE ✅**

#### Step A: Update Imports (Line ~10)

**Current:**
```typescript
import { GoogleGenAI, Type } from "@google/genai";
```

**Replace with:**
```typescript
import {
  generateCompletion,
  generateImageWithComfyUI,
  getAIProviderConfig,
  checkQwenServerHealth,
  ContentPart,
  StructuredOutputSchema
} from '../services/aiProviderService';
```

#### Step B: Add Health Check Indicator

- [x] Add state for server status:
  ```typescript
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkServer = async () => {
      const config = getAIProviderConfig();
      if (config.provider === 'qwen-local') {
        const healthy = await checkQwenServerHealth();
        setServerStatus(healthy ? 'online' : 'offline');
      } else {
        setServerStatus('online'); // Gemini assumed online
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);
  ```

#### Step C: Modify performAnalysis Function (Line ~876)

**Key Changes:**

1. Replace `GoogleGenAI` instantiation with `generateCompletion()`
2. Convert message format from Gemini to OpenAI style
3. Convert schema from Gemini Type to JSON Schema

**Full replacement function:**
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

        // Build messages in provider-agnostic format
        const messages: { role: 'user' | 'assistant'; content: ContentPart[] }[] = [];

        for (const msg of history) {
            const content: ContentPart[] = [];

            // For the last user message, inject images
            if (msg.role === 'user' && msg === history[history.length - 1]) {
                // Add visual anchors from knowledge
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

                // Add source container image
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
            required: ['reasoning', 'method', 'spatialLayout', 'suggestedScale', 'anchor',
                       'generativePrompt', 'semanticAnchors', 'clearance', 'overrides',
                       'safetyReport', 'knowledgeApplied', 'directives', 'replaceLayerId', 'triangulation']
        };

        // Call unified AI provider
        const response = await generateCompletion({
            systemPrompt: systemInstruction,
            messages,
            responseSchema,
            maxTokens: modelConfig.thinkingBudget || 4096,
            temperature: 0.7
        });

        const json = response.json || {};

        // --- GEOMETRY FLAG INJECTION ---
        const sourceRatio = sourceData.container.bounds.w / sourceData.container.bounds.h;
        const targetRatio = targetData.bounds.w / targetData.bounds.h;
        json.forceGeometryChange = Math.abs(sourceRatio - targetRatio) > 0.15;

        // Handle generative source reference
        if ((json.method === 'GENERATIVE' || json.method === 'HYBRID') && json.replaceLayerId) {
            const isolatedTexture = await extractSourcePixels(
                sourceData.layers as SerializableLayer[],
                sourceData.container.bounds,
                json.replaceLayerId
            );
            if (isolatedTexture) {
                json.sourceReference = isolatedTexture.split(',')[1];
            } else if (sourcePixelsBase64) {
                json.sourceReference = sourcePixelsBase64.split(',')[1];
            }
        } else if (json.method === 'GENERATIVE' || json.method === 'HYBRID') {
            if (sourcePixelsBase64) {
                json.sourceReference = sourcePixelsBase64.split(',')[1];
            }
        }

        if (isMuted) json.knowledgeMuted = true;

        const newAiMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'model',
            parts: [{ text: response.text || '' }],
            strategySnapshot: json,
            timestamp: Date.now()
        };

        const finalHistory = [...history, newAiMessage];
        updateInstanceState(index, { chatHistory: finalHistory, layoutStrategy: json });

        const isExplicitIntent = history.some(msg =>
            msg.role === 'user' && /\b(generate|recreate|nano banana)\b/i.test(msg.parts[0].text)
        );

        const augmentedContext: MappingContext = {
            ...sourceData,
            aiStrategy: { ...json, isExplicitIntent },
            previewUrl: undefined,
            targetDimensions: targetData ? { w: targetData.bounds.w, h: targetData.bounds.h } : undefined
        };

        registerResolved(id, `source-out-${index}`, augmentedContext);

        // Generate draft preview if generative method
        if ((json.method === 'GENERATIVE' || json.method === 'HYBRID') && json.generativePrompt) {
            if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
            draftTimeoutRef.current = setTimeout(async () => {
                const url = await generateDraft(json.generativePrompt, json.sourceReference);
                if (url) {
                    const contextWithPreview: MappingContext = {
                        ...augmentedContext,
                        previewUrl: url,
                        message: "Free Preview: Draft"
                    };
                    registerResolved(id, `source-out-${index}`, contextWithPreview);
                }
            }, 500);
        }

    } catch (e: any) {
        console.error("Analysis Failed:", e);
    } finally {
        setAnalyzingInstances(prev => ({ ...prev, [index]: false }));
    }
};
```

#### Step D: Update generateDraft Function (Line ~669)

**Replace with:**
```typescript
const generateDraft = async (prompt: string, sourceReference?: string): Promise<string | null> => {
    const config = getAIProviderConfig();

    // Use ComfyUI for local image generation
    if (config.provider === 'qwen-local') {
        const sourceUrl = sourceReference
            ? `data:image/png;base64,${sourceReference}`
            : undefined;

        return generateImageWithComfyUI(prompt, sourceUrl, {
            width: 256,
            height: 256,
            steps: 20
        });
    }

    // Fallback: Gemini image generation
    try {
        const apiKey = import.meta.env.VITE_API_KEY;
        if (!apiKey) return null;

        const { GoogleGenAI } = await import('@google/genai');
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

## Phase 3: ComfyUI Integration (DEFERRED)

> **Status:** Skipped for initial implementation. Draft generation will be disabled.
> Can be added later if needed.

~~### Task 3.1: Export Your Workflow as API Format~~
~~### Task 3.2: Update aiProviderService.ts Workflow~~
~~### Task 3.3: Test ComfyUI API~~

**To enable later:** Uncomment ComfyUI code in `aiProviderService.ts` and configure `VITE_COMFYUI_URL`.

---

## Phase 4: Testing & Validation

### Task 4.1: Unit Test - Server Connection
**Priority:** High | **Estimated Time:** 5 mins

- [ ] Verify Ollama is running (it auto-starts as a Windows service)
- [ ] Start dev server: `npm run dev`
- [ ] Open browser console
- [ ] Run:
  ```javascript
  fetch('http://localhost:11434/v1/models')
    .then(r => r.json())
    .then(console.log)
  ```

### Task 4.2: Integration Test - DesignAnalyst Node
**Priority:** High | **Estimated Time:** 15 mins

- [ ] Load a test PSD with `!!TEMPLATE` containers
- [ ] Connect LoadPSD → TemplateSplitter → ContainerResolver → DesignAnalyst
- [ ] Connect TargetTemplate → TargetSplitter → DesignAnalyst
- [ ] Click "Run Design Analysis"
- [ ] Verify JSON strategy is returned

### Task 4.3: Visual Test - Layout Strategy
**Priority:** High | **Estimated Time:** 10 mins

- [ ] Verify `spatialLayout` is correctly assigned
- [ ] Verify `overrides` contain valid layer IDs
- [ ] Verify `triangulation` confidence scores
- [ ] Connect to Remapper and verify transforms apply

### Task 4.4: Performance Benchmark
**Priority:** Medium | **Estimated Time:** 10 mins

- [ ] Measure analysis time with Qwen-local
- [ ] Compare with Gemini (if switching back)
- [ ] Document results:
  | Provider | Avg Time | Quality |
  |----------|----------|---------|
  | Qwen-7B  | ___s     | ___/10  |
  | Gemini   | ___s     | ___/10  |

---

## Phase 5: Optimization (Optional)

### Task 5.1: Try Larger Model (32B with AWQ)
**Priority:** Low | **Estimated Time:** 30 mins

With 24GB VRAM, you might fit Qwen2.5-VL-32B-AWQ:

```bash
# Install AWQ support
pip install autoawq

# Try 32B AWQ model
vllm serve Qwen/Qwen2.5-VL-32B-Instruct-AWQ \
  --host 0.0.0.0 \
  --port 8000 \
  --gpu-memory-utilization 0.95 \
  --max-model-len 4096 \
  --trust-remote-code \
  --quantization awq
```

### Task 5.2: Add Model Switching in UI
**Priority:** Low | **Estimated Time:** 30 mins

- [ ] Add dropdown to switch between:
  - Qwen2.5-VL-3B (Fast)
  - Qwen2.5-VL-7B (Balanced)
  - Gemini Pro (Cloud)

---

## Quick Reference Commands

### Start Everything (Run in order)

```powershell
# Ollama runs automatically as a Windows service - no action needed!

# Terminal 1: ComfyUI (Windows CMD) - Optional, only for draft generation
cd C:\path\to\ComfyUI
python main.py --listen

# Terminal 2: Dev Server (Windows CMD)
cd E:\RANDOM_STUFF\VIBE\PSD_PROCEDURAL_GENERATOR\PSD_Procedural_Generator
npm run dev
```

### Health Checks

```powershell
# Ollama
curl http://localhost:11434/v1/models

# ComfyUI (optional)
curl http://127.0.0.1:8188/system_stats

# Should return JSON
```

### Switch Providers

```bash
# In .env.local:

# Use local Qwen (Ollama)
VITE_AI_PROVIDER=qwen-local

# Use cloud Gemini
VITE_AI_PROVIDER=gemini
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused` on 11434 | Restart Ollama service: `ollama serve` in terminal, or restart Windows |
| `CUDA out of memory` | Ollama auto-manages VRAM, but try stopping other GPU apps |
| `JSON parse error` | Qwen may wrap JSON in markdown - aiProviderService handles this |
| `Slow inference` | Normal for 7B model. First request loads model (~10-20s), subsequent are faster |
| `Model not found` | Run `ollama list` to verify model name, re-pull if needed |
| `ComfyUI timeout` | Increase timeout in aiProviderService or check workflow |
| `model runner has unexpectedly stopped` with qwen2.5vl | **Known Issue**: qwen2.5vl crashes during vision inference due to OOM. Switch to `minicpm-v:8b` which is more stable for vision tasks |

### Critical Issue: qwen2.5vl Vision Crashes

**Problem**: When sending images to qwen2.5vl:7b, Ollama returns error 500 with "model runner has unexpectedly stopped". This occurs even with small images.

**Root Cause**: qwen2.5vl tokenizes images into many tokens, requiring significant additional VRAM beyond the base model load (~14GB). During image inference, the model attempts to allocate more memory than available, causing OOM crashes ([GitHub Issue #10753](https://github.com/ollama/ollama/issues/10753)).

**Solution**: Use **minicpm-v:8b** instead, which handles vision tasks more efficiently:
```powershell
ollama pull minicpm-v:8b
```

Update `.env.local`:
```bash
VITE_QWEN_MODEL=minicpm-v:8b
```

---

## Hardware Utilization (3090 Ti 24GB)

| Configuration | VRAM Usage | Performance | Vision Stability |
|---------------|------------|-------------|------------------|
| minicpm-v:8b | ~6GB | Good balance | **Stable** ✅ |
| Qwen2.5-VL-7B | ~14GB base | Higher quality | **Crashes with images** ❌ |
| Qwen2.5-VL-32B AWQ | ~22GB | Highest quality | Untested |
| Qwen2.5-VL-3B BF16 | ~8GB | Fastest | May have same issues |

**Recommended:** `minicpm-v:8b` - stable vision model that works reliably with images and leaves ~18GB for ComfyUI operations.

---

## Completion Checklist

- [x] Phase 1: Infrastructure Setup ✅
  - [x] Ollama installed on Windows
  - [x] Vision model pulled (switched from `qwen2.5vl:7b` to `minicpm-v:8b` due to vision crashes)
  - [x] Server verified at `http://localhost:11434/v1`
  - ~~WSL2/vLLM approach abandoned due to FlashAttention segfaults~~
  - ~~qwen2.5vl:7b abandoned due to OOM crashes with images~~

- [x] Phase 2: Application Integration ✅ COMPLETE
  - [x] .env.local updated for Ollama endpoint (port 11434, model minicpm-v:8b)
  - [x] aiProviderService.ts present
  - [x] aiProviderService.ts updated for Ollama endpoint (port 11434, model name)
  - [x] aiProviderService.ts handles Ollama API format (system prompt as message, response_format.json_object)
  - [x] aiProviderService.ts strips markdown code fences from JSON responses
  - [x] DesignAnalystNode.tsx modified
  - [x] Imports updated
  - [x] performAnalysis updated
  - [x] generateDraft disabled/simplified

- [ ] ~~Phase 3: ComfyUI Integration~~ (DEFERRED)

- [ ] Phase 4: Testing
  - [ ] Server connection works from app
  - [ ] Analysis returns valid JSON
  - [ ] Layout transforms correctly
  - [ ] Performance acceptable

---

---

## Model Directory Structure

After setup, your `E:\RANDOM_STUFF\VIBE\PSD_PROCEDURAL_GENERATOR\MODELS` folder will look like:

```
MODELS/
├── qwen_image_edit_2511_fp8mixed.safetensors    # ComfyUI (already exists)
├── huggingface/
│   └── hub/
│       └── models--Qwen--Qwen2.5-VL-7B-Instruct/
│           ├── blobs/           # Large model weight files (~15GB)
│           ├── refs/
│           └── snapshots/
```

This keeps all your AI models organized in one location on your E: drive.

---

**Document Version:** 1.3
**Last Updated:** 2026-02-04
**Author:** Claude Code

### Changelog
- **v1.3** - **Major pivot**: Replaced vLLM/WSL with Ollama on Windows due to FlashAttention segfaults. Updated all endpoints from :8000 to :11434, model name to `qwen2.5vl:7b`. Phase 1 now complete.
- **v1.2** - Added vLLM version requirement (>=0.11.0), multimodal limit flag, and critical API format documentation for structured outputs and system prompts
- **v1.1** - Initial plan with deferred ComfyUI integration
