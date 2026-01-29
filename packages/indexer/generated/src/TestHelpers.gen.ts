/* TypeScript file generated from TestHelpers.res by genType. */

/* eslint-disable */
/* tslint:disable */

const TestHelpersJS = require('./TestHelpers.res.js');

import type {Monad2048_NewGame_event as Types_Monad2048_NewGame_event} from './Types.gen';

import type {Monad2048_NewMove_event as Types_Monad2048_NewMove_event} from './Types.gen';

import type {t as Address_t} from 'envio/src/Address.gen';

import type {t as TestHelpers_MockDb_t} from './TestHelpers_MockDb.gen';

/** The arguements that get passed to a "processEvent" helper function */
export type EventFunctions_eventProcessorArgs<event> = {
  readonly event: event; 
  readonly mockDb: TestHelpers_MockDb_t; 
  readonly chainId?: number
};

export type EventFunctions_eventProcessor<event> = (_1:EventFunctions_eventProcessorArgs<event>) => Promise<TestHelpers_MockDb_t>;

export type EventFunctions_MockBlock_t = {
  readonly hash?: string; 
  readonly number?: number; 
  readonly timestamp?: number
};

export type EventFunctions_MockTransaction_t = {
  readonly effectiveGasPrice?: bigint; 
  readonly from?: (undefined | Address_t); 
  readonly gasPrice?: (undefined | bigint); 
  readonly gasUsed?: bigint; 
  readonly hash?: string
};

export type EventFunctions_mockEventData = {
  readonly chainId?: number; 
  readonly srcAddress?: Address_t; 
  readonly logIndex?: number; 
  readonly block?: EventFunctions_MockBlock_t; 
  readonly transaction?: EventFunctions_MockTransaction_t
};

export type Monad2048_NewGame_createMockArgs = {
  readonly player?: Address_t; 
  readonly id?: string; 
  readonly board?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type Monad2048_NewMove_createMockArgs = {
  readonly player?: Address_t; 
  readonly id?: string; 
  readonly move?: bigint; 
  readonly result?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export const MockDb_createMockDb: () => TestHelpers_MockDb_t = TestHelpersJS.MockDb.createMockDb as any;

export const Addresses_mockAddresses: Address_t[] = TestHelpersJS.Addresses.mockAddresses as any;

export const Addresses_defaultAddress: Address_t = TestHelpersJS.Addresses.defaultAddress as any;

export const Monad2048_NewGame_processEvent: EventFunctions_eventProcessor<Types_Monad2048_NewGame_event> = TestHelpersJS.Monad2048.NewGame.processEvent as any;

export const Monad2048_NewGame_createMockEvent: (args:Monad2048_NewGame_createMockArgs) => Types_Monad2048_NewGame_event = TestHelpersJS.Monad2048.NewGame.createMockEvent as any;

export const Monad2048_NewMove_processEvent: EventFunctions_eventProcessor<Types_Monad2048_NewMove_event> = TestHelpersJS.Monad2048.NewMove.processEvent as any;

export const Monad2048_NewMove_createMockEvent: (args:Monad2048_NewMove_createMockArgs) => Types_Monad2048_NewMove_event = TestHelpersJS.Monad2048.NewMove.createMockEvent as any;

export const Addresses: { mockAddresses: Address_t[]; defaultAddress: Address_t } = TestHelpersJS.Addresses as any;

export const Monad2048: { NewGame: { processEvent: EventFunctions_eventProcessor<Types_Monad2048_NewGame_event>; createMockEvent: (args:Monad2048_NewGame_createMockArgs) => Types_Monad2048_NewGame_event }; NewMove: { processEvent: EventFunctions_eventProcessor<Types_Monad2048_NewMove_event>; createMockEvent: (args:Monad2048_NewMove_createMockArgs) => Types_Monad2048_NewMove_event } } = TestHelpersJS.Monad2048 as any;

export const MockDb: { createMockDb: () => TestHelpers_MockDb_t } = TestHelpersJS.MockDb as any;
