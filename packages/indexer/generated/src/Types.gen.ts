/* TypeScript file generated from Types.res by genType. */

/* eslint-disable */
/* tslint:disable */

import type {GameMove_t as Entities_GameMove_t} from '../src/db/Entities.gen';

import type {Game_t as Entities_Game_t} from '../src/db/Entities.gen';

import type {HandlerContext as $$handlerContext} from './Types.ts';

import type {HandlerWithOptions as $$fnWithEventConfig} from './bindings/OpaqueTypes.ts';

import type {IndexerStatus_t as Entities_IndexerStatus_t} from '../src/db/Entities.gen';

import type {LoaderContext as $$loaderContext} from './Types.ts';

import type {Player_t as Entities_Player_t} from '../src/db/Entities.gen';

import type {SingleOrMultiple as $$SingleOrMultiple_t} from './bindings/OpaqueTypes';

import type {entityHandlerContext as Internal_entityHandlerContext} from 'envio/src/Internal.gen';

import type {eventOptions as Internal_eventOptions} from 'envio/src/Internal.gen';

import type {genericContractRegisterArgs as Internal_genericContractRegisterArgs} from 'envio/src/Internal.gen';

import type {genericContractRegister as Internal_genericContractRegister} from 'envio/src/Internal.gen';

import type {genericEvent as Internal_genericEvent} from 'envio/src/Internal.gen';

import type {genericHandlerArgs as Internal_genericHandlerArgs} from 'envio/src/Internal.gen';

import type {genericHandlerWithLoader as Internal_genericHandlerWithLoader} from 'envio/src/Internal.gen';

import type {genericHandler as Internal_genericHandler} from 'envio/src/Internal.gen';

import type {genericLoaderArgs as Internal_genericLoaderArgs} from 'envio/src/Internal.gen';

import type {genericLoader as Internal_genericLoader} from 'envio/src/Internal.gen';

import type {logger as Envio_logger} from 'envio/src/Envio.gen';

import type {t as Address_t} from 'envio/src/Address.gen';

export type id = string;
export type Id = id;

export type contractRegistrations = { readonly log: Envio_logger; readonly addMonad2048: (_1:Address_t) => void };

export type entityLoaderContext<entity,indexedFieldOperations> = {
  readonly get: (_1:id) => Promise<(undefined | entity)>; 
  readonly getOrThrow: (_1:id, message:(undefined | string)) => Promise<entity>; 
  readonly getWhere: indexedFieldOperations; 
  readonly getOrCreate: (_1:entity) => Promise<entity>; 
  readonly set: (_1:entity) => void; 
  readonly deleteUnsafe: (_1:id) => void
};

export type loaderContext = $$loaderContext;

export type entityHandlerContext<entity> = Internal_entityHandlerContext<entity>;

export type handlerContext = $$handlerContext;

export type game = Entities_Game_t;
export type Game = game;

export type gameMove = Entities_GameMove_t;
export type GameMove = gameMove;

export type indexerStatus = Entities_IndexerStatus_t;
export type IndexerStatus = indexerStatus;

export type player = Entities_Player_t;
export type Player = player;

export type Transaction_t = {
  readonly hash: string; 
  readonly from: (undefined | Address_t); 
  readonly gasUsed: bigint; 
  readonly effectiveGasPrice: bigint; 
  readonly gasPrice: (undefined | bigint)
};

export type Block_t = {
  readonly number: number; 
  readonly timestamp: number; 
  readonly hash: string
};

export type AggregatedBlock_t = {
  readonly hash: string; 
  readonly number: number; 
  readonly timestamp: number
};

export type AggregatedTransaction_t = {
  readonly effectiveGasPrice: bigint; 
  readonly from: (undefined | Address_t); 
  readonly gasPrice: (undefined | bigint); 
  readonly gasUsed: bigint; 
  readonly hash: string
};

export type eventLog<params> = Internal_genericEvent<params,Block_t,Transaction_t>;
export type EventLog<params> = eventLog<params>;

export type SingleOrMultiple_t<a> = $$SingleOrMultiple_t<a>;

export type HandlerTypes_args<eventArgs,context> = { readonly event: eventLog<eventArgs>; readonly context: context };

export type HandlerTypes_contractRegisterArgs<eventArgs> = Internal_genericContractRegisterArgs<eventLog<eventArgs>,contractRegistrations>;

export type HandlerTypes_contractRegister<eventArgs> = Internal_genericContractRegister<HandlerTypes_contractRegisterArgs<eventArgs>>;

export type HandlerTypes_loaderArgs<eventArgs> = Internal_genericLoaderArgs<eventLog<eventArgs>,loaderContext>;

export type HandlerTypes_loader<eventArgs,loaderReturn> = Internal_genericLoader<HandlerTypes_loaderArgs<eventArgs>,loaderReturn>;

export type HandlerTypes_handlerArgs<eventArgs,loaderReturn> = Internal_genericHandlerArgs<eventLog<eventArgs>,handlerContext,loaderReturn>;

export type HandlerTypes_handler<eventArgs,loaderReturn> = Internal_genericHandler<HandlerTypes_handlerArgs<eventArgs,loaderReturn>>;

export type HandlerTypes_loaderHandler<eventArgs,loaderReturn,eventFilters> = Internal_genericHandlerWithLoader<HandlerTypes_loader<eventArgs,loaderReturn>,HandlerTypes_handler<eventArgs,loaderReturn>,eventFilters>;

export type HandlerTypes_eventConfig<eventFilters> = Internal_eventOptions<eventFilters>;

export type fnWithEventConfig<fn,eventConfig> = $$fnWithEventConfig<fn,eventConfig>;

export type handlerWithOptions<eventArgs,loaderReturn,eventFilters> = fnWithEventConfig<HandlerTypes_handler<eventArgs,loaderReturn>,HandlerTypes_eventConfig<eventFilters>>;

export type contractRegisterWithOptions<eventArgs,eventFilters> = fnWithEventConfig<HandlerTypes_contractRegister<eventArgs>,HandlerTypes_eventConfig<eventFilters>>;

export type Monad2048_chainId = 143;

export type Monad2048_NewGame_eventArgs = {
  readonly player: Address_t; 
  readonly id: string; 
  readonly board: bigint
};

export type Monad2048_NewGame_block = Block_t;

export type Monad2048_NewGame_transaction = Transaction_t;

export type Monad2048_NewGame_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: Monad2048_NewGame_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: Monad2048_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: Monad2048_NewGame_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: Monad2048_NewGame_block
};

export type Monad2048_NewGame_loaderArgs = Internal_genericLoaderArgs<Monad2048_NewGame_event,loaderContext>;

export type Monad2048_NewGame_loader<loaderReturn> = Internal_genericLoader<Monad2048_NewGame_loaderArgs,loaderReturn>;

export type Monad2048_NewGame_handlerArgs<loaderReturn> = Internal_genericHandlerArgs<Monad2048_NewGame_event,handlerContext,loaderReturn>;

export type Monad2048_NewGame_handler<loaderReturn> = Internal_genericHandler<Monad2048_NewGame_handlerArgs<loaderReturn>>;

export type Monad2048_NewGame_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<Monad2048_NewGame_event,contractRegistrations>>;

export type Monad2048_NewGame_eventFilter = { readonly player?: SingleOrMultiple_t<Address_t>; readonly id?: SingleOrMultiple_t<string> };

export type Monad2048_NewGame_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: Monad2048_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type Monad2048_NewGame_eventFiltersDefinition = 
    Monad2048_NewGame_eventFilter
  | Monad2048_NewGame_eventFilter[];

export type Monad2048_NewGame_eventFilters = 
    Monad2048_NewGame_eventFilter
  | Monad2048_NewGame_eventFilter[]
  | ((_1:Monad2048_NewGame_eventFiltersArgs) => Monad2048_NewGame_eventFiltersDefinition);

export type Monad2048_NewMove_eventArgs = {
  readonly player: Address_t; 
  readonly id: string; 
  readonly move: bigint; 
  readonly result: bigint
};

export type Monad2048_NewMove_block = Block_t;

export type Monad2048_NewMove_transaction = Transaction_t;

export type Monad2048_NewMove_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: Monad2048_NewMove_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: Monad2048_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: Monad2048_NewMove_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: Monad2048_NewMove_block
};

export type Monad2048_NewMove_loaderArgs = Internal_genericLoaderArgs<Monad2048_NewMove_event,loaderContext>;

export type Monad2048_NewMove_loader<loaderReturn> = Internal_genericLoader<Monad2048_NewMove_loaderArgs,loaderReturn>;

export type Monad2048_NewMove_handlerArgs<loaderReturn> = Internal_genericHandlerArgs<Monad2048_NewMove_event,handlerContext,loaderReturn>;

export type Monad2048_NewMove_handler<loaderReturn> = Internal_genericHandler<Monad2048_NewMove_handlerArgs<loaderReturn>>;

export type Monad2048_NewMove_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<Monad2048_NewMove_event,contractRegistrations>>;

export type Monad2048_NewMove_eventFilter = { readonly player?: SingleOrMultiple_t<Address_t>; readonly id?: SingleOrMultiple_t<string> };

export type Monad2048_NewMove_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: Monad2048_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type Monad2048_NewMove_eventFiltersDefinition = 
    Monad2048_NewMove_eventFilter
  | Monad2048_NewMove_eventFilter[];

export type Monad2048_NewMove_eventFilters = 
    Monad2048_NewMove_eventFilter
  | Monad2048_NewMove_eventFilter[]
  | ((_1:Monad2048_NewMove_eventFiltersArgs) => Monad2048_NewMove_eventFiltersDefinition);

export type chainId = number;

export type chain = 143;
