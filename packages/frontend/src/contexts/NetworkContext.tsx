import { createContext, type ReactNode, useContext, useState } from "react";
import type { Chain, PublicClient } from "viem";
import { monad, monadTestnet } from "viem/chains";
import {
	mainnetPublicClient,
	mainnetRpc,
	testnetPublicClient,
	testnetRpc,
} from "@/utils/client";

export type Network = "mainnet" | "testnet";

type NetworkContextType = {
	network: Network;
	setNetwork: (network: Network) => void;
	chain: Chain;
	publicClient: PublicClient;
	rpcUrl: string;
	explorerUrl: string;
};

const NetworkContext = createContext<NetworkContextType | null>(null);

function getNetworkFromUrl(): Network {
	const params = new URLSearchParams(window.location.search);
	const network = params.get("network");
	return network === "mainnet" ? "mainnet" : "testnet";
}

function updateUrlParam(network: Network) {
	const url = new URL(window.location.href);
	if (network === "testnet") {
		url.searchParams.delete("network");
	} else {
		url.searchParams.set("network", network);
	}
	window.history.replaceState({}, "", url.toString());
}

export function NetworkProvider({ children }: { children: ReactNode }) {
	const [network, setNetworkState] = useState<Network>(getNetworkFromUrl);

	const setNetwork = (newNetwork: Network) => {
		setNetworkState(newNetwork);
		updateUrlParam(newNetwork);
	};

	const chain = network === "mainnet" ? monad : monadTestnet;
	const publicClient =
		network === "mainnet" ? mainnetPublicClient : testnetPublicClient;
	const rpcUrl = network === "mainnet" ? mainnetRpc : testnetRpc;

	return (
		<NetworkContext.Provider
			value={{
				network,
				setNetwork,
				chain,
				publicClient,
				rpcUrl,
				explorerUrl: chain.blockExplorers.default.url,
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
