  @genType
module Monad2048 = {
  module NewGame = Types.MakeRegister(Types.Monad2048.NewGame)
  module NewMove = Types.MakeRegister(Types.Monad2048.NewMove)
}

@genType /** Register a Block Handler. It'll be called for every block by default. */
let onBlock: (
  Envio.onBlockOptions<Types.chain>,
  Envio.onBlockArgs<Types.handlerContext> => promise<unit>,
) => unit = (
  EventRegister.onBlock: (unknown, Internal.onBlockArgs => promise<unit>) => unit
)->Utils.magic
