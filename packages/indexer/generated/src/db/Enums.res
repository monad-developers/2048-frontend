module ContractType = {
  @genType
  type t = 
    | @as("Monad2048") Monad2048

  let name = "CONTRACT_TYPE"
  let variants = [
    Monad2048,
  ]
  let config = Internal.makeEnumConfig(~name, ~variants)
}

module EntityType = {
  @genType
  type t = 
    | @as("Game") Game
    | @as("GameMove") GameMove
    | @as("IndexerStatus") IndexerStatus
    | @as("Player") Player
    | @as("dynamic_contract_registry") DynamicContractRegistry

  let name = "ENTITY_TYPE"
  let variants = [
    Game,
    GameMove,
    IndexerStatus,
    Player,
    DynamicContractRegistry,
  ]
  let config = Internal.makeEnumConfig(~name, ~variants)
}

let allEnums = ([
  ContractType.config->Internal.fromGenericEnumConfig,
  EntityType.config->Internal.fromGenericEnumConfig,
])
