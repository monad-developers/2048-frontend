# Migration Guide - Monorepo Structure

This document explains the changes made to convert the 2048-frontend repository into a pnpm monorepo.

## What Changed

### Structure Changes

**Before:**
```
2048-frontend/
├── src/
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── ...
```

**After:**
```
2048-monorepo/
├── packages/
│   ├── frontend/          # All original frontend files moved here
│   └── contracts/         # New: contracts from 2048-contracts repo
├── package.json           # New: root orchestration scripts
├── pnpm-workspace.yaml    # New: workspace configuration
└── README.md              # Updated with monorepo docs
```

### Package Manager

- **Changed from:** Bun (`bun.lock`)
- **Changed to:** pnpm (`pnpm-lock.yaml`)
- All dependencies remain the same, just managed by pnpm now

### Running Commands

**Before:**
```bash
bun dev
bun run build
```

**After (from root):**
```bash
pnpm dev                  # Runs frontend dev server
pnpm build                # Builds both packages
pnpm build:frontend       # Builds only frontend
pnpm build:contracts      # Builds only contracts
```

**Or from package directory:**
```bash
cd packages/frontend
pnpm dev
pnpm build
```

## Key Benefits

1. **Single Repository**: Frontend and contracts are now co-located
2. **Unified Commands**: Run builds/tests for all packages from root
3. **Shared Dependencies**: Better dependency management across packages
4. **Easier Development**: No need to switch between repos
5. **Consistent Versioning**: Both packages version together

## Contract Integration

The contracts package is now directly accessible from the frontend:

```typescript
// Contract addresses are still in packages/frontend/src/utils/constants.ts
const TESTNET_ADDRESS = "0xC52d29f79b2552801e95C8Dc7646f59125009904"
const MAINNET_ADDRESS = "0x53748668642735CDa45935716525E7DFbC8aAACC"
```

## Environment Variables

Frontend environment variables remain in the same location:
- `packages/frontend/.env.local`

No changes needed to existing `.env.local` files - they work as-is.

## Git Repository

- The `.git` directory remains at the root
- Both packages share the same git history
- The contracts package was copied from `/Users/krishang/Desktop/code/monad/2048-contracts` (branch: `krishang/deploy`)

## Workspace Commands

pnpm supports several workspace-specific commands:

```bash
# Filter by package
pnpm --filter frontend <command>
pnpm --filter contracts <command>

# Run recursively (all packages)
pnpm -r <command>

# Run in specific package directory
cd packages/frontend && pnpm <command>
```

## Deployment

Contract deployment can now be done from the root:

```bash
pnpm contracts:deploy        # With env vars RPC_URL and DEPLOYER_PRIVATE_KEY
pnpm --filter contracts deploy:testnet
pnpm --filter contracts deploy:mainnet
```

## No Breaking Changes

- All frontend code remains exactly the same
- Contract addresses haven't changed
- Build outputs remain in the same locations
- Environment variables work identically
- Development workflow is the same or better

## Rollback (if needed)

If you need to rollback to separate repositories:

1. Copy `packages/frontend/` contents to a new directory
2. Copy `packages/contracts/` contents to a new directory
3. Run `pnpm install` in each directory

The packages are fully independent and can be separated if needed.
