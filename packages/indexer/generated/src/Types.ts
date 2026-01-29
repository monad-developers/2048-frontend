// This file is to dynamically generate TS types
// which we can't get using GenType
// Use @genType.import to link the types back to ReScript code

import type { Logger, EffectCaller } from "envio";
import type * as Entities from "./db/Entities.gen.ts";

export type LoaderContext = {
  /**
   * Access the logger instance with event as a context. The logs will be displayed in the console and Envio Hosted Service.
   */
  readonly log: Logger;
  /**
   * Call the provided Effect with the given input.
   * Effects are the best for external calls with automatic deduplication, error handling and caching.
   * Define a new Effect using createEffect outside of the handler.
   */
  readonly effect: EffectCaller;
  /**
   * True when the handlers run in preload mode - in parallel for the whole batch.
   * Handlers run twice per batch of events, and the first time is the "preload" run
   * During preload entities aren't set, logs are ignored and exceptions are silently swallowed.
   * Preload mode is the best time to populate data to in-memory cache.
   * After preload the handler will run for the second time in sequential order of events.
   */
  readonly isPreload: boolean;
  /**
   * Per-chain state information accessible in event handlers and block handlers.
   * Each chain ID maps to an object containing chain-specific state:
   * - isReady: true when the chain has completed initial sync and is processing live events,
   *            false during historical synchronization
   */
  readonly chains: {
    [chainId: string]: {
      readonly isReady: boolean;
    };
  };
  readonly Game: {
    /**
     * Load the entity Game from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.Game_t | undefined>,
    /**
     * Load the entity Game from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.Game_t>,
    readonly getWhere: Entities.Game_indexedFieldOperations,
    /**
     * Returns the entity Game from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.Game_t) => Promise<Entities.Game_t>,
    /**
     * Set the entity Game in the storage.
     */
    readonly set: (entity: Entities.Game_t) => void,
    /**
     * Delete the entity Game from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly GameMove: {
    /**
     * Load the entity GameMove from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.GameMove_t | undefined>,
    /**
     * Load the entity GameMove from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.GameMove_t>,
    readonly getWhere: Entities.GameMove_indexedFieldOperations,
    /**
     * Returns the entity GameMove from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.GameMove_t) => Promise<Entities.GameMove_t>,
    /**
     * Set the entity GameMove in the storage.
     */
    readonly set: (entity: Entities.GameMove_t) => void,
    /**
     * Delete the entity GameMove from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly IndexerStatus: {
    /**
     * Load the entity IndexerStatus from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.IndexerStatus_t | undefined>,
    /**
     * Load the entity IndexerStatus from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.IndexerStatus_t>,
    readonly getWhere: Entities.IndexerStatus_indexedFieldOperations,
    /**
     * Returns the entity IndexerStatus from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.IndexerStatus_t) => Promise<Entities.IndexerStatus_t>,
    /**
     * Set the entity IndexerStatus in the storage.
     */
    readonly set: (entity: Entities.IndexerStatus_t) => void,
    /**
     * Delete the entity IndexerStatus from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly Player: {
    /**
     * Load the entity Player from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.Player_t | undefined>,
    /**
     * Load the entity Player from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.Player_t>,
    readonly getWhere: Entities.Player_indexedFieldOperations,
    /**
     * Returns the entity Player from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.Player_t) => Promise<Entities.Player_t>,
    /**
     * Set the entity Player in the storage.
     */
    readonly set: (entity: Entities.Player_t) => void,
    /**
     * Delete the entity Player from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
};

export type HandlerContext = {
  /**
   * Access the logger instance with event as a context. The logs will be displayed in the console and Envio Hosted Service.
   */
  readonly log: Logger;
  /**
   * Call the provided Effect with the given input.
   * Effects are the best for external calls with automatic deduplication, error handling and caching.
   * Define a new Effect using createEffect outside of the handler.
   */
  readonly effect: EffectCaller;
  /**
   * Per-chain state information accessible in event handlers and block handlers.
   * Each chain ID maps to an object containing chain-specific state:
   * - isReady: true when the chain has completed initial sync and is processing live events,
   *            false during historical synchronization
   */
  readonly chains: {
    [chainId: string]: {
      readonly isReady: boolean;
    };
  };
  readonly Game: {
    /**
     * Load the entity Game from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.Game_t | undefined>,
    /**
     * Load the entity Game from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.Game_t>,
    /**
     * Returns the entity Game from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.Game_t) => Promise<Entities.Game_t>,
    /**
     * Set the entity Game in the storage.
     */
    readonly set: (entity: Entities.Game_t) => void,
    /**
     * Delete the entity Game from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly GameMove: {
    /**
     * Load the entity GameMove from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.GameMove_t | undefined>,
    /**
     * Load the entity GameMove from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.GameMove_t>,
    /**
     * Returns the entity GameMove from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.GameMove_t) => Promise<Entities.GameMove_t>,
    /**
     * Set the entity GameMove in the storage.
     */
    readonly set: (entity: Entities.GameMove_t) => void,
    /**
     * Delete the entity GameMove from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly IndexerStatus: {
    /**
     * Load the entity IndexerStatus from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.IndexerStatus_t | undefined>,
    /**
     * Load the entity IndexerStatus from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.IndexerStatus_t>,
    /**
     * Returns the entity IndexerStatus from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.IndexerStatus_t) => Promise<Entities.IndexerStatus_t>,
    /**
     * Set the entity IndexerStatus in the storage.
     */
    readonly set: (entity: Entities.IndexerStatus_t) => void,
    /**
     * Delete the entity IndexerStatus from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly Player: {
    /**
     * Load the entity Player from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.Player_t | undefined>,
    /**
     * Load the entity Player from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.Player_t>,
    /**
     * Returns the entity Player from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.Player_t) => Promise<Entities.Player_t>,
    /**
     * Set the entity Player in the storage.
     */
    readonly set: (entity: Entities.Player_t) => void,
    /**
     * Delete the entity Player from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
};
