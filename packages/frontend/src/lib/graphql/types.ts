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

export interface LeaderboardQueryResponse {
  Game: LeaderboardEntry[];
}

export interface IndexerStatusQueryResponse {
  IndexerStatus: IndexerStatus[];
}

export interface PlayerGamesQueryResponse {
  Game: Array<{
    id: string;
    score: number;
    highestTile: number;
    moveCount: number;
  }>;
}
