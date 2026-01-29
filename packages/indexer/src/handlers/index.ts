import {
  Monad2048,
  Game,
  GameMove,
  Player,
  IndexerStatus,
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
  // Based on board sum: score = boardSum - initialTiles (rough estimate)
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
  await updateIndexerStatus(context, event, true);
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
  await updateIndexerStatus(context, event, false);
});

// ============================================================
// Indexer Status Helper
// ============================================================

async function updateIndexerStatus(context: any, event: any, isNewGame: boolean) {
  const chainId = event.chainId;
  const statusId = `status-${chainId}`;

  const existing = await context.IndexerStatus.get(statusId);
  const totalGames = existing ? existing.totalGamesIndexed : 0;

  context.IndexerStatus.set({
    id: statusId,
    chainId: chainId,
    lastIndexedBlock: BigInt(event.block.number),
    lastIndexedTimestamp: BigInt(event.block.timestamp),
    totalGamesIndexed: totalGames + (isNewGame ? 1 : 0),
    isBackfilling: false, // Will be true during initial sync
  });
}
