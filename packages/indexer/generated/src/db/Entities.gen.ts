/* TypeScript file generated from Entities.res by genType. */

/* eslint-disable */
/* tslint:disable */

export type id = string;

export type whereOperations<entity,fieldType> = {
  readonly eq: (_1:fieldType) => Promise<entity[]>; 
  readonly gt: (_1:fieldType) => Promise<entity[]>; 
  readonly lt: (_1:fieldType) => Promise<entity[]>
};

export type Game_t = {
  readonly highestTile: number; 
  readonly id: id; 
  readonly isActive: boolean; 
  readonly lastMoveAt: bigint; 
  readonly latestBoard: string; 
  readonly moveCount: number; 
  readonly player: string; 
  readonly score: number; 
  readonly startedAt: bigint; 
  readonly totalGasUsed: bigint; 
  readonly totalMonBurned: bigint
};

export type Game_indexedFieldOperations = { readonly player: whereOperations<Game_t,string> };

export type GameMove_t = {
  readonly boardAfter: string; 
  readonly boardBefore: string; 
  readonly direction: number; 
  readonly gameId: string; 
  readonly gasPrice: bigint; 
  readonly gasUsed: bigint; 
  readonly id: id; 
  readonly monBurned: bigint; 
  readonly moveNumber: number; 
  readonly scoreDelta: number; 
  readonly timestamp: bigint; 
  readonly txHash: string
};

export type GameMove_indexedFieldOperations = { readonly gameId: whereOperations<GameMove_t,string> };

export type IndexerStatus_t = {
  readonly chainId: number; 
  readonly id: id; 
  readonly isBackfilling: boolean; 
  readonly lastIndexedBlock: bigint; 
  readonly lastIndexedTimestamp: bigint; 
  readonly totalGamesIndexed: number
};

export type IndexerStatus_indexedFieldOperations = {};

export type Player_t = {
  readonly bestGameId: (undefined | string); 
  readonly bestScore: number; 
  readonly id: id; 
  readonly totalGamesPlayed: number; 
  readonly totalMonBurned: bigint; 
  readonly totalMovesPlayed: number
};

export type Player_indexedFieldOperations = {};
