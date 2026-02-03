# Qwen2.5-VL Local Integration Plan

**Target Hardware:** NVIDIA RTX 3090 Ti (24GB VRAM)
**Goal:** Replace Google Gemini with local Qwen2.5-VL for layout analysis
**Status:** Planning Phase

---

## Executive Summary

With 24GB VRAM, you can comfortably run **Qwen2.5-VL-7B-Instruct** (best quality/speed balance) or even **Qwen2.5-VL-32B** with INT4 quantization. This plan covers the complete integration of local Qwen inference for the DesignAnalyst node.

### Scope
- ✅ **Layout Analysis** via vLLM + Qwen2.5-VL (core feature)
- ⏸️ **Draft Generation** - Disabled for now (nice-to-have, can add later with ComfyUI)

---

## Phase 1: Infrastructure Setup

### Task 1.1: WSL2 Environment Setup
**Priority:** High | **Estimated Time:** 30 mins

- [ ] Verify WSL2 is installed and running Ubuntu
  ```powershell
  # PowerShell (Admin)
  wsl --list --verbose
  # Should show Ubuntu with VERSION 2
  ```

- [ ] If not installed:
  ```powershell
  wsl --install -d Ubuntu-22.04
  wsl --set-default-version 2
  # Reboot Windows
  ```

- [ ] Verify GPU passthrough works in WSL:
  ```bash
  # Inside WSL
  nvidia-smi
  # Should show your 3090 Ti
  ```

### Task 1.2: CUDA Toolkit in WSL
**Priority:** High | **Estimated Time:** 20 mins

- [ ] Install CUDA toolkit for WSL:
  ```bash
  # Inside WSL Ubuntu
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y build-essential python3-dev python3-venv python3-pip git

  # Install CUDA for WSL
  wget https://developer.download.nvidia.com/compute/cuda/repos/wsl-ubuntu/x86_64/cuda-keyring_1.1-1_all.deb
  sudo dpkg -i cuda-keyring_1.1-1_all.deb
  sudo apt update
  sudo apt install -y cuda-toolkit-12-6

  # Add to PATH
  echo 'export PATH="/usr/local/cuda-12.6/bin:$PATH"' >> ~/.bashrc
  echo 'export LD_LIBRARY_PATH="/usr/local/cuda-12.6/lib64:$LD_LIBRARY_PATH"' >> ~/.bashrc
  source ~/.bashrc
  ```

- [ ] Verify CUDA:
  ```bash
  nvcc --version
  # Should show CUDA 12.6
  ```

### Task 1.3: vLLM Installation
**Priority:** High | **Estimated Time:** 15 mins

- [ ] Create Python virtual environment:
  ```bash
  python3 -m venv ~/vllm-env
  source ~/vllm-env/bin/activate
  pip install --upgrade pip wheel setuptools
  ```

- [ ] Install vLLM (requires v0.11.0+ for Qwen2.5-VL support):
  ```bash
  pip install "vllm>=0.11.0"
  # This will take a few minutes
  ```

- [ ] Install additional dependencies for vision models:
  ```bash
  pip install qwen-vl-utils pillow
  ```

### Task 1.4: Configure Custom Model Directory
**Priority:** High | **Estimated Time:** 5 mins

Your models will be stored at:
- **Windows Path:** `E:\RANDOM_STUFF\VIBE\PSD_PROCEDURAL_GENERATOR\MODELS`
- **WSL Path:** `/mnt/e/RANDOM_STUFF/VIBE/PSD_PROCEDURAL_GENERATOR/MODELS`

Current contents:
- `qwen_image_edit_2511_fp8mixed.safetensors` (ComfyUI - already present)
- `Qwen2.5-VL-7B-Instruct/` (will be downloaded here)

- [ ] Add HuggingFace cache redirect to `~/.bashrc`:
  ```bash
  echo 'export HF_HOME="/mnt/e/RANDOM_STUFF/VIBE/PSD_PROCEDURAL_GENERATOR/MODELS/huggingface"' >> ~/.bashrc
  echo 'export TRANSFORMERS_CACHE="/mnt/e/RANDOM_STUFF/VIBE/PSD_PROCEDURAL_GENERATOR/MODELS/huggingface"' >> ~/.bashrc
  source ~/.bashrc
  ```

- [ ] Create the directory structure:
  ```bash
  mkdir -p /mnt/e/RANDOM_STUFF/VIBE/PSD_PROCEDURAL_GENERATOR/MODELS/huggingface
  ```

### Task 1.5: Download and Test Model
**Priority:** High | **Estimated Time:** 20 mins (depends on internet)

- [ ] Download the model to your custom location (~15GB):
  ```bash
  source ~/vllm-env/bin/activate

  # Verify HF_HOME is set correctly
  echo $HF_HOME
  # Should show: /mnt/e/RANDOM_STUFF/VIBE/PSD_PROCEDURAL_GENERATOR/MODELS/huggingface

  # Test download and inference
  python -c "
  from vllm import LLM
  llm = LLM(model='Qwen/Qwen2.5-VL-7B-Instruct', trust_remote_code=True)
  print('Model loaded successfully!')
  "
  ```

- [ ] Verify model downloaded to correct location:
  ```bash
  ls -la /mnt/e/RANDOM_STUFF/VIBE/PSD_PROCEDURAL_GENERATOR/MODELS/huggingface/hub/
  # Should show: models--Qwen--Qwen2.5-VL-7B-Instruct
  ```

- [ ] Create startup script (`~/start-qwen-server.sh`):
  ```bash
  #!/bin/bash
  source ~/vllm-env/bin/activate

  # Ensure custom model path is used
  export HF_HOME="/mnt/e/RANDOM_STUFF/VIBE/PSD_PROCEDURAL_GENERATOR/MODELS/huggingface"
  export TRANSFORMERS_CACHE="$HF_HOME"

  vllm serve Qwen/Qwen2.5-VL-7B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --gpu-memory-utilization 0.85 \
    --max-model-len 8192 \
    --trust-remote-code \
    --dtype bfloat16 \
    --limit-mm-per-prompt image=10
  ```

- [ ] Make executable:
  ```bash
  chmod +x ~/start-qwen-server.sh
  ```

### Task 1.6: Verify Server
**Priority:** High | **Estimated Time:** 5 mins

- [ ] Start the server:
  ```bash
  ~/start-qwen-server.sh
  ```

- [ ] Test from Windows (new terminal):
  ```powershell
  # Test endpoint
  curl http://localhost:8000/v1/models

  # Should return JSON with model info
  ```

- [ ] Test multimodal inference:
  ```bash
  curl http://localhost:8000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
      "model": "Qwen/Qwen2.5-VL-7B-Instruct",
      "messages": [{"role": "user", "content": "Hello, describe what you can do"}],
      "max_tokens": 100
    }'
  ```

---

## Phase 2: Application Integration

### Task 2.1: Environment Configuration
**Priority:** High | **Estimated Time:** 5 mins

- [ ] Update `.env.local`:
  ```bash
  # Switch to local Qwen
  VITE_AI_PROVIDER=qwen-local

  # vLLM server endpoint
  VITE_QWEN_BASE_URL=http://localhost:8000/v1
  VITE_QWEN_MODEL=Qwen/Qwen2.5-VL-7B-Instruct

  # Keep Gemini key as fallback
  VITE_API_KEY=your-existing-gemini-key

  # ComfyUI for image generation
  VITE_COMFYUI_URL=http://127.0.0.1:8188
  ```

### Task 2.2: Verify aiProviderService.ts Exists
**Priority:** High | **Estimated Time:** 2 mins

- [ ] Confirm file exists at `services/aiProviderService.ts`
- [ ] If not, it needs to be created (see Phase 3)

### Task 2.2.1: Critical - vLLM API Format Requirements
**Priority:** High | **Must understand before implementation**

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
**Priority:** High | **Estimated Time:** 45 mins

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

- [ ] Add state for server status:
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

- [ ] Start vLLM server
- [ ] Start dev server: `npm run dev`
- [ ] Open browser console
- [ ] Run:
  ```javascript
  fetch('http://localhost:8000/v1/models')
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

```bash
# Terminal 1: vLLM Server (WSL)
~/start-qwen-server.sh

# Terminal 2: ComfyUI (Windows CMD)
cd C:\path\to\ComfyUI
python main.py --listen

# Terminal 3: Dev Server (Windows CMD)
cd E:\RANDOM_STUFF\VIBE\PSD_PROCEDURAL_GENERATOR\PSD_Procedural_Generator
npm run dev
```

### Health Checks

```bash
# vLLM
curl http://localhost:8000/v1/models

# ComfyUI
curl http://127.0.0.1:8188/system_stats

# Both should return JSON
```

### Switch Providers

```bash
# In .env.local:

# Use local Qwen
VITE_AI_PROVIDER=qwen-local

# Use cloud Gemini
VITE_AI_PROVIDER=gemini
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `CUDA out of memory` | Reduce `--gpu-memory-utilization` to 0.80 or use 3B model |
| `Connection refused` | Ensure vLLM server is running and WSL firewall allows port 8000 |
| `JSON parse error` | Qwen may wrap JSON in markdown - aiProviderService handles this |
| `Slow inference` | Reduce `--max-model-len` to 4096, check for CPU offloading |
| `ComfyUI timeout` | Increase timeout in aiProviderService or check workflow |

---

## Hardware Utilization (3090 Ti 24GB)

| Configuration | VRAM Usage | Performance |
|---------------|------------|-------------|
| Qwen2.5-VL-7B BF16 | ~16GB | Best quality |
| Qwen2.5-VL-7B + ComfyUI | ~20GB | Both running |
| Qwen2.5-VL-32B AWQ | ~22GB | Higher quality, slower |
| Qwen2.5-VL-3B BF16 | ~8GB | Fastest, lower quality |

**Recommended:** Qwen2.5-VL-7B with BF16 leaves ~8GB for ComfyUI operations.

---

## Completion Checklist

- [ ] Phase 1: Infrastructure Setup
  - [ ] WSL2 configured
  - [ ] CUDA toolkit installed
  - [ ] vLLM installed
  - [ ] Custom model directory configured
  - [ ] Model downloaded to E:\...\MODELS
  - [ ] Server verified

- [ ] Phase 2: Application Integration
  - [ ] .env.local configured (VITE_AI_PROVIDER=qwen-local)
  - [ ] aiProviderService.ts present
  - [ ] aiProviderService.ts handles vLLM API format (system prompt as message, response_format.json_schema)
  - [ ] aiProviderService.ts strips markdown code fences from JSON responses
  - [ ] DesignAnalystNode.tsx modified
  - [ ] Imports updated
  - [ ] performAnalysis updated
  - [ ] generateDraft disabled/simplified

- [ ] ~~Phase 3: ComfyUI Integration~~ (DEFERRED)

- [ ] Phase 4: Testing
  - [ ] Server connection works
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

**Document Version:** 1.2
**Last Updated:** 2026-02-03
**Author:** Claude Code

### Changelog
- **v1.2** - Added vLLM version requirement (>=0.11.0), multimodal limit flag, and critical API format documentation for structured outputs and system prompts
- **v1.1** - Initial plan with deferred ComfyUI integration
