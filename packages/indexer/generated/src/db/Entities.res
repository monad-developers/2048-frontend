open Table
open Enums.EntityType
type id = string

type internalEntity = Internal.entity
module type Entity = {
  type t
  let index: int
  let name: string
  let schema: S.t<t>
  let rowsSchema: S.t<array<t>>
  let table: Table.table
  let entityHistory: EntityHistory.t<t>
}
external entityModToInternal: module(Entity with type t = 'a) => Internal.entityConfig = "%identity"
external entityModsToInternal: array<module(Entity)> => array<Internal.entityConfig> = "%identity"
external entitiesToInternal: array<'a> => array<Internal.entity> = "%identity"

@get
external getEntityId: internalEntity => string = "id"

// Use InMemoryTable.Entity.getEntityIdUnsafe instead of duplicating the logic
let getEntityIdUnsafe = InMemoryTable.Entity.getEntityIdUnsafe

//shorthand for punning
let isPrimaryKey = true
let isNullable = true
let isArray = true
let isIndex = true

@genType
type whereOperations<'entity, 'fieldType> = {
  eq: 'fieldType => promise<array<'entity>>,
  gt: 'fieldType => promise<array<'entity>>,
  lt: 'fieldType => promise<array<'entity>>
}

module Game = {
  let name = (Game :> string)
  let index = 0
  @genType
  type t = {
    highestTile: int,
    id: id,
    isActive: bool,
    lastMoveAt: bigint,
    latestBoard: string,
    moveCount: int,
    player: string,
    score: int,
    startedAt: bigint,
    totalGasUsed: bigint,
    totalMonBurned: bigint,
  }

  let schema = S.object((s): t => {
    highestTile: s.field("highestTile", S.int),
    id: s.field("id", S.string),
    isActive: s.field("isActive", S.bool),
    lastMoveAt: s.field("lastMoveAt", BigInt.schema),
    latestBoard: s.field("latestBoard", S.string),
    moveCount: s.field("moveCount", S.int),
    player: s.field("player", S.string),
    score: s.field("score", S.int),
    startedAt: s.field("startedAt", BigInt.schema),
    totalGasUsed: s.field("totalGasUsed", BigInt.schema),
    totalMonBurned: s.field("totalMonBurned", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
      @as("player") player: whereOperations<t, string>,
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "highestTile", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "isActive", 
      Boolean,
      ~fieldSchema=S.bool,
      
      
      
      
      
      ),
      mkField(
      "lastMoveAt", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "latestBoard", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "moveCount", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "player", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      ~isIndex,
      
      ),
      mkField(
      "score", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "startedAt", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalGasUsed", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalMonBurned", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema, ~entityIndex=index)

  external castToInternal: t => Internal.entity = "%identity"
}

module GameMove = {
  let name = (GameMove :> string)
  let index = 1
  @genType
  type t = {
    boardAfter: string,
    boardBefore: string,
    direction: int,
    gameId: string,
    gasPrice: bigint,
    gasUsed: bigint,
    id: id,
    monBurned: bigint,
    moveNumber: int,
    scoreDelta: int,
    timestamp: bigint,
    txHash: string,
  }

  let schema = S.object((s): t => {
    boardAfter: s.field("boardAfter", S.string),
    boardBefore: s.field("boardBefore", S.string),
    direction: s.field("direction", S.int),
    gameId: s.field("gameId", S.string),
    gasPrice: s.field("gasPrice", BigInt.schema),
    gasUsed: s.field("gasUsed", BigInt.schema),
    id: s.field("id", S.string),
    monBurned: s.field("monBurned", BigInt.schema),
    moveNumber: s.field("moveNumber", S.int),
    scoreDelta: s.field("scoreDelta", S.int),
    timestamp: s.field("timestamp", BigInt.schema),
    txHash: s.field("txHash", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
      @as("gameId") gameId: whereOperations<t, string>,
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "boardAfter", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "boardBefore", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "direction", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "gameId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      ~isIndex,
      
      ),
      mkField(
      "gasPrice", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "gasUsed", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "monBurned", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "moveNumber", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "scoreDelta", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "timestamp", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "txHash", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema, ~entityIndex=index)

  external castToInternal: t => Internal.entity = "%identity"
}

module IndexerStatus = {
  let name = (IndexerStatus :> string)
  let index = 2
  @genType
  type t = {
    chainId: int,
    id: id,
    isBackfilling: bool,
    lastIndexedBlock: bigint,
    lastIndexedTimestamp: bigint,
    totalGamesIndexed: int,
  }

  let schema = S.object((s): t => {
    chainId: s.field("chainId", S.int),
    id: s.field("id", S.string),
    isBackfilling: s.field("isBackfilling", S.bool),
    lastIndexedBlock: s.field("lastIndexedBlock", BigInt.schema),
    lastIndexedTimestamp: s.field("lastIndexedTimestamp", BigInt.schema),
    totalGamesIndexed: s.field("totalGamesIndexed", S.int),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "chainId", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "isBackfilling", 
      Boolean,
      ~fieldSchema=S.bool,
      
      
      
      
      
      ),
      mkField(
      "lastIndexedBlock", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "lastIndexedTimestamp", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalGamesIndexed", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema, ~entityIndex=index)

  external castToInternal: t => Internal.entity = "%identity"
}

module Player = {
  let name = (Player :> string)
  let index = 3
  @genType
  type t = {
    bestGameId: option<string>,
    bestScore: int,
    id: id,
    totalGamesPlayed: int,
    totalMonBurned: bigint,
    totalMovesPlayed: int,
  }

  let schema = S.object((s): t => {
    bestGameId: s.field("bestGameId", S.null(S.string)),
    bestScore: s.field("bestScore", S.int),
    id: s.field("id", S.string),
    totalGamesPlayed: s.field("totalGamesPlayed", S.int),
    totalMonBurned: s.field("totalMonBurned", BigInt.schema),
    totalMovesPlayed: s.field("totalMovesPlayed", S.int),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "bestGameId", 
      Text,
      ~fieldSchema=S.null(S.string),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "bestScore", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "totalGamesPlayed", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
      mkField(
      "totalMonBurned", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalMovesPlayed", 
      Integer,
      ~fieldSchema=S.int,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema, ~entityIndex=index)

  external castToInternal: t => Internal.entity = "%identity"
}

let userEntities = [
  module(Game),
  module(GameMove),
  module(IndexerStatus),
  module(Player),
]->entityModsToInternal

let allEntities =
  userEntities->Js.Array2.concat(
    [module(InternalTable.DynamicContractRegistry)]->entityModsToInternal,
  )

let byName =
  allEntities
  ->Js.Array2.map(entityConfig => {
    (entityConfig.name, entityConfig)
  })
  ->Js.Dict.fromArray
