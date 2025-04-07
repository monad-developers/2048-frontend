import { monadTestnet } from 'viem/chains'
import { createPublicClient, http } from 'viem'

export const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http()
})