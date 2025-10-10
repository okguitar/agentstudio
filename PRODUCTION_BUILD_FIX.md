# Production Build Fix

## Problem
When running the installed application on Linux, the following error occurred:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/root/.agent-studio/shared/src/types/projects.js'
imported from /root/.agent-studio/shared/src/utils/projectMetadataStorage.ts
```

## Root Cause
The `shared` directory was not being compiled during the build process, causing Node.js to fail when trying to import `.js` files from TypeScript source files.

## Solution
The following changes were made to fix the issue:

### 1. Added build script to `shared/package.json`
```json
"scripts": {
  "build": "tsc",
  "type-check": "tsc --noEmit"
}
```

### 2. Updated root `package.json` build scripts
```json
"build": "pnpm --filter shared run build && pnpm --filter frontend run build && pnpm --filter backend run build",
"build:backend": "pnpm --filter shared run build && pnpm --filter backend run build"
```

### 3. Updated `shared/package.json` exports to point to compiled files
Changed from pointing to `src/` to pointing to `dist/`:
```json
"main": "./dist/index.js",
"types": "./dist/index.d.ts",
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  },
  // ... all other exports point to dist/ as well
}
```

## Verification
After these changes:
1. `shared` directory compiles successfully to `shared/dist/`
2. Backend can import compiled `shared` modules correctly
3. Production build works as expected

## Testing
Run the following commands to verify:
```bash
# Build shared
pnpm --filter shared run build

# Verify compiled files exist
ls -la shared/dist/types/projects.js
ls -la shared/dist/utils/projectMetadataStorage.js

# Build backend (includes shared build)
pnpm run build:backend

# Test import (should succeed)
node -e "import('@agentstudio/shared/utils/projectMetadataStorage').then(m => console.log('✓ Import successful')).catch(e => console.error('✗ Import failed:', e.message))"
```

## Impact on install.sh
The `install.sh` script already calls `build:backend`, which now includes the `shared` build step, so no changes to `install.sh` were needed.
