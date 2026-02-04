/// <reference types="vite/client" />

/**
 * AI Provider Service
 *
 * Abstraction layer for AI inference providers (Gemini, Qwen2.5-VL via Ollama, etc.)
 * Allows switching between cloud and local models without changing node code.
 */

export type AIProvider = 'gemini' | 'qwen-local' | 'qwen-comfyui';

export interface AIProviderConfig {
  provider: AIProvider;
  baseUrl?: string;        // For local servers (e.g., http://localhost:11434/v1 for Ollama)
  apiKey?: string;         // For cloud providers
  model?: string;          // Model identifier
  comfyuiUrl?: string;     // For ComfyUI image generation
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;  // base64 data URL or http URL
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface StructuredOutputSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
}

export interface GenerateOptions {
  systemPrompt?: string;
  messages: ChatMessage[];
  responseSchema?: StructuredOutputSchema;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  json?: any;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// Default configuration - can be overridden via environment variables
// Note: minicpm-v:8b is used as the default because qwen2.5vl:7b crashes with images
const DEFAULT_CONFIG: AIProviderConfig = {
  provider: (import.meta.env.VITE_AI_PROVIDER as AIProvider) || 'gemini',
  baseUrl: import.meta.env.VITE_QWEN_BASE_URL || 'http://localhost:11434/v1',
  apiKey: import.meta.env.VITE_API_KEY,
  model: import.meta.env.VITE_QWEN_MODEL || 'minicpm-v:8b',
  comfyuiUrl: import.meta.env.VITE_COMFYUI_URL || 'http://127.0.0.1:8188',
};

let currentConfig: AIProviderConfig = { ...DEFAULT_CONFIG };

export function setAIProviderConfig(config: Partial<AIProviderConfig>) {
  currentConfig = { ...currentConfig, ...config };
}

export function getAIProviderConfig(): AIProviderConfig {
  return { ...currentConfig };
}

// Maximum image dimension for local vision models (reduces VRAM usage)
// 512px provides good balance for layout analysis with 24GB VRAM
const MAX_IMAGE_DIMENSION = 512;

/**
 * Downscale a base64 image to reduce VRAM usage for local vision models
 * Returns the original if already small enough or if processing fails
 */
async function downscaleImageForOllama(dataUrl: string): Promise<string> {
  try {
    // Extract base64 and mime type
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return dataUrl;

    const [, mimeType, base64Data] = match;

    // Create image element
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Check if downscaling needed
    const { width, height } = img;
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
      return dataUrl; // Already small enough
    }

    // Calculate new dimensions maintaining aspect ratio
    // CRITICAL: Qwen2.5-VL GGML requires dimensions divisible by 28 (2×patch_size)
    // The error "a->ne[2] * 4 == b->ne[0]" indicates attention head dimension mismatch
    const PATCH_SIZE = 28;
    const scale = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
    let newWidth = Math.round(width * scale / PATCH_SIZE) * PATCH_SIZE || PATCH_SIZE;
    let newHeight = Math.round(height * scale / PATCH_SIZE) * PATCH_SIZE || PATCH_SIZE;

    // Ensure minimum size (at least 4 patches in each dimension)
    const MIN_SIZE = PATCH_SIZE * 4;  // 112px minimum
    newWidth = Math.max(newWidth, MIN_SIZE);
    newHeight = Math.max(newHeight, MIN_SIZE);

    // Create offscreen canvas and draw scaled image
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Convert back to base64 (use JPEG for better compression)
    const outputMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const quality = outputMime === 'image/jpeg' ? 0.85 : undefined;
    const result = canvas.toDataURL(outputMime, quality);

    console.log(`[aiProviderService] Downscaled image from ${width}x${height} to ${newWidth}x${newHeight} (divisible by ${PATCH_SIZE}: w=${newWidth % PATCH_SIZE === 0}, h=${newHeight % PATCH_SIZE === 0})`);
    return result;
  } catch (e) {
    console.warn('[aiProviderService] Failed to downscale image, using original:', e);
    return dataUrl;
  }
}

/**
 * Process content parts to downscale any images for Ollama
 */
async function processContentForOllama(content: ContentPart[]): Promise<ContentPart[]> {
  const processed: ContentPart[] = [];
  let imageCount = 0;

  for (const part of content) {
    if (part.type === 'image_url' && part.image_url?.url) {
      imageCount++;
      const downscaledUrl = await downscaleImageForOllama(part.image_url.url);
      processed.push({
        ...part,
        image_url: {
          ...part.image_url,
          url: downscaledUrl
        }
      });
    } else {
      processed.push(part);
    }
  }

  console.log(`[Qwen] Processed ${imageCount} images in content`);
  return processed;
}

/**
 * Generate completion using Qwen2.5-VL via Ollama (OpenAI-compatible API)
 */
async function generateWithQwenLocal(options: GenerateOptions): Promise<GenerateResult> {
  const { baseUrl, model } = currentConfig;

  // Debug: Log request info to console
  console.log('[Qwen] Starting request to:', baseUrl);
  console.log('[Qwen] Model:', model);

  // Build messages array with system prompt
  const messages: any[] = [];

  if (options.systemPrompt) {
    messages.push({
      role: 'system',
      content: options.systemPrompt
    });
  }

  // Convert messages to OpenAI format with image downscaling
  for (const msg of options.messages) {
    if (typeof msg.content === 'string') {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    } else {
      // Handle multimodal content (images + text) - downscale images for VRAM efficiency
      const processedContent = await processContentForOllama(msg.content);
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: processedContent
      });
    }
  }

  // Build request body
  const requestBody: any = {
    model: model,
    messages: messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    // Ollama-specific: increase context window (default is only 2048)
    // 16384 tokens uses more VRAM but allows complex prompts
    options: {
      num_ctx: 16384
    }
  };

  // Add structured output guidance if schema provided
  if (options.responseSchema) {
    // Ollama supports JSON mode via response_format
    requestBody.response_format = { type: 'json_object' };

    // Add JSON instruction with schema to system prompt for guidance
    const schemaHint = `\n\nIMPORTANT: You MUST respond with valid JSON matching this schema:\n${JSON.stringify(options.responseSchema, null, 2)}`;
    if (messages[0]?.role === 'system') {
      messages[0].content += schemaHint;
    } else {
      messages.unshift({ role: 'system', content: schemaHint });
    }
  }

  // Debug: Log request summary
  const imagePartsCount = messages.reduce((count: number, msg: any) => {
    if (Array.isArray(msg.content)) {
      return count + msg.content.filter((p: any) => p.type === 'image_url').length;
    }
    return count;
  }, 0);
  const totalTextLength = messages.reduce((len: number, msg: any) => {
    if (typeof msg.content === 'string') return len + msg.content.length;
    if (Array.isArray(msg.content)) {
      return len + msg.content.filter((p: any) => p.type === 'text').reduce((l: number, p: any) => l + (p.text?.length || 0), 0);
    }
    return len;
  }, 0);
  console.log(`[Qwen] Request: ${messages.length} messages, ${imagePartsCount} images, ~${totalTextLength} chars text`);
  console.log(`[Qwen] Options:`, requestBody.options);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ollama' // Ollama accepts any auth or none
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Qwen API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  // Try to parse as JSON if schema was provided
  let json: any = undefined;
  if (options.responseSchema) {
    try {
      // Handle potential markdown code blocks
      let jsonText = text;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      json = JSON.parse(jsonText);
    } catch (e) {
      console.warn('Failed to parse JSON response:', e);
      // Try to extract JSON from the text
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        } catch (e2) {
          console.error('JSON extraction also failed');
        }
      }
    }
  }

  return {
    text,
    json,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0
    }
  };
}

/**
 * Generate completion using Google Gemini
 */
async function generateWithGemini(options: GenerateOptions): Promise<GenerateResult> {
  const { GoogleGenAI, Type } = await import('@google/genai');
  const { apiKey } = currentConfig;

  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Convert schema to Gemini format
  const convertSchemaToGemini = (schema: StructuredOutputSchema): any => {
    const convertType = (prop: any): any => {
      if (prop.type === 'string') return { type: Type.STRING, enum: prop.enum };
      if (prop.type === 'number') return { type: Type.NUMBER };
      if (prop.type === 'integer') return { type: Type.INTEGER };
      if (prop.type === 'boolean') return { type: Type.BOOLEAN };
      if (prop.type === 'array') {
        return { type: Type.ARRAY, items: convertType(prop.items) };
      }
      if (prop.type === 'object') {
        const props: any = {};
        for (const [key, val] of Object.entries(prop.properties || {})) {
          props[key] = convertType(val);
        }
        return { type: Type.OBJECT, properties: props, required: prop.required };
      }
      return { type: Type.STRING };
    };
    return convertType(schema);
  };

  const config: any = {
    systemInstruction: options.systemPrompt,
  };

  if (options.responseSchema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = convertSchemaToGemini(options.responseSchema);
  }

  // Convert messages to Gemini format
  const contents = options.messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: typeof msg.content === 'string'
      ? [{ text: msg.content }]
      : msg.content.map(p => {
          if (p.type === 'text') return { text: p.text };
          if (p.type === 'image_url' && p.image_url?.url) {
            const base64Match = p.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
              return { inlineData: { mimeType: base64Match[1], data: base64Match[2] } };
            }
          }
          return { text: '' };
        })
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents,
    config
  });

  const text = response.text || '';
  let json: any = undefined;

  if (options.responseSchema) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.warn('Failed to parse Gemini JSON response');
    }
  }

  return { text, json };
}

/**
 * Main generate function - routes to appropriate provider
 */
export async function generateCompletion(options: GenerateOptions): Promise<GenerateResult> {
  const { provider } = currentConfig;

  switch (provider) {
    case 'qwen-local':
      return generateWithQwenLocal(options);
    case 'gemini':
    default:
      return generateWithGemini(options);
  }
}

/**
 * Generate image using ComfyUI API (for draft generation)
 *
 * STATUS: DISABLED - Draft generation is deferred.
 * To enable later, implement ComfyUI workflow integration here.
 */
export async function generateImageWithComfyUI(
  _prompt: string,
  _sourceImage?: string,
  _options?: { width?: number; height?: number; steps?: number }
): Promise<string | null> {
  // Draft generation is disabled for initial implementation
  // Return null to skip draft preview
  console.log('[aiProviderService] Draft generation disabled - ComfyUI integration deferred');
  return null;

  // TODO: Future implementation
  // - Export your ComfyUI Qwen-Image-Edit workflow as API format
  // - Implement workflow submission to ComfyUI /prompt endpoint
  // - Poll /history/{prompt_id} for completion
  // - Return base64 image result
}

/**
 * Health check for local Ollama server
 */
export async function checkQwenServerHealth(): Promise<boolean> {
  const { baseUrl } = currentConfig;

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ollama' }
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Health check for ComfyUI server
 */
export async function checkComfyUIHealth(): Promise<boolean> {
  const { comfyuiUrl } = currentConfig;

  try {
    const response = await fetch(`${comfyuiUrl}/system_stats`);
    return response.ok;
  } catch {
    return false;
  }
}
