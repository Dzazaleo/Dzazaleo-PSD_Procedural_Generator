# DesignAnalystNode Audit Report

**File:** `components/DesignAnalystNode.tsx`
**Lines:** ~1200
**Date:** 2026-02-04

---

## Critical Issues

### 1. Untyped Component Props
**Location:** [Line 237](../components/DesignAnalystNode.tsx#L237)

```tsx
const InstanceRow: React.FC<any> = ({ ... })
```

Using `any` defeats TypeScript's purpose entirely. This should have a proper interface defining all expected props.

**Fix:** Create `InstanceRowProps` interface with all required properties.

---

### 2. Debug Keyword in Production
**Location:** [Line 604](../components/DesignAnalystNode.tsx#L604)

```tsx
const hasExplicitKeywords = history.some(msg =>
  msg.role === 'user' && /\b(generate|recreate|nano banana)\b/i.test(msg.parts[0].text)
);
```

"nano banana" appears to be a debug/test trigger that shouldn't exist in production code.

**Fix:** Remove debug keyword or gate behind `import.meta.env.DEV`.

---

### 3. Memory Leak Risk
**Location:** [Line 457](../components/DesignAnalystNode.tsx#L457)

```tsx
const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

The timeout is set at lines 1100-1112 but never cleared on component unmount.

**Fix:** Add cleanup in useEffect:
```tsx
useEffect(() => {
  return () => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }
  };
}, []);
```

---

### 4. Unsafe Property Access
**Location:** [Line 1045](../components/DesignAnalystNode.tsx#L1045)

```tsx
const json = response.json || {};
```

Then immediately accessing `json.method`, `json.replaceLayerId`, etc. without null checks.

**Fix:** Validate required properties before use or provide proper defaults.

---

## Type Safety Issues

| Location | Issue | Severity |
|----------|-------|----------|
| [Line 237](../components/DesignAnalystNode.tsx#L237) | `InstanceRow: React.FC<any>` - untyped props | High |
| [Line 390](../components/DesignAnalystNode.tsx#L390) | `msg.chatHistory.map((msg: any, ...)` - any type | Medium |
| [Line 894](../components/DesignAnalystNode.tsx#L894) | `instanceState.selectedModel as ModelKey` - unsafe cast | Medium |
| [Line 547](../components/DesignAnalystNode.tsx#L547) | `targetLayerId?: string` parameter unvalidated | Low |

---

## Performance Concerns

### 1. Heavy useEffect Dependency Array
**Location:** [Lines 593-648](../components/DesignAnalystNode.tsx#L593-L648)

This effect depends on 8 values including `analystInstances` (object) and runs registrations on every change. Object references in deps cause unnecessary reruns.

**Fix:** Use `useMemo` for derived values, consider splitting into smaller effects.

---

### 2. Canvas Creation Per Call
**Location:** [Lines 543-591](../components/DesignAnalystNode.tsx#L543-L591)

`extractSourcePixels` creates a new canvas element on every invocation.

**Fix:** Consider canvas pooling or reusing a single offscreen canvas.

---

### 3. String Concatenation in Hot Path
**Location:** [Lines 739-886](../components/DesignAnalystNode.tsx#L739-L886)

`generateSystemInstruction` builds large template strings on every analysis call.

**Fix:** Memoize with `useMemo` based on source/target data.

---

### 4. Non-memoized Handlers
**Location:** [Lines 684-691](../components/DesignAnalystNode.tsx#L684-L691)

```tsx
const handleModelChange = (index: number, model: ModelKey) => { ... }
const handleToggleMute = (index: number) => { ... }
```

**Fix:** Wrap in `useCallback` since they're passed to child components.

---

## Architectural Concerns

### 1. Component Does Too Much (~1200 lines)

This single component handles:
- Server health monitoring
- Multi-provider AI integration (Gemini + Ollama)
- Image extraction/processing
- Template registration to global store
- Complex multi-instance state management
- Full UI rendering with nested subcomponents

**Recommendation:** Split into:
- `InstanceRow.tsx` - Individual instance UI
- `StrategyCard.tsx` - Strategy display component
- `useDesignAnalysis.ts` - Analysis logic hook
- `DesignAnalystNode.tsx` - Main orchestrator (< 400 lines)

---

### 2. Business Logic Mixed with UI

Lines 543-591 (`extractSourcePixels`) and 739-886 (`generateSystemInstruction`) are pure business logic that should live in a service or custom hook.

---

### 3. Inline Subcomponents
**Location:** [Lines 60-235, 237-449](../components/DesignAnalystNode.tsx#L60-L449)

`StrategyCard` and `InstanceRow` are defined inline, causing recreation on every parent render despite `memo` on the main component.

**Fix:** Move to separate files and wrap with `memo`.

---

## React Best Practices Violations

| Issue | Location | Fix |
|-------|----------|-----|
| Index as key | [Line 1178](../components/DesignAnalystNode.tsx#L1178) `key={i}` | Use stable identifiers |
| Missing useCallback | [Lines 684-691](../components/DesignAnalystNode.tsx#L684-L691) | Wrap handlers in useCallback |
| Inline object styles | [Lines 266-274](../components/DesignAnalystNode.tsx#L266-L274) | Memoize style objects |
| Multiple useEffect for same concern | [Lines 252-264](../components/DesignAnalystNode.tsx#L252-L264) | Combine into single effect |

---

## Security Considerations

### 1. Unsanitized User Input in Prompts
**Location:** [Line 823](../components/DesignAnalystNode.tsx#L823)

Layer names (`sourceData.container.containerName`) and other user-controlled data are injected directly into AI prompts without sanitization.

**Risk:** Prompt injection attacks could manipulate AI behavior.

**Fix:** Sanitize/escape user-controlled strings before prompt injection.

---

### 2. API Key in Client Bundle

While Vite's env handling is correct, the API key is still present in the client bundle (Gemini cloud path at [line 710](../components/DesignAnalystNode.tsx#L710)).

**Note:** This is acceptable for client-side apps but consider proxy for production.

---

## Error Handling Gaps

| Location | Issue | Impact |
|----------|-------|--------|
| [Line 911](../components/DesignAnalystNode.tsx#L911) | `extractSourcePixels` returns null, used without check | Potential crash |
| [Lines 1114-1118](../components/DesignAnalystNode.tsx#L1114-L1118) | Catch block only logs error | No user feedback |
| [Lines 693-736](../components/DesignAnalystNode.tsx#L693-L736) | `generateDraft` silently returns null | Silent failure |

---

## Magic Numbers

These hardcoded values should be extracted to named constants:

| Value | Location | Meaning | Suggested Name |
|-------|----------|---------|----------------|
| `0.15` | Lines 250, 787, 1051 | Aspect ratio tolerance | `ASPECT_RATIO_TOLERANCE` |
| `30000` | Line 486 | Health check interval (ms) | `HEALTH_CHECK_INTERVAL_MS` |
| `3` | Line 747 | Max layer depth for flattening | `MAX_LAYER_DEPTH` |
| `20` | Line 824 | Max layers in prompt | `MAX_LAYERS_IN_PROMPT` |
| `500` | Line 1101 | Draft generation debounce (ms) | `DRAFT_DEBOUNCE_MS` |
| `16384` | Line 56 | Thinking budget tokens | `THINKING_BUDGET_TOKENS` |

---

## Summary

| Category | Severity | Count |
|----------|----------|-------|
| Critical | 🔴 High | 4 |
| Type Safety | 🟠 Medium | 4 |
| Performance | 🟠 Medium | 4 |
| Architecture | 🟡 Low | 3 |
| Best Practices | 🟡 Low | 4 |
| Security | 🟠 Medium | 2 |
| Error Handling | 🟡 Low | 3 |

---

## Recommended Priority

1. **Immediate:** Fix memory leak (draftTimeoutRef cleanup)
2. **Immediate:** Remove "nano banana" debug keyword
3. **Short-term:** Add proper TypeScript interfaces for `InstanceRow` props
4. **Short-term:** Extract constants for magic numbers
5. **Medium-term:** Split component into smaller, focused modules
6. **Medium-term:** Add proper error handling with user feedback
7. **Long-term:** Refactor to separate business logic from UI

---

## Related Files

- [types.ts](../types.ts) - Type definitions used by this component
- [services/aiProviderService.ts](../services/aiProviderService.ts) - AI provider abstraction
- [services/psdService.ts](../services/psdService.ts) - PSD operations
- [store/ProceduralContext.tsx](../store/ProceduralContext.tsx) - Global state management
