# Turborepo `ls --affected` Accuracy Issue

This repository reproduces a critical issue where `turbo ls --affected` is not as accurate as `turbo build --dry=json` in detecting which packages are actually affected by changes.

> **Note**: According to [Turborepo 2.1](https://turborepo.com/blog/turbo-2-1-0#turbo-ls) release note, `turbo ls --affected --output=json` was introduced as a recommended replacement for `turbo build --dry=json` when you only need to retrieve a list of changed packages.

## The Problem

**Any random change to the root `package.json` file triggers this issue.** Even a simple whitespace change causes `turbo ls --affected` to incorrectly show ALL packages as affected, while `turbo build` correctly determines that no packages actually need rebuilding.

This demonstrates a disconnect between Turbo's `ls --affected` detection and turbo `build --dry=json` cache status output.

**This is an affected detection bug, not a cache invalidation bug.**

## Expected vs Actual Behavior

### Expected

- `turbo ls --affected` should only show packages that are actually affected by the change.
- `turbo build` should only rebuild packages that actually need rebuilding.

### Actual (Issue)

- `turbo ls --affected` incorrectly shows packages as affected that don't need rebuilding ❌
- `turbo build` correctly uses cached tasks and only rebuilds what actually needs rebuilding ✅

**The bug: Affected detection is overly broad, but cache invalidation is correct.**

## Reproduction scenario

Here's how to demonstrate the exact issue:

### Step 1: Make a minimal change to root package.json

```bash
# Option 1: Using sed
sed -i '' '1s/{/ {/' package.json

# Option 2: Manual edit - just add a space before the opening brace on line 1 (or anywhere ><)
```

### Step 2: Show the change made

```bash
git diff
```

**Output:**

```diff
diff --git a/package.json b/package.json
index 98995f1..68508df 100644
--- a/package.json
+++ b/package.json
@@ -1,4 +1,4 @@
-{
+ {
   "name": "my-turborepo",
   "description": "A barebones Turborepo example to reproduce ls --affected issue.",
   "private": true,
```

### Step 3: Check affected detection (WRONG - shows all packages as affected)

```bash
pnpm turbo ls --affected
```

**Output:**

```
turbo 2.5.6

4 packages (pnpm9)

  app-a apps/app-a
  app-b apps/app-b
  pkg-a packages/pkg-a
  pkg-b packages/pkg-b
```

❌ **Problem**: Shows ALL packages as affected by a simple whitespace change!

### Step 4: Check build cache status (CORRECT - shows cache hits)

```bash
pnpm turbo build --dry=json | jq -c '. as $root | .tasks[] | { taskId, cache: .cache.status, hash, hashOfExternalDependencies, globalHash: $root.globalCacheInputs.hashOfExternalDependencies }'
```

**Output:**

```json
{"taskId":"app-a#build","cache":"HIT","hash":"d890f3e9895f4caf","hashOfExternalDependencies":"459c029558afe716","globalHash":"9571602318428969"}
{"taskId":"app-b#build","cache":"HIT","hash":"6ba8642a6b6e0b1e","hashOfExternalDependencies":"16b6eadd7e59624e","globalHash":"9571602318428969"}
{"taskId":"pkg-a#build","cache":"HIT","hash":"fd10ee1c334b618a","hashOfExternalDependencies":"459c029558afe716","globalHash":"9571602318428969"}
{"taskId":"pkg-b#build","cache":"HIT","hash":"ad647a23af143f93","hashOfExternalDependencies":"459c029558afe716","globalHash":"9571602318428969"}
```

✅ **Correct**: All packages show `"cache":"HIT"` - no rebuild needed!

### The Issue Demonstrated

- **`turbo ls --affected`**: Incorrectly shows all 4 packages as affected ❌
- **`turbo build --dry=json`**: Correctly shows all 4 packages as cache hits ✅

This proves that `turbo build`'s cache invalidation is more accurate than `turbo ls --affected`'s affected detection.
