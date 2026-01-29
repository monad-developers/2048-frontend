import { createPublicClient, http, type PublicClient } from "viem";
import { monad } from "viem/chains";

export const mainnetRpc =
	import.meta.env.VITE_MONAD_MAINNET_RPC_URL || monad.rpcUrls.default.http[0];

export const mainnetPublicClient = createPublicClient({
	chain: monad,
	transport: http(mainnetRpc),
});

type FeeCache = { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
let cachedFees: FeeCache | null = null;

export async function getEstimatedFees(
	publicClient: PublicClient,
): Promise<FeeCache> {
	if (cachedFees) {
		return cachedFees;
	}

	const fees = await publicClient.estimateFeesPerGas();
	cachedFees = {
		maxFeePerGas: fees.maxFeePerGas,
		maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
	};
	return cachedFees;
}
