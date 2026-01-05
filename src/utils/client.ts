import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

export const publicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(),
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
