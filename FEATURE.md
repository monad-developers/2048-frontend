# Realtime Leaderboard Feature

## Overview

Add a realtime updating top-10 high score leaderboard to the 2048 on Monad game. The leaderboard displays the highest-scoring games across all players, updates in realtime as new high scores are achieved, and features animated entry effects for new leaderboard positions.

**Key Requirements**:
- Primary ranking by **actual game score** (sum of merged tiles)
- Each entry shows: score, moves played, gas consumed, total MON burned
- Same player can appear multiple times (one entry per game)
- Handle all data pipeline states: empty, syncing, realtime

---

## Architecture

### Data Flow

```
┌─────────────────┐  Events + Txs  ┌─────────────────┐    Index     ┌─────────────────┐
│  Monad2048      │ ─────────────▶ │  Envio          │ ───────────▶ │  PostgreSQL     │
│  Smart Contract │   NewGame      │  HyperIndex     │              │  (Local/Hosted) │
│                 │   NewMove      │  Indexer        │              │                 │
└─────────────────┘   + Receipts   └─────────────────┘              └────────┬────────┘
                                                                             │
                                                                    GraphQL API
                                                                             │
                                                                             ▼
┌─────────────────┐    Fetch       ┌─────────────────┐    Query    ┌─────────────────┐
│  React          │ ◀───────────── │  Leaderboard    │ ◀────────── │  Hasura         │
│  Frontend       │   Leaderboard  │  Hook           │   GraphQL   │  GraphQL Engine │
│                 │   + Status     │  + IndexerStatus│             │                 │
└─────────────────┘                └─────────────────┘             └─────────────────┘
```

### Why HyperIndex (Not Direct HyperSync)

| Consideration | HyperSync Direct | HyperIndex |
|--------------|------------------|------------|
| Historical backfill | Client must process all events | Pre-indexed, instant queries |
| Score calculation | Must decode boards client-side | Computed in event handlers |
| Gas/MON tracking | Must fetch receipts separately | Indexed with transactions |
| Realtime updates | Must poll events + recompute | Automatic indexing + GraphQL |
| Infrastructure | API token in frontend (security risk) | Hosted service, secure endpoint |
| Query flexibility | Limited filtering | Full GraphQL with sorting/pagination |
| Local development | N/A | Docker-based local stack |

**Decision**: Use **Envio HyperIndex** hosted service for production, with local Docker setup for development.

---

## Monorepo Commands (Root-Level Scripts)

### Package Scripts Configuration

#### Root `package.json` additions

```json
{
  "scripts": {
    "dev": "pnpm run --parallel dev:frontend dev:indexer",
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:indexer": "pnpm --filter indexer dev",
    "build": "pnpm run --parallel build:frontend build:indexer",
    "build:frontend": "pnpm --filter frontend build",
    "build:indexer": "pnpm --filter indexer codegen",
    "indexer:start": "pnpm --filter indexer dev",
    "indexer:stop": "pnpm --filter indexer stop",
    "indexer:codegen": "pnpm --filter indexer codegen",
    "clean": "pnpm run --parallel clean:frontend clean:indexer",
    "clean:frontend": "pnpm --filter frontend clean",
    "clean:indexer": "pnpm --filter indexer stop"
  }
}
```

### Command Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run full stack (frontend + indexer) in parallel |
| `pnpm dev:frontend` | Run only the webapp |
| `pnpm dev:indexer` | Run only the data pipeline (indexer + Hasura + PostgreSQL) |
| `pnpm indexer:start` | Alias for starting the data pipeline |
| `pnpm indexer:stop` | Stop and clean up Docker containers |
| `pnpm indexer:codegen` | Regenerate types from GraphQL schema |
| `pnpm build` | Build all packages for production |

### Prerequisites

```bash
# Required for indexer
docker --version  # Docker must be running

# Install dependencies
pnpm install
```

---

## Technical Design

### 1. Score Calculation Strategy

The smart contract events emit board states as 128-bit encoded integers. **Actual game score** is calculated by detecting merges between consecutive board states.

**Board Encoding** (from contract):
- 16 tiles × 8 bits each = 128 bits
- Each cell stores `log₂(tile_value)`: 0=empty, 1=2, 2=4, 3=8, ... 11=2048

**Score Calculation Algorithm**:

```typescript
// Score = sum of all merged tile values
// When two 4s merge into an 8, score += 8
// When two 8s merge into a 16, score += 16

function calculateScoreDelta(prevBoard: number[], newBoard: number[]): number {
  const prevSum = prevBoard.reduce((a, b) => a + b, 0);
  const newSum = newBoard.reduce((a, b) => a + b, 0);

  // New tile added is either 2 or 4 (90%/10% probability)
  // Score delta = (newSum - prevSum) - newTileValue
  // But we can simplify: merges double values, so:
  // scoreDelta = sum of all tiles that appeared due to merges

  // A merge of two Xs creates one 2X, so net change = 2X - X - X + newTile = newTile
  // But score gained = 2X (the merged value)

  // Precise calculation requires tracking which tiles merged
  // Simplified: score delta = (tiles that disappeared) * their values

  const prevTiles = prevBoard.filter(t => t > 0).sort((a, b) => a - b);
  const newTiles = newBoard.filter(t => t > 0).sort((a, b) => a - b);

  // Find merged tiles by comparing sorted arrays
  let scoreDelta = 0;
  // ... detailed merge detection logic

  return scoreDelta;
}
```

**For NewGame (first 3 moves)**: The contract receives `boards[4]` containing all intermediate states, so we calculate score from all 3 transitions.

**For NewMove**: We store `previousBoard` in the Game entity and compare with `result`.

### 2. Gas & MON Tracking

**Gas Constants** (from contract analysis):
- `startGame()`: ~150,000 gas (includes validation of 3 moves)
- `play()`: ~100,000 gas per move

**Data from Transaction Receipts**:
- `gasUsed`: Actual gas consumed
- `effectiveGasPrice`: Gas price in wei
- `MON burned = gasUsed × effectiveGasPrice`

**Envio HyperIndex Configuration** for transaction data:

```yaml
# config.yaml - enable transaction receipt indexing
field_selection:
  transaction:
    - hash
    - from
    - gasUsed
    - effectiveGasPrice
```

### 3. Data Schema

#### Envio HyperIndex Schema (`schema.graphql`)

```graphql
# Tracks each move in a game (for score calculation)
type GameMove @entity {
  id: ID!                      # txHash
  gameId: String! @index       # Reference to Game
  moveNumber: Int!             # 1, 2, 3, 4, 5...
  direction: Int!              # 0=UP, 1=DOWN, 2=LEFT, 3=RIGHT
  boardBefore: String!         # Board state before move (hex)
  boardAfter: String!          # Board state after move (hex)
  scoreDelta: Int!             # Score gained from this move
  gasUsed: BigInt!             # Gas consumed
  gasPrice: BigInt!            # Effective gas price (wei)
  monBurned: BigInt!           # gasUsed * gasPrice (wei)
  timestamp: BigInt!           # Block timestamp
  txHash: String!              # Transaction hash
}

# Aggregated game data
type Game @entity {
  id: ID!                      # gameId (bytes32)
  player: String! @index       # Player address (indexed for queries)
  score: Int!                  # Actual game score (sum of merges)
  highestTile: Int!            # Highest tile value achieved
  moveCount: Int!              # Total moves played
  latestBoard: String!         # Current board state (hex)

  # Gas tracking
  totalGasUsed: BigInt!        # Sum of all gas used
  totalMonBurned: BigInt!      # Sum of all MON burned (wei)

  # Timestamps
  startedAt: BigInt!           # Block timestamp of NewGame
  lastMoveAt: BigInt!          # Block timestamp of last move

  # Status
  isActive: Boolean!           # True if game still has valid moves
}

# Player aggregate stats (optional, for profile features)
type Player @entity {
  id: ID!                      # Player address
  totalGamesPlayed: Int!       # Count of games
  totalMovesPlayed: Int!       # Sum of all moves
  totalMonBurned: BigInt!      # Total MON spent on games
  bestScore: Int!              # Highest score achieved
  bestGameId: String           # Reference to best game
}

# Indexer status for frontend state management
type IndexerStatus @entity {
  id: ID!                      # "status" (singleton)
  chainId: Int!                # Network chain ID
  lastIndexedBlock: BigInt!    # Most recent block processed
  lastIndexedTimestamp: BigInt!# Timestamp of last block
  totalGamesIndexed: Int!      # Count of games in database
  isBackfilling: Boolean!      # True if still catching up
}
```

### 4. Event Handlers

#### `src/handlers/index.ts`

```typescript
import {
  Monad2048,
  Game,
  GameMove,
  Player,
  IndexerStatus,
  handlerContext
} from "generated";

// ============================================================
// Board Decoding & Score Calculation
// ============================================================

function decodeBoard(boardBigInt: bigint): number[] {
  const tiles: number[] = [];
  for (let i = 0; i < 16; i++) {
    const shift = BigInt((15 - i) * 8);
    const cellLog = Number((boardBigInt >> shift) & 0xFFn);
    tiles.push(cellLog > 0 ? Math.pow(2, cellLog) : 0);
  }
  return tiles;
}

function encodeBoard(tiles: number[]): string {
  let result = 0n;
  for (let i = 0; i < 16; i++) {
    const log = tiles[i] > 0 ? Math.log2(tiles[i]) : 0;
    result |= BigInt(log) << BigInt((15 - i) * 8);
  }
  return result.toString(16).padStart(32, '0');
}

function getHighestTile(tiles: number[]): number {
  return Math.max(...tiles, 0);
}

function getBoardSum(tiles: number[]): number {
  return tiles.reduce((a, b) => a + b, 0);
}

/**
 * Calculate score delta from a move by detecting merged tiles.
 *
 * Algorithm:
 * 1. Count tile values in both boards
 * 2. Tiles that decreased in count were merged
 * 3. Score = sum of merged result values (2X for each pair of X)
 */
function calculateScoreDelta(
  prevTiles: number[],
  newTiles: number[]
): number {
  // Count occurrences of each tile value
  const prevCounts = new Map<number, number>();
  const newCounts = new Map<number, number>();

  for (const tile of prevTiles) {
    if (tile > 0) {
      prevCounts.set(tile, (prevCounts.get(tile) || 0) + 1);
    }
  }

  for (const tile of newTiles) {
    if (tile > 0) {
      newCounts.set(tile, (newCounts.get(tile) || 0) + 1);
    }
  }

  let scoreDelta = 0;

  // For each tile value, check if count decreased (meaning merges happened)
  // A merge of two Xs creates one 2X, score += 2X
  for (const [value, prevCount] of prevCounts) {
    const newCount = newCounts.get(value) || 0;
    const newDoubleCount = newCounts.get(value * 2) || 0;
    const prevDoubleCount = prevCounts.get(value * 2) || 0;

    // Number of merges = (prevCount - newCount) / 2
    // But also check that double value increased
    const doubleIncrease = newDoubleCount - prevDoubleCount;
    if (doubleIncrease > 0 && prevCount > newCount) {
      // Each merge of two Xs gives score of 2X
      scoreDelta += doubleIncrease * (value * 2);
    }
  }

  return scoreDelta;
}

// ============================================================
// NewGame Handler
// ============================================================

Monad2048.NewGame.handler(async ({ event, context }) => {
  const { player, id: gameId, board } = event.args;
  const txHash = event.transaction.hash;
  const gasUsed = BigInt(event.transaction.gasUsed || 150000);
  const gasPrice = BigInt(event.transaction.effectiveGasPrice || event.transaction.gasPrice || 0);
  const monBurned = gasUsed * gasPrice;

  // Decode final board after move 3
  const tiles = decodeBoard(board);
  const highestTile = getHighestTile(tiles);

  // For NewGame, we receive board state after move 3
  // The contract validates boards[0] -> boards[1] -> boards[2] -> boards[3]
  // We don't have intermediate boards in the event, so we estimate initial score
  // Based on board sum: score ≈ boardSum - initialTiles (rough estimate)
  // For accurate score, we'd need to decode the calldata

  // Simplified: assume minimal merges in first 3 moves
  // Real implementation would decode transaction input data
  const boardSum = getBoardSum(tiles);
  const estimatedScore = Math.max(0, boardSum - 4 - 4); // Subtract ~2 initial tiles

  // Create Game entity
  context.Game.set({
    id: gameId,
    player: player.toLowerCase(),
    score: estimatedScore,
    highestTile,
    moveCount: 3,
    latestBoard: encodeBoard(tiles),
    totalGasUsed: gasUsed,
    totalMonBurned: monBurned,
    startedAt: BigInt(event.block.timestamp),
    lastMoveAt: BigInt(event.block.timestamp),
    isActive: true,
  });

  // Create initial GameMove entry (represents moves 1-3 batched)
  context.GameMove.set({
    id: txHash,
    gameId: gameId,
    moveNumber: 3,
    direction: 0, // Unknown for batched moves
    boardBefore: "0".repeat(32), // Initial board unknown
    boardAfter: encodeBoard(tiles),
    scoreDelta: estimatedScore,
    gasUsed: gasUsed,
    gasPrice: gasPrice,
    monBurned: monBurned,
    timestamp: BigInt(event.block.timestamp),
    txHash: txHash,
  });

  // Update or create Player
  const existingPlayer = await context.Player.get(player.toLowerCase());
  if (existingPlayer) {
    const isBetter = estimatedScore > existingPlayer.bestScore;
    context.Player.set({
      ...existingPlayer,
      totalGamesPlayed: existingPlayer.totalGamesPlayed + 1,
      totalMovesPlayed: existingPlayer.totalMovesPlayed + 3,
      totalMonBurned: existingPlayer.totalMonBurned + monBurned,
      bestScore: isBetter ? estimatedScore : existingPlayer.bestScore,
      bestGameId: isBetter ? gameId : existingPlayer.bestGameId,
    });
  } else {
    context.Player.set({
      id: player.toLowerCase(),
      totalGamesPlayed: 1,
      totalMovesPlayed: 3,
      totalMonBurned: monBurned,
      bestScore: estimatedScore,
      bestGameId: gameId,
    });
  }

  // Update indexer status
  await updateIndexerStatus(context, event);
});

// ============================================================
// NewMove Handler
// ============================================================

Monad2048.NewMove.handler(async ({ event, context }) => {
  const { player, id: gameId, move, result } = event.args;
  const txHash = event.transaction.hash;
  const gasUsed = BigInt(event.transaction.gasUsed || 100000);
  const gasPrice = BigInt(event.transaction.effectiveGasPrice || event.transaction.gasPrice || 0);
  const monBurned = gasUsed * gasPrice;

  // Get existing game
  const game = await context.Game.get(gameId);
  if (!game) {
    console.warn(`NewMove for unknown game: ${gameId}`);
    return;
  }

  // Decode boards
  const prevTiles = decodeBoard(BigInt("0x" + game.latestBoard));
  const newTiles = decodeBoard(result);

  // Calculate score delta from this move
  const scoreDelta = calculateScoreDelta(prevTiles, newTiles);
  const newScore = game.score + scoreDelta;
  const highestTile = getHighestTile(newTiles);
  const newMoveCount = game.moveCount + 1;

  // Update Game entity
  context.Game.set({
    ...game,
    score: newScore,
    highestTile: Math.max(game.highestTile, highestTile),
    moveCount: newMoveCount,
    latestBoard: encodeBoard(newTiles),
    totalGasUsed: game.totalGasUsed + gasUsed,
    totalMonBurned: game.totalMonBurned + monBurned,
    lastMoveAt: BigInt(event.block.timestamp),
  });

  // Create GameMove entry
  context.GameMove.set({
    id: txHash,
    gameId: gameId,
    moveNumber: newMoveCount,
    direction: Number(move),
    boardBefore: game.latestBoard,
    boardAfter: encodeBoard(newTiles),
    scoreDelta: scoreDelta,
    gasUsed: gasUsed,
    gasPrice: gasPrice,
    monBurned: monBurned,
    timestamp: BigInt(event.block.timestamp),
    txHash: txHash,
  });

  // Update Player stats
  const existingPlayer = await context.Player.get(player.toLowerCase());
  if (existingPlayer) {
    const isBetter = newScore > existingPlayer.bestScore;
    context.Player.set({
      ...existingPlayer,
      totalMovesPlayed: existingPlayer.totalMovesPlayed + 1,
      totalMonBurned: existingPlayer.totalMonBurned + monBurned,
      bestScore: isBetter ? newScore : existingPlayer.bestScore,
      bestGameId: isBetter ? gameId : existingPlayer.bestGameId,
    });
  }

  // Update indexer status
  await updateIndexerStatus(context, event);
});

// ============================================================
// Indexer Status Helper
// ============================================================

async function updateIndexerStatus(context: handlerContext, event: any) {
  const chainId = event.chainId;
  const statusId = `status-${chainId}`;

  const existing = await context.IndexerStatus.get(statusId);
  const totalGames = existing ? existing.totalGamesIndexed : 0;

  context.IndexerStatus.set({
    id: statusId,
    chainId: chainId,
    lastIndexedBlock: BigInt(event.block.number),
    lastIndexedTimestamp: BigInt(event.block.timestamp),
    totalGamesIndexed: totalGames + (event.eventName === "NewGame" ? 1 : 0),
    isBackfilling: false, // Will be true during initial sync
  });
}
```

### 5. Configuration

#### `config.yaml`

```yaml
name: monad-2048-leaderboard
description: Indexes Monad 2048 game events for leaderboard with score and gas tracking
networks:
  - id: 143 # Monad Mainnet
    start_block: 0 # Or contract deployment block for faster sync
    contracts:
      - name: Monad2048
        address: "0x53748668642735CDa45935716525E7DFbC8aAACC"
        handler: src/handlers/index.ts
        events:
          - event: NewGame(address indexed player, bytes32 indexed id, uint256 board)
          - event: NewMove(address indexed player, bytes32 indexed id, uint256 move, uint256 result)

# Enable transaction data for gas tracking
field_selection:
  transaction:
    - hash
    - from
    - gasUsed
    - effectiveGasPrice
    - gasPrice
```

---

## Frontend Implementation

### 1. Project Structure Changes

```
packages/frontend/src/
├── components/
│   ├── Leaderboard/
│   │   ├── Leaderboard.tsx           # Main leaderboard component
│   │   ├── LeaderboardEntry.tsx      # Single entry with animation
│   │   ├── LeaderboardSkeleton.tsx   # Loading skeleton
│   │   ├── LeaderboardEmpty.tsx      # Empty state
│   │   ├── LeaderboardSyncing.tsx    # Syncing/backfill state
│   │   ├── LeaderboardError.tsx      # Error state
│   │   └── index.ts
│   └── ...existing components
├── hooks/
│   ├── useLeaderboard.ts             # Leaderboard data + polling
│   ├── useIndexerStatus.ts           # Indexer sync status
│   └── ...existing hooks
├── lib/
│   ├── graphql/
│   │   ├── client.ts                 # GraphQL client setup
│   │   ├── queries.ts                # Leaderboard queries
│   │   └── types.ts                  # Generated/manual types
│   ├── utils/
│   │   └── format.ts                 # Formatting helpers
│   └── ...
└── ...
```

### 2. Dependencies to Add

```json
{
  "dependencies": {
    "framer-motion": "^11.x",
    "graphql-request": "^6.x"
  }
}
```

### 3. GraphQL Queries

#### `lib/graphql/queries.ts`

```typescript
import { gql } from 'graphql-request';

// Main leaderboard query - sorted by score (primary), then moves (secondary)
export const GET_LEADERBOARD = gql`
  query GetLeaderboard($limit: Int = 10) {
    Game(
      order_by: [
        { score: desc },
        { moveCount: asc },
        { lastMoveAt: desc }
      ]
      limit: $limit
    ) {
      id
      player
      score
      highestTile
      moveCount
      totalGasUsed
      totalMonBurned
      lastMoveAt
      isActive
    }
  }
`;

// Indexer status for sync state
export const GET_INDEXER_STATUS = gql`
  query GetIndexerStatus($chainId: Int!) {
    IndexerStatus(where: { chainId: { _eq: $chainId } }) {
      lastIndexedBlock
      lastIndexedTimestamp
      totalGamesIndexed
      isBackfilling
    }
  }
`;

// Player's games for highlighting current player
export const GET_PLAYER_GAMES = gql`
  query GetPlayerGames($player: String!, $limit: Int = 10) {
    Game(
      where: { player: { _eq: $player } }
      order_by: { score: desc }
      limit: $limit
    ) {
      id
      score
      highestTile
      moveCount
    }
  }
`;

// Get specific game details
export const GET_GAME_DETAILS = gql`
  query GetGameDetails($gameId: ID!) {
    Game_by_pk(id: $gameId) {
      id
      player
      score
      highestTile
      moveCount
      totalGasUsed
      totalMonBurned
      startedAt
      lastMoveAt
      isActive
    }
    GameMove(
      where: { gameId: { _eq: $gameId } }
      order_by: { moveNumber: asc }
    ) {
      moveNumber
      direction
      scoreDelta
      gasUsed
      monBurned
      timestamp
    }
  }
`;
```

#### `lib/graphql/types.ts`

```typescript
export interface LeaderboardEntry {
  id: string;
  player: string;
  score: number;
  highestTile: number;
  moveCount: number;
  totalGasUsed: string;    // BigInt as string
  totalMonBurned: string;  // BigInt as string (wei)
  lastMoveAt: string;      // BigInt as string
  isActive: boolean;

  // Computed client-side
  rank?: number;
  isNew?: boolean;
  isCurrentPlayer?: boolean;
}

export interface IndexerStatus {
  lastIndexedBlock: string;
  lastIndexedTimestamp: string;
  totalGamesIndexed: number;
  isBackfilling: boolean;
}

export type LeaderboardState =
  | 'loading'       // Initial load
  | 'empty'         // No games indexed yet
  | 'syncing'       // Indexer is backfilling historical data
  | 'ready'         // Data available, realtime updates active
  | 'error';        // Failed to fetch
```

### 4. Formatting Utilities

#### `lib/utils/format.ts`

```typescript
import { formatEther } from 'viem';

/**
 * Format wei to MON with appropriate precision
 */
export function formatMonBurned(weiString: string): string {
  const mon = Number(formatEther(BigInt(weiString)));

  if (mon < 0.0001) {
    return '< 0.0001 MON';
  } else if (mon < 1) {
    return `${mon.toFixed(4)} MON`;
  } else if (mon < 100) {
    return `${mon.toFixed(2)} MON`;
  } else {
    return `${Math.round(mon).toLocaleString()} MON`;
  }
}

/**
 * Format gas used with K/M suffixes
 */
export function formatGas(gasString: string): string {
  const gas = Number(gasString);

  if (gas >= 1_000_000) {
    return `${(gas / 1_000_000).toFixed(1)}M`;
  } else if (gas >= 1_000) {
    return `${(gas / 1_000).toFixed(0)}K`;
  } else {
    return gas.toLocaleString();
  }
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format score with comma separators
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

/**
 * Format relative time (e.g., "2m ago", "1h ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = Number(timestamp) * 1000; // Convert seconds to ms
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
```

### 5. Hooks

#### `hooks/useIndexerStatus.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_INDEXER_STATUS } from '@/lib/graphql/queries';
import { IndexerStatus } from '@/lib/graphql/types';
import { useNetwork } from '@/contexts/NetworkContext';

const CHAIN_ID = 143; // Monad Mainnet

export function useIndexerStatus() {
  const [status, setStatus] = useState<IndexerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const client = getGraphQLClient();
      const data = await client.request<{ IndexerStatus: IndexerStatus[] }>(
        GET_INDEXER_STATUS,
        { chainId: CHAIN_ID }
      );

      setStatus(data.IndexerStatus[0] || null);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll status less frequently than leaderboard
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
```

#### `hooks/useLeaderboard.ts`

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_LEADERBOARD } from '@/lib/graphql/queries';
import { LeaderboardEntry, LeaderboardState } from '@/lib/graphql/types';
import { useNetwork } from '@/contexts/NetworkContext';
import { useIndexerStatus } from './useIndexerStatus';

const POLL_INTERVAL = 5000; // 5 seconds

interface UseLeaderboardOptions {
  currentPlayerAddress?: string;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const { currentPlayerAddress } = options;
  const { status: indexerStatus } = useIndexerStatus();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<LeaderboardState>('loading');
  const [error, setError] = useState<Error | null>(null);
  const previousEntriesRef = useRef<LeaderboardEntry[]>([]);
  const isFirstFetch = useRef(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const client = getGraphQLClient();
      const data = await client.request<{ Game: LeaderboardEntry[] }>(
        GET_LEADERBOARD,
        { limit: 10 }
      );

      const games = data.Game || [];

      // Determine state based on data and indexer status
      if (games.length === 0) {
        if (indexerStatus?.isBackfilling) {
          setState('syncing');
        } else if (indexerStatus?.totalGamesIndexed === 0) {
          setState('empty');
        } else {
          setState('ready'); // Has games but none in top 10 (unlikely)
        }
        setEntries([]);
        return;
      }

      // Enrich entries with computed fields
      const enrichedEntries = games.map((game, index) => ({
        ...game,
        rank: index + 1,
        isNew: !isFirstFetch.current &&
               !previousEntriesRef.current.some(e => e.id === game.id),
        isCurrentPlayer: currentPlayerAddress
          ? game.player.toLowerCase() === currentPlayerAddress.toLowerCase()
          : false,
      }));

      previousEntriesRef.current = enrichedEntries;
      isFirstFetch.current = false;
      setEntries(enrichedEntries);
      setState(indexerStatus?.isBackfilling ? 'syncing' : 'ready');
      setError(null);
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [currentPlayerAddress, indexerStatus]);

  // Fetch on mount
  useEffect(() => {
    isFirstFetch.current = true;
    setState('loading');
    fetchLeaderboard();
  }, []);

  // Poll for updates (pause when tab hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLeaderboard();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchLeaderboard();
      }
    }, POLL_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchLeaderboard]);

  return {
    entries,
    state,
    error,
    refetch: fetchLeaderboard,
    indexerStatus
  };
}
```

### 6. Leaderboard Components

#### `components/Leaderboard/LeaderboardEmpty.tsx`

```tsx
import { Gamepad2 } from 'lucide-react';

export function LeaderboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Gamepad2 className="w-12 h-12 text-gray-300 mb-3" />
      <h3 className="font-semibold text-gray-600 mb-1">No Games Yet</h3>
      <p className="text-sm text-gray-500">
        Be the first to play and claim the #1 spot!
      </p>
    </div>
  );
}
```

#### `components/Leaderboard/LeaderboardSyncing.tsx`

```tsx
import { Loader2, Database } from 'lucide-react';

interface LeaderboardSyncingProps {
  totalGamesIndexed?: number;
  lastBlock?: string;
}

export function LeaderboardSyncing({
  totalGamesIndexed = 0,
  lastBlock
}: LeaderboardSyncingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="relative mb-3">
        <Database className="w-12 h-12 text-purple-300" />
        <Loader2 className="w-6 h-6 text-purple-600 absolute -bottom-1 -right-1 animate-spin" />
      </div>
      <h3 className="font-semibold text-gray-600 mb-1">Syncing Data</h3>
      <p className="text-sm text-gray-500 mb-2">
        Indexing historical games...
      </p>
      <div className="text-xs text-gray-400 space-y-1">
        <p>{totalGamesIndexed.toLocaleString()} games indexed</p>
        {lastBlock && <p>Block #{Number(lastBlock).toLocaleString()}</p>}
      </div>
    </div>
  );
}
```

#### `components/Leaderboard/LeaderboardError.tsx`

```tsx
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface LeaderboardErrorProps {
  error: Error;
  onRetry: () => void;
}

export function LeaderboardError({ error, onRetry }: LeaderboardErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-3" />
      <h3 className="font-semibold text-gray-600 mb-1">Failed to Load</h3>
      <p className="text-sm text-gray-500 mb-3">
        {error.message || 'Unable to fetch leaderboard data'}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}
```

#### `components/Leaderboard/LeaderboardSkeleton.tsx`

```tsx
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="w-6 h-6 bg-gray-200 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
          <div className="w-16 h-8 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
```

#### `components/Leaderboard/Leaderboard.tsx`

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Flame, Fuel, Zap, Loader2 } from 'lucide-react';
import { useLeaderboard, LeaderboardEntry } from '@/hooks/useLeaderboard';
import { LeaderboardSkeleton } from './LeaderboardSkeleton';
import { LeaderboardEmpty } from './LeaderboardEmpty';
import { LeaderboardSyncing } from './LeaderboardSyncing';
import { LeaderboardError } from './LeaderboardError';
import {
  formatAddress,
  formatScore,
  formatGas,
  formatMonBurned
} from '@/lib/utils/format';

interface LeaderboardProps {
  currentPlayerAddress?: string;
}

function getRankDisplay(rank: number) {
  switch (rank) {
    case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2: return <Medal className="w-5 h-5 text-gray-400" />;
    case 3: return <Medal className="w-5 h-5 text-amber-600" />;
    default: return (
      <span className="w-5 text-center font-bold text-gray-400 text-sm">
        {rank}
      </span>
    );
  }
}

function getTileColorClass(tile: number): string {
  const colors: Record<number, string> = {
    2: 'bg-purple-100 text-purple-800',
    4: 'bg-purple-200 text-purple-800',
    8: 'bg-purple-300 text-purple-900',
    16: 'bg-purple-400 text-white',
    32: 'bg-purple-500 text-white',
    64: 'bg-purple-600 text-white',
    128: 'bg-yellow-400 text-yellow-900',
    256: 'bg-yellow-500 text-white',
    512: 'bg-orange-500 text-white',
    1024: 'bg-orange-600 text-white',
    2048: 'bg-red-500 text-white',
    4096: 'bg-red-600 text-white',
    8192: 'bg-red-700 text-white',
  };
  return colors[tile] || 'bg-purple-700 text-white';
}

export function Leaderboard({ currentPlayerAddress }: LeaderboardProps) {
  const { entries, state, error, refetch, indexerStatus } = useLeaderboard({
    currentPlayerAddress,
  });

  return (
    <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-purple-700 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Top 10 High Scores
        </h2>
        {state === 'ready' && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </div>
        )}
        {state === 'syncing' && (
          <div className="flex items-center gap-1 text-xs text-purple-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Syncing
          </div>
        )}
      </div>

      {/* Content based on state */}
      {state === 'loading' && <LeaderboardSkeleton />}

      {state === 'empty' && <LeaderboardEmpty />}

      {state === 'syncing' && entries.length === 0 && (
        <LeaderboardSyncing
          totalGamesIndexed={indexerStatus?.totalGamesIndexed}
          lastBlock={indexerStatus?.lastIndexedBlock}
        />
      )}

      {state === 'error' && error && (
        <LeaderboardError error={error} onRetry={refetch} />
      )}

      {/* Leaderboard entries */}
      {(state === 'ready' || (state === 'syncing' && entries.length > 0)) && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                initial={entry.isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
                className={`
                  relative p-3 rounded-lg transition-colors
                  ${entry.isCurrentPlayer
                    ? 'bg-purple-100 ring-2 ring-purple-400'
                    : entry.rank <= 3
                      ? 'bg-gradient-to-r from-purple-50 to-white'
                      : 'bg-gray-50'
                  }
                  ${entry.isNew ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
                `}
              >
                {/* New entry badge */}
                {entry.isNew && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full"
                  >
                    NEW
                  </motion.div>
                )}

                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-6 flex justify-center">
                    {getRankDisplay(entry.rank!)}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-700 truncate">
                        {formatAddress(entry.player)}
                      </span>
                      {entry.isCurrentPlayer && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-600 text-white rounded-full font-medium">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {entry.moveCount} moves
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3 h-3" />
                        {formatGas(entry.totalGasUsed)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {formatMonBurned(entry.totalMonBurned)}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-end gap-1">
                    <motion.div
                      className="text-lg font-bold text-purple-700"
                      initial={entry.isNew ? { scale: 0 } : false}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                    >
                      {formatScore(entry.score)}
                    </motion.div>
                    <div className={`
                      px-2 py-0.5 rounded text-xs font-bold
                      ${getTileColorClass(entry.highestTile)}
                    `}>
                      {entry.highestTile}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
```

### 7. Layout Integration

#### Updated `Container.tsx`

```tsx
import { Leaderboard } from "@/components/Leaderboard";
import React from "react";

type ContainerProps = {
  children: React.ReactNode;
  playerAddress?: string;
};

export default function Container({ children, playerAddress }: ContainerProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center pb-8 pt-6 px-2 bg-gray-100 overflow-x-hidden">
      {/* Header */}
      <div className="pt-4 text-center">
        <h1 className="text-6xl md:text-8xl font-extrabold text-yellow-400 drop-shadow-[4px_4px_0px_rgba(255,0,0,1)] md:drop-shadow-[8px_8px_0px_rgba(255,0,0,1)] uppercase tracking-wider transform rotate-[-2deg]">
          2048
        </h1>
        <h3 className="text-2xl md:text-4xl font-extrabold text-purple-600 drop-shadow-[1px_1px_0px_rgba(255,0,0,1)] md:drop-shadow-[2px_2px_0px_rgba(255,0,0,1)] tracking-wider transform rotate-[-2deg]">
          on MONAD
        </h3>
      </div>

      {/* Main content area: Game + Leaderboard */}
      <div className="flex-1 w-full flex flex-col lg:flex-row lg:justify-center lg:items-start lg:gap-6 xl:gap-8">
        {/* Game board - fixed max width, never shrinks */}
        <div className="flex-shrink-0 w-full max-w-md mx-auto lg:mx-0">
          {children}
        </div>

        {/* Leaderboard - right side on desktop, below on mobile */}
        <div className="flex-shrink-0 w-full max-w-sm mx-auto lg:mx-0 mt-6 lg:mt-0 px-4 lg:px-0 lg:sticky lg:top-6">
          <Leaderboard currentPlayerAddress={playerAddress} />
        </div>
      </div>
    </div>
  );
}
```

---

## Local Development Setup

### 1. Indexer Package Structure

```
packages/
├── frontend/           # Existing React app
├── contracts/          # Existing Foundry contracts
└── indexer/            # NEW: Envio HyperIndex
    ├── src/
    │   └── handlers/
    │       └── index.ts
    ├── schema.graphql
    ├── config.yaml
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

### 2. Indexer Package Configuration

#### `packages/indexer/package.json`

```json
{
  "name": "indexer",
  "version": "1.0.0",
  "scripts": {
    "dev": "envio dev",
    "start": "envio start",
    "stop": "envio stop",
    "codegen": "envio codegen",
    "test": "mocha"
  },
  "dependencies": {
    "envio": "^2.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "typescript": "^5.x",
    "mocha": "^10.x",
    "@types/mocha": "^10.x"
  }
}
```

### 3. Environment Variables

#### `packages/indexer/.env.example`

```env
# Envio API Token (get from envio.dev dashboard)
ENVIO_API_TOKEN=your_token_here
```

#### `packages/frontend/.env.local`

```env
# Existing Privy config
VITE_PRIVY_APP_ID=your_privy_app_id

# Local development (Docker Hasura)
VITE_ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql

# Production (Envio hosted - uncomment when deployed)
# VITE_ENVIO_GRAPHQL_URL=https://indexer.bigdevenergy.link/xxxxx/v1/graphql
```

### 4. Quick Start Commands

```bash
# From project root

# 1. Install all dependencies
pnpm install

# 2. Start only the indexer (data pipeline)
pnpm dev:indexer
# → Starts Docker containers: PostgreSQL, Hasura, Indexer
# → Opens Hasura console at http://localhost:8080 (password: testing)
# → Begins indexing from configured start_block

# 3. In another terminal, start the frontend
pnpm dev:frontend
# → Starts Vite dev server at http://localhost:5173
# → Connects to local Hasura for leaderboard data

# OR run both together
pnpm dev
# → Runs indexer and frontend in parallel

# Stop the indexer and clean up Docker
pnpm indexer:stop
```

### 5. Verifying the Setup

1. **Check Hasura Console**: Open http://localhost:8080
   - Login with password: `testing`
   - Navigate to "Data" tab
   - Verify tables: `Game`, `GameMove`, `Player`, `IndexerStatus`

2. **Check Indexer Logs**: Watch the terminal running `pnpm dev:indexer`
   - Should show blocks being processed
   - Events being indexed

3. **Test Frontend**: Open http://localhost:5173
   - Leaderboard should show "Syncing" state initially
   - Play a game
   - Verify new game appears in leaderboard within ~5 seconds

---

## State Handling Matrix

### Frontend States

| State | Condition | UI Display |
|-------|-----------|------------|
| `loading` | Initial fetch in progress | Skeleton loader |
| `empty` | Indexer running but no games exist | "No Games Yet" with call-to-action |
| `syncing` | Indexer is backfilling, partial data available | Shows data + "Syncing" indicator |
| `ready` | Indexer caught up, realtime updates active | Full leaderboard + "Live" indicator |
| `error` | GraphQL request failed | Error message + retry button |

### Indexer States

| Phase | `isBackfilling` | `totalGamesIndexed` | Frontend Behavior |
|-------|-----------------|---------------------|-------------------|
| Starting | `true` | 0 | Show "Syncing" with progress |
| Backfilling | `true` | Increasing | Show partial data + "Syncing" |
| Caught up | `false` | Stable | Show "Live" indicator |
| Realtime | `false` | Increasing | Animate new entries |

### Error Recovery

```typescript
// Exponential backoff for failed requests
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

let retryDelay = INITIAL_RETRY_DELAY;

async function fetchWithRetry() {
  try {
    await fetchLeaderboard();
    retryDelay = INITIAL_RETRY_DELAY; // Reset on success
  } catch (error) {
    console.error('Fetch failed, retrying in', retryDelay);
    setTimeout(fetchWithRetry, retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
  }
}
```

---

## Implementation Checklist

### Phase 1: Indexer Setup

- [ ] Create `packages/indexer` directory structure
- [ ] Add `indexer` to pnpm workspace (`pnpm-workspace.yaml`)
- [ ] Initialize Envio project: `cd packages/indexer && pnpm envio init`
- [ ] Define GraphQL schema with Game, GameMove, Player, IndexerStatus entities
- [ ] Configure `config.yaml` with both networks and transaction fields
- [ ] Implement board decoding utilities
- [ ] Implement score calculation from board transitions
- [ ] Implement NewGame handler with gas tracking
- [ ] Implement NewMove handler with gas tracking
- [ ] Implement IndexerStatus updates
- [ ] Add root-level scripts to `package.json`
- [ ] Test locally with `pnpm dev:indexer`
- [ ] Verify data in Hasura console

### Phase 2: Frontend - GraphQL Integration

- [ ] Install dependencies: `pnpm --filter frontend add framer-motion graphql-request`
- [ ] Create `lib/graphql/client.ts` with network-aware endpoints
- [ ] Create `lib/graphql/queries.ts` with all queries
- [ ] Create `lib/graphql/types.ts` with TypeScript interfaces
- [ ] Create `lib/utils/format.ts` with formatting helpers
- [ ] Implement `useIndexerStatus` hook
- [ ] Implement `useLeaderboard` hook with state management

### Phase 3: Frontend - UI Components

- [ ] Create `LeaderboardSkeleton` component
- [ ] Create `LeaderboardEmpty` component
- [ ] Create `LeaderboardSyncing` component
- [ ] Create `LeaderboardError` component
- [ ] Create main `Leaderboard` component with all states
- [ ] Add Framer Motion animations
- [ ] Test all state transitions

### Phase 4: Layout Integration

- [ ] Update `Container.tsx` for side-by-side desktop layout
- [ ] Pass `playerAddress` prop through component tree
- [ ] Ensure game board doesn't shrink on any viewport
- [ ] Make leaderboard sticky on desktop
- [ ] Test responsive behavior: mobile, tablet, desktop

### Phase 5: Polish & Testing

- [ ] Test empty state (fresh indexer)
- [ ] Test syncing state (during backfill)
- [ ] Test realtime updates (play a game, watch it appear)
- [ ] Test error recovery (stop Hasura, verify retry behavior)
- [ ] Test current player highlighting
- [ ] Test new entry animations
- [ ] Test same player multiple entries
- [ ] Performance test animations on mobile

### Phase 6: Production Deployment

- [ ] Deploy indexer to Envio hosted service
- [ ] Configure production GraphQL endpoints
- [ ] Update frontend environment variables
- [ ] Test production data flow
- [ ] Monitor indexer sync status
- [ ] Set up alerts for indexer issues

---

## Gas Constants Reference

| Transaction | Estimated Gas | Notes |
|-------------|---------------|-------|
| `startGame()` | ~150,000 | Validates first 3 moves |
| `play()` | ~100,000 | Single move validation |

**MON Burned Calculation**:
```
monBurned = gasUsed × effectiveGasPrice
monBurnedInMon = monBurned / 10^18
```

---

## Contract Address Reference

| Network | Chain ID | Contract Address |
|---------|----------|------------------|
| Monad Mainnet | 143 | `0x53748668642735CDa45935716525E7DFbC8aAACC` |

## Envio Endpoint Reference

| Network | HyperSync URL |
|---------|---------------|
| Monad Mainnet | `https://monad.hypersync.xyz` |
