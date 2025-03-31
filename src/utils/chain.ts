import { defineChain } from "thirdweb";

export const monadTestnet = /*@__PURE__*/ defineChain({
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    blockExplorers: [
      {
        name: "Monad Explorer",
        url: "https://testnet.monadexplorer.com/",
      },
    ],
    testnet: true,
});