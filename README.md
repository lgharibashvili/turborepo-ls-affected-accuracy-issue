# Turbo Affected Detection Issue: `ls --affected` vs Cached Tasks

This repository reproduces a critical issue where `turbo ls --affected` incorrectly shows packages as affected by sub-dependency changes, but `turbo build` correctly uses cached tasks and only rebuilds what actually needs rebuilding.

## The Problem

When changes are made to files in deep sub-dependencies (transitive dependencies), there's a disconnect between Turbo's affected detection and actual build requirements:

1. ❌ `turbo ls --affected` incorrectly shows packages as affected
2. ✅ `turbo build` correctly uses cached tasks for packages that don't need rebuilding
3. ✅ This results in correct builds despite incorrect affected detection

**This is an affected detection bug, not a cache invalidation bug.**

## Repository Structure

This monorepo is designed to demonstrate the issue with a clear dependency chain:

```
app-a → pkg-a
app-b → pkg-b
```

### Dependency Tree

- **app-a**: Depends on `pkg-a`
- **app-b**: Depends on `pkg-b`
- **pkg-a**: Independent package with no dependencies
- **pkg-b**: Independent package with no dependencies

## Reproduction Steps

1. **Initial Setup**

   ```bash
   pnpm install
   ```

2. **First Build** (creates cache)

   ```bash
   turbo build
   ```

3. **Check Affected Packages** (should show all packages)

   ```bash
   turbo ls --affected
   ```

4. **Make Change in Deep Dependency**

   ```bash
   # Edit packages/pkg-c/src/index.js
   echo 'export function getMessage() { return "Modified from pkg-c!"; }' > packages/pkg-c/src/index.js
   ```

5. **Check Affected Detection**

   ```bash
   # This should show pkg-c, pkg-b, pkg-a, app-a, and app-b as affected
   turbo ls --affected
   ```

6. **Run Build with Cache**
   ```bash
   # This should rebuild all affected packages, not use cache
   turbo build
   ```

## Expected vs Actual Behavior

### Expected

- `turbo ls --affected` should only show packages that are actually affected by the change ❌
- `turbo build` should only rebuild packages that actually need rebuilding ✅

### Actual (Issue)

- `turbo ls --affected` incorrectly shows packages as affected that don't need rebuilding ❌
- `turbo build` correctly uses cached tasks and only rebuilds what actually needs rebuilding ✅

**The bug: Affected detection is overly broad, but cache invalidation is correct.**

## The Proof

Here's how to demonstrate the exact issue:

1. **Initial build** (creates cache):

   ```bash
   turbo build
   # Output: All packages build successfully
   ```

2. **Make change in pkg-a that only affects app-a**:

   ```bash
   # Change something in pkg-a that only app-a depends on
   echo 'export function getMessage() { return "CHANGED!"; }' > packages/pkg-a/src/index.js
   ```

3. **Check affected detection** (this is WRONG - shows too many packages):

   ```bash
   turbo ls --affected
   # Output: Shows pkg-a, app-a, AND app-b as affected ❌
   # Expected: Should only show pkg-a and app-a ✅
   ```

4. **Run build** (this works correctly - only rebuilds what's needed):

   ```bash
   turbo build --verbose
   # Expected: Only pkg-a and app-a should rebuild
   # Actual: Only pkg-a and app-a rebuild (correct!) ✅
   # Note: app-b uses cache hit (correct!) ✅
   ```

5. **Verify the issue**:
   ```bash
   # Check that app-b was NOT rebuilt despite being shown as affected
   ls -la apps/app-b/dist/
   # Should show old timestamp (cache hit) ✅
   ```

## Testing Commands

```bash
# Check what packages are affected
turbo ls --affected

# Build with verbose output to see cache hits/misses
turbo build --verbose

# Force rebuild everything (bypasses cache)
turbo build --force

# Check cache status
turbo build --dry-run
```

## Files to Modify for Testing

- `packages/pkg-c/src/index.js` - Deepest dependency
- `packages/pkg-b/src/index.js` - Middle dependency
- `packages/pkg-a/src/index.js` - Shallow dependency
- `apps/app-a/src/index.js` - Application level
- `apps/app-b/src/index.js` - Application level

The issue is most likely to manifest when modifying files in `pkg-c` (the deepest dependency) and observing whether all dependent packages are properly detected as affected.
