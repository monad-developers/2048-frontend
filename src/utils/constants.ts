import type { Network } from "@/contexts/NetworkContext";

export const GAME_CONTRACT_ADDRESS: Record<Network, `0x${string}`> = {
	testnet: "0xC52d29f79b2552801e95C8Dc7646f59125009904",
	mainnet: "0x653d2536D82FA9812337D91e60BC2b9Fc19864Db",
};
