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
