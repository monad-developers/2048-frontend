import { createContext, type ReactNode, useContext } from "react";
import type { Chain, PublicClient } from "viem";
import { monad } from "viem/chains";
import { mainnetPublicClient, mainnetRpc } from "@/utils/client";

type NetworkContextType = {
	chain: Chain;
	publicClient: PublicClient;
	rpcUrl: string;
	explorerUrl: string;
};

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
	return (
		<NetworkContext.Provider
			value={{
				chain: monad,
				publicClient: mainnetPublicClient,
				rpcUrl: mainnetRpc,
				explorerUrl: monad.blockExplorers.default.url,
			}}
		>
			{children}
		</NetworkContext.Provider>
	);
}

export function useNetwork() {
	const context = useContext(NetworkContext);
	if (!context) {
		throw new Error("useNetwork must be used within a NetworkProvider");
	}
	return context;
}
