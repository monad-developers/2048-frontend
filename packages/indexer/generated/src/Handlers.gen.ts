/* TypeScript file generated from Handlers.res by genType. */

/* eslint-disable */
/* tslint:disable */

const HandlersJS = require('./Handlers.res.js');

import type {HandlerTypes_eventConfig as Types_HandlerTypes_eventConfig} from './Types.gen';

import type {Monad2048_NewGame_eventFilters as Types_Monad2048_NewGame_eventFilters} from './Types.gen';

import type {Monad2048_NewGame_event as Types_Monad2048_NewGame_event} from './Types.gen';

import type {Monad2048_NewMove_eventFilters as Types_Monad2048_NewMove_eventFilters} from './Types.gen';

import type {Monad2048_NewMove_event as Types_Monad2048_NewMove_event} from './Types.gen';

import type {chain as Types_chain} from './Types.gen';

import type {contractRegistrations as Types_contractRegistrations} from './Types.gen';

import type {fnWithEventConfig as Types_fnWithEventConfig} from './Types.gen';

import type {genericContractRegisterArgs as Internal_genericContractRegisterArgs} from 'envio/src/Internal.gen';

import type {genericContractRegister as Internal_genericContractRegister} from 'envio/src/Internal.gen';

import type {genericHandlerArgs as Internal_genericHandlerArgs} from 'envio/src/Internal.gen';

import type {genericHandlerWithLoader as Internal_genericHandlerWithLoader} from 'envio/src/Internal.gen';

import type {genericHandler as Internal_genericHandler} from 'envio/src/Internal.gen';

import type {genericLoaderArgs as Internal_genericLoaderArgs} from 'envio/src/Internal.gen';

import type {genericLoader as Internal_genericLoader} from 'envio/src/Internal.gen';

import type {handlerContext as Types_handlerContext} from './Types.gen';

import type {loaderContext as Types_loaderContext} from './Types.gen';

import type {onBlockArgs as Envio_onBlockArgs} from 'envio/src/Envio.gen';

import type {onBlockOptions as Envio_onBlockOptions} from 'envio/src/Envio.gen';

export const Monad2048_NewGame_contractRegister: Types_fnWithEventConfig<Internal_genericContractRegister<Internal_genericContractRegisterArgs<Types_Monad2048_NewGame_event,Types_contractRegistrations>>,Types_HandlerTypes_eventConfig<Types_Monad2048_NewGame_eventFilters>> = HandlersJS.Monad2048.NewGame.contractRegister as any;

export const Monad2048_NewGame_handler: Types_fnWithEventConfig<Internal_genericHandler<Internal_genericHandlerArgs<Types_Monad2048_NewGame_event,Types_handlerContext,void>>,Types_HandlerTypes_eventConfig<Types_Monad2048_NewGame_eventFilters>> = HandlersJS.Monad2048.NewGame.handler as any;

export const Monad2048_NewGame_handlerWithLoader: <loaderReturn>(_1:Internal_genericHandlerWithLoader<Internal_genericLoader<Internal_genericLoaderArgs<Types_Monad2048_NewGame_event,Types_loaderContext>,loaderReturn>,Internal_genericHandler<Internal_genericHandlerArgs<Types_Monad2048_NewGame_event,Types_handlerContext,loaderReturn>>,Types_Monad2048_NewGame_eventFilters>) => void = HandlersJS.Monad2048.NewGame.handlerWithLoader as any;

export const Monad2048_NewMove_contractRegister: Types_fnWithEventConfig<Internal_genericContractRegister<Internal_genericContractRegisterArgs<Types_Monad2048_NewMove_event,Types_contractRegistrations>>,Types_HandlerTypes_eventConfig<Types_Monad2048_NewMove_eventFilters>> = HandlersJS.Monad2048.NewMove.contractRegister as any;

export const Monad2048_NewMove_handler: Types_fnWithEventConfig<Internal_genericHandler<Internal_genericHandlerArgs<Types_Monad2048_NewMove_event,Types_handlerContext,void>>,Types_HandlerTypes_eventConfig<Types_Monad2048_NewMove_eventFilters>> = HandlersJS.Monad2048.NewMove.handler as any;

export const Monad2048_NewMove_handlerWithLoader: <loaderReturn>(_1:Internal_genericHandlerWithLoader<Internal_genericLoader<Internal_genericLoaderArgs<Types_Monad2048_NewMove_event,Types_loaderContext>,loaderReturn>,Internal_genericHandler<Internal_genericHandlerArgs<Types_Monad2048_NewMove_event,Types_handlerContext,loaderReturn>>,Types_Monad2048_NewMove_eventFilters>) => void = HandlersJS.Monad2048.NewMove.handlerWithLoader as any;

/** Register a Block Handler. It'll be called for every block by default. */
export const onBlock: (_1:Envio_onBlockOptions<Types_chain>, _2:((_1:Envio_onBlockArgs<Types_handlerContext>) => Promise<void>)) => void = HandlersJS.onBlock as any;

export const Monad2048: { NewGame: {
  handlerWithLoader: <loaderReturn>(_1:Internal_genericHandlerWithLoader<Internal_genericLoader<Internal_genericLoaderArgs<Types_Monad2048_NewGame_event,Types_loaderContext>,loaderReturn>,Internal_genericHandler<Internal_genericHandlerArgs<Types_Monad2048_NewGame_event,Types_handlerContext,loaderReturn>>,Types_Monad2048_NewGame_eventFilters>) => void; 
  handler: Types_fnWithEventConfig<Internal_genericHandler<Internal_genericHandlerArgs<Types_Monad2048_NewGame_event,Types_handlerContext,void>>,Types_HandlerTypes_eventConfig<Types_Monad2048_NewGame_eventFilters>>; 
  contractRegister: Types_fnWithEventConfig<Internal_genericContractRegister<Internal_genericContractRegisterArgs<Types_Monad2048_NewGame_event,Types_contractRegistrations>>,Types_HandlerTypes_eventConfig<Types_Monad2048_NewGame_eventFilters>>
}; NewMove: {
  handlerWithLoader: <loaderReturn>(_1:Internal_genericHandlerWithLoader<Internal_genericLoader<Internal_genericLoaderArgs<Types_Monad2048_NewMove_event,Types_loaderContext>,loaderReturn>,Internal_genericHandler<Internal_genericHandlerArgs<Types_Monad2048_NewMove_event,Types_handlerContext,loaderReturn>>,Types_Monad2048_NewMove_eventFilters>) => void; 
  handler: Types_fnWithEventConfig<Internal_genericHandler<Internal_genericHandlerArgs<Types_Monad2048_NewMove_event,Types_handlerContext,void>>,Types_HandlerTypes_eventConfig<Types_Monad2048_NewMove_eventFilters>>; 
  contractRegister: Types_fnWithEventConfig<Internal_genericContractRegister<Internal_genericContractRegisterArgs<Types_Monad2048_NewMove_event,Types_contractRegistrations>>,Types_HandlerTypes_eventConfig<Types_Monad2048_NewMove_eventFilters>>
} } = HandlersJS.Monad2048 as any;
