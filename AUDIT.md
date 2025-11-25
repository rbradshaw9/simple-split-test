# Code Audit Report - EdgeSplit

## Critical Issues Found

### 1. ⚠️ CRITICAL: Inconsistent entryPath/entryUrl Usage
**Severity:** HIGH - This will cause bugs when editing tests

**Problem:** The codebase has inconsistent handling of `entryPath` vs `entryUrl`:
- `CreateTestRequest.entryPath` expects a **full URL** (e.g., `https://example.com/path`)
- `Test.entryPath` stores only the **path** (e.g., `/path`)
- `Test.entryUrl` stores the **full URL** (optional field)
- Edit page incorrectly uses `test.entryUrl || test.entryPath` which could be just a path

**Locations:**
- `components/TestForm.tsx:28` - Form expects full URL in `entryPath`
- `app/tests/[testId]/edit/page.tsx:88` - Incorrectly maps `test.entryUrl || test.entryPath`
- `lib/tests.ts:52-54` - Parses full URL from `data.entryPath`
- `app/api/tests/[testId]/update/route.ts:40-42` - Same parsing logic

**Impact:** If a test only has `entryPath="/path"` and no `entryUrl`, editing will fail with URL parsing error.

**Fix Required:** Ensure edit page always reconstructs full URL or change form field label/description.

---

### 2. ⚠️ Percentage Validation Inconsistency
**Severity:** MEDIUM - Could allow invalid data

**Problem:** Button disables when percentages !== 100, but validation only checks if within 0.01 tolerance:
```typescript
// TestForm.tsx - Button disabled if not exactly 100
disabled={loading || totalPercentage !== 100}

// lib/tests.ts - Server allows 0.01 tolerance
if (Math.abs(totalPercentage - 100) > 0.01) {
```

**Impact:** User could theoretically submit 99.99% or 100.01% via API

**Fix:** Make both use the same tolerance or remove tolerance entirely.

---

### 3. Missing Error Handling in Thompson Sampling
**Severity:** MEDIUM

**Problem:** Percentage validation skipped when `autoOptimize` is true:
```typescript
// lib/tests.ts - This check is commented or missing
if (Math.abs(totalPercentage - 100) > 0.01) {
  errors.push(`Total percentages must equal 100 (currently ${totalPercentage})`);
}
```

But there's no check that wraps this to skip when autoOptimize is true. User can set arbitrary percentages with autoOptimize=false.

**Impact:** Invalid percentage splits could be saved.

**Fix:** Add conditional validation or server-side default percentages when autoOptimize=true.

---

### 4. ⚠️ Missing Cache Control on Test Detail Route
**Severity:** LOW - Causes stale data

**Problem:** `/api/tests/[testId]/route.ts` GET endpoint doesn't set cache control headers

**Impact:** Test details could be cached by browser

**Fix:** Add cache control headers like stats endpoint.

---

### 5. Type Safety: Missing Null Checks
**Severity:** LOW

**Problem:** Several places use optional chaining but don't handle null cases:
- `app/page.tsx:255` - `{test.entryUrl || test.entryPath}` - entryPath could be just "/"
- `lib/tests.ts:168,183` - Uses `(test as any).entryDomain` type assertion
- `app/tests/[testId]/page.tsx:178` - Displays entryPath without full URL context

**Impact:** Confusing UI, potential runtime errors

**Fix:** Ensure full URL reconstruction everywhere or store entryUrl consistently.

---

### 6. Variant ID Generation Not Stable
**Severity:** LOW

**Problem:** Variant IDs are generated based on array index:
```typescript
variants: data.variants.map((v, i) => ({
  id: `variant${i + 1}`,  // variant1, variant2, etc.
```

If user reorders variants, IDs change, breaking historical GA4 data association.

**Impact:** GA4 stats could become inconsistent if test is edited and variants reordered.

**Fix:** Generate stable IDs (hash of URL or UUID) on creation, preserve on update.

---

### 7. AutoOptimize Naming in Worker Code
**Severity:** LOW - Documentation mismatch

**Problem:** `autoOptimize` field controls Thompson Sampling, but worker comments say "Thompson sampling" not "auto-optimize"

**Impact:** Confusing for users reading worker code

**Fix:** Consistent terminology throughout.

---

### 8. GA4 Event Names Hardcoded
**Severity:** LOW

**Problem:** Event names are generated as `${testId}_view` and `${testId}_conversion` but stored in test config.

**Impact:** If test ID has special chars, event names could be invalid.

**Fix:** Validate or sanitize testId more strictly (currently uses slugify).

---

### 9. Missing Validation: Duplicate Test IDs
**Severity:** MEDIUM

**Problem:** Test ID is generated from slugified name. Two tests with same name get same ID:
```typescript
const testId = slugify(data.name);
```

No check if test already exists with that ID.

**Impact:** Creating test with duplicate name overwrites existing test.

**Fix:** Check if test exists before creating, or append timestamp/uuid to ID.

---

### 10. KV Index Update Race Condition
**Severity:** LOW

**Problem:** `updateTestsIndex()` reads, modifies, writes without lock:
```typescript
const indexData = await kv.get(indexKey);
// ... modify index ...
await kv.put(indexKey, JSON.stringify(index));
```

Multiple concurrent creates could lose updates.

**Impact:** tests_index could become inconsistent with actual tests

**Fix:** Use atomic operations or accept eventual consistency (document it).

---

## Non-Critical Issues

### 11. Console.log Statements Left in Production
**Locations:**
- `components/TestForm.tsx:52,78,81,86,88`
- `app/page.tsx:49`
- Multiple API routes

**Fix:** Remove or wrap in DEBUG check.

---

### 12. Type Assertions Used
**Locations:**
- `lib/tests.ts:168,183` - `(test as any).entryDomain`

**Fix:** Update Test type to make entryDomain/entryUrl required.

---

### 13. Unused Imports
**Severity:** COSMETIC

Check with: `npx eslint --fix`

---

### 14. Error Messages Not User Friendly
**Example:** "Validation failed" errors array not displayed properly in UI

**Fix:** Better error display in forms.

---

## Recommendations

### Priority 1 (Fix Before Testing):
1. ✅ Fix entryPath/entryUrl inconsistency in edit page
2. ✅ Add cache control headers to test detail endpoint
3. ✅ Validate duplicate test IDs

### Priority 2 (Fix Before Production):
4. Standardize percentage validation tolerance
5. Add autoOptimize condition to validation
6. Remove console.log statements

### Priority 3 (Nice to Have):
7. Make variant IDs stable
8. Better error message display
9. Document KV race conditions

---

## Summary

**Total Issues Found:** 14
- Critical: 1
- High: 1  
- Medium: 3
- Low: 6
- Cosmetic: 3

Most issues are edge cases, but the entryPath/entryUrl inconsistency is a real bug that will break editing existing tests.
