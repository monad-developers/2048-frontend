import { Monad2048 } from "../../generated";
import type {
  Monad2048_NewGame_event,
  Monad2048_NewMove_event,
  handlerContext,
} from "../../generated";

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

/**
 * Calculate score delta from a move by detecting merged tiles.
 *
 * Algorithm: Work from largest to smallest tile values. Any tile value
 * that appears MORE times after the move (excluding the spawned tile)
 * must be a merge result. Each merge of value V consumed 2 tiles of V/2.
 */
function calculateScoreDelta(
  prevTiles: number[],
  newTiles: number[]
): number {
  // Calculate the spawned tile value from board sum difference
  // Merges don't change board sum (v + v = 2v), only spawns do
  const prevSum = prevTiles.reduce((a, b) => a + b, 0);
  const newSum = newTiles.reduce((a, b) => a + b, 0);
  const spawnedValue = newSum - prevSum;

  // Count tiles at each value
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

  // Remove the spawned tile from consideration
  if (spawnedValue > 0 && newCounts.has(spawnedValue)) {
    const count = newCounts.get(spawnedValue)!;
    if (count === 1) {
      newCounts.delete(spawnedValue);
    } else {
      newCounts.set(spawnedValue, count - 1);
    }
  }

  // Work from largest to smallest tile values
  // New tiles that appear must be merge results
  const allValues = new Set([...prevCounts.keys(), ...newCounts.keys()]);
  const sortedValues = Array.from(allValues).sort((a, b) => b - a);

  let scoreDelta = 0;

  for (const value of sortedValues) {
    const prevCount = prevCounts.get(value) || 0;
    const newCount = newCounts.get(value) || 0;

    if (newCount > prevCount) {
      // These are merge results
      const mergeResults = newCount - prevCount;
      scoreDelta += mergeResults * value;

      // Update prevCounts to account for consumed tiles
      const halfValue = value / 2;
      if (halfValue >= 2 && prevCounts.has(halfValue)) {
        prevCounts.set(halfValue, prevCounts.get(halfValue)! - mergeResults * 2);
      }
    }
  }

  return scoreDelta;
}

// ============================================================
// NewGame Handler
// ============================================================

Monad2048.NewGame.handler(async ({ event, context }: { event: Monad2048_NewGame_event; context: handlerContext }) => {
  const { player, id: gameId, board } = event.params;
  const txHash = event.transaction.hash;
  const gasUsed = event.transaction.gasUsed ?? 150000n;
  const gasPrice = event.transaction.effectiveGasPrice ?? event.transaction.gasPrice ?? 0n;
  const monBurned = gasUsed * gasPrice;

  const tiles = decodeBoard(board);
  const highestTile = getHighestTile(tiles);

  // Score starts at 0 - the first 3 moves are not counted to match frontend behavior
  const initialScore = 0;

  context.Game.set({
    id: gameId,
    player: player.toLowerCase(),
    score: initialScore,
    highestTile,
    moveCount: 3,
    latestBoard: encodeBoard(tiles),
    totalGasUsed: gasUsed,
    totalMonBurned: monBurned,
    startedAt: BigInt(event.block.timestamp),
    lastMoveAt: BigInt(event.block.timestamp),
    isActive: true,
  });

  context.GameMove.set({
    id: txHash,
    gameId: gameId,
    moveNumber: 3,
    direction: 0,
    boardBefore: "0".repeat(32),
    boardAfter: encodeBoard(tiles),
    scoreDelta: initialScore,
    gasUsed: gasUsed,
    gasPrice: gasPrice,
    monBurned: monBurned,
    timestamp: BigInt(event.block.timestamp),
    txHash: txHash,
  });

  const existingPlayer = await context.Player.get(player.toLowerCase());
  if (existingPlayer) {
    const isBetter = initialScore > existingPlayer.bestScore;
    context.Player.set({
      ...existingPlayer,
      totalGamesPlayed: existingPlayer.totalGamesPlayed + 1,
      totalMovesPlayed: existingPlayer.totalMovesPlayed + 3,
      totalMonBurned: existingPlayer.totalMonBurned + monBurned,
      bestScore: isBetter ? initialScore : existingPlayer.bestScore,
      bestGameId: isBetter ? gameId : existingPlayer.bestGameId,
    });
  } else {
    context.Player.set({
      id: player.toLowerCase(),
      totalGamesPlayed: 1,
      totalMovesPlayed: 3,
      totalMonBurned: monBurned,
      bestScore: initialScore,
      bestGameId: gameId,
    });
  }

  await updateIndexerStatus(context, event.chainId, event.block.number, event.block.timestamp, true);
});

// ============================================================
// NewMove Handler
// ============================================================

Monad2048.NewMove.handler(async ({ event, context }: { event: Monad2048_NewMove_event; context: handlerContext }) => {
  const { player, id: gameId, move, result } = event.params;
  const txHash = event.transaction.hash;
  const gasUsed = event.transaction.gasUsed ?? 100000n;
  const gasPrice = event.transaction.effectiveGasPrice ?? event.transaction.gasPrice ?? 0n;
  const monBurned = gasUsed * gasPrice;

  const game = await context.Game.get(gameId);
  if (!game) {
    console.warn(`NewMove for unknown game: ${gameId}`);
    return;
  }

  const prevTiles = decodeBoard(BigInt("0x" + game.latestBoard));
  const newTiles = decodeBoard(result);

  const scoreDelta = calculateScoreDelta(prevTiles, newTiles);
  const newScore = game.score + scoreDelta;
  const highestTile = getHighestTile(newTiles);
  const newMoveCount = game.moveCount + 1;

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

  await updateIndexerStatus(context, event.chainId, event.block.number, event.block.timestamp, false);
});

// ============================================================
// Indexer Status Helper
// ============================================================

async function updateIndexerStatus(
  context: handlerContext,
  chainId: number,
  blockNumber: number,
  timestamp: number,
  isNewGame: boolean
) {
  const statusId = `status-${chainId}`;

  const existing = await context.IndexerStatus.get(statusId);
  const totalGames = existing ? existing.totalGamesIndexed : 0;

  context.IndexerStatus.set({
    id: statusId,
    chainId: chainId,
    lastIndexedBlock: BigInt(blockNumber),
    lastIndexedTimestamp: BigInt(timestamp),
    totalGamesIndexed: totalGames + (isNewGame ? 1 : 0),
    isBackfilling: false,
  });
}
