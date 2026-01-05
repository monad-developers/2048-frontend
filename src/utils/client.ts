import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

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

let cachedFees: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } | null =
	null;

export async function getEstimatedFees(): Promise<{
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
}> {
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
