import { createPublicClient, http, type PublicClient } from "viem";
import { monad, monadTestnet } from "viem/chains";

export const testnetRpc =
	import.meta.env.VITE_MONAD_TESTNET_RPC_URL ||
	monadTestnet.rpcUrls.default.http[0];
export const mainnetRpc =
	import.meta.env.VITE_MONAD_MAINNET_RPC_URL || monad.rpcUrls.default.http[0];

export const testnetPublicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(testnetRpc),
});
export const mainnetPublicClient = createPublicClient({
	chain: monad,
	transport: http(mainnetRpc),
});

type FeeCache = { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
const cachedFees: { testnet: FeeCache | null; mainnet: FeeCache | null } = {
	testnet: null,
	mainnet: null,
};

export async function getEstimatedFees(
	publicClient: PublicClient,
	network: "mainnet" | "testnet",
): Promise<FeeCache> {
	if (cachedFees[network]) {
		return cachedFees[network];
	}

	const fees = await publicClient.estimateFeesPerGas();
	cachedFees[network] = {
		maxFeePerGas: fees.maxFeePerGas,
		maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
	};
	return cachedFees[network];
}
