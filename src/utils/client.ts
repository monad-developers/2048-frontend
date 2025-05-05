import { monadTestnet } from "viem/chains";
import { createPublicClient, http } from "viem";

const environment = import.meta.env.VITE_APP_ENVIRONMENT;
const rpc =
    environment === "prod"
        ? import.meta.env.VITE_MONAD_RPC_URL! ||
          monadTestnet.rpcUrls.default.http[0]
        : monadTestnet.rpcUrls.default.http[0];

export const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(rpc),
});
