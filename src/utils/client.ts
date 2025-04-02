import { monadTestnet } from "./chain";
import { createThirdwebClient, getRpcClient } from "thirdweb";

export const client = createThirdwebClient({ clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID });

export const rpcRequest = getRpcClient({ client, chain: monadTestnet });