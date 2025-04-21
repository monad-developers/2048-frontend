import { Button } from "@/components/ui/button";
import { publicClient } from "@/utils/client";
import { GAME_CONTRACT_ADDRESS } from "@/utils/constants";
import { post } from "@/utils/fetch";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
    createWalletClient,
    custom,
    encodeFunctionData,
    encodePacked,
    Hex,
    keccak256,
    parseGwei,
    toHex,
} from "viem";
import { monadTestnet } from "viem/chains";

export function useTransactions() {
    // User and Wallet objects.
    const { user } = usePrivy();
    const { ready, wallets } = useWallets();

    // Fetch user nonce on new login.
    const userNonce = useRef(0);
    useEffect(() => {
        async function getNonce() {
            if (!user || !user.wallet) {
                return;
            }

            const nonce = await publicClient.getTransactionCount({
                address: user.wallet.address as Hex,
            });

            console.log("Setting nonce: ", nonce);
            userNonce.current = nonce;
        }

        getNonce();
    }, [user]);

    // Fetch provider on new login.
    const walletClient = useRef<any>(null);
    useEffect(() => {
        async function getWalletClient() {
            if (!ready || !wallets) return;

            const userWallet = wallets.find(
                (w) => w.walletClientType == "privy"
            );
            if (!userWallet) return;

            const ethereumProvider = await userWallet.getEthereumProvider();
            const provider = createWalletClient({
                chain: monadTestnet,
                transport: custom(ethereumProvider),
            });

            console.log("Setting provider: ", provider);
            walletClient.current = provider;
        }

        getWalletClient();
    }, [user, ready, wallets]);

    // Sends a transaction without waiting for receipt.
    async function sendRawTransaction({
        successText,
        gas,
        maxFeePerGas = parseGwei("50"),
        maxPriorityFeePerGas = parseGwei("2"),
        data,
    }: {
        gas: BigInt;
        maxFeePerGas?: BigInt;
        maxPriorityFeePerGas?: BigInt;
        data: Hex;
        successText?: string;
    }) {
        const nonce = userNonce.current;
        userNonce.current = nonce + 1;

        let e: Error | null = null;

        try {
            // Sign and send transaction.
            const provider = walletClient.current;

            const startTime = Date.now();
            const signedTransaction = await provider.signTransaction({
                to: GAME_CONTRACT_ADDRESS,
                account: user?.wallet?.address,
                data,
                nonce,
                gas,
                maxFeePerGas,
                maxPriorityFeePerGas,
            });

            const response = await post({
                url: monadTestnet.rpcUrls.default.http[0],
                params: {
                    id: 0,
                    jsonrpc: "2.0",
                    method: "eth_sendRawTransaction",
                    params: [signedTransaction],
                },
            });
            const time = Date.now() - startTime;

            if (response.error) {
                console.log(`Failed in ${time} ms`);
                throw Error(response.error.message);
            }

            // Fire toast info with benchmark and transaction hash.
            console.log(`Transaction sent in ${time} ms: ${response.result}`);
            toast.success(`Sent transaction.`, {
                description: `${successText} Time: ${time} ms`,
                action: (
                    <Button
                        className="outline outline-white"
                        onClick={() =>
                            window.open(
                                `https://testnet.monadexplorer.com/tx/${response.result}`,
                                "_blank",
                                "noopener,noreferrer"
                            )
                        }
                    >
                        <div className="flex items-center gap-1 p-1">
                            <p>View</p>
                            <ExternalLink className="w-4 h-4" />
                        </div>
                    </Button>
                ),
            });
        } catch (error) {
            e = error as Error;

            const nonce = await publicClient.getTransactionCount({
                address: user?.wallet?.address as Hex,
            });
            userNonce.current = nonce;

            toast.error(`Failed to send transaction.`, {
                description: `Error: ${e.message}`,
            });
        }

        if (e) {
            throw e;
        }
    }

    // Initializes a game. Calls `prepareGame` and `startGame`.
    async function initializeGameTransaction(moves: bigint[]): Promise<Hex> {
        if (moves.length < 4) {
            throw Error("Providing less than 4 moves to start the game.");
        }

        if (moves.length > 4) {
            throw Error("Providing more than 4 moves to start the game.");
        }

        if (!ready || !wallets) {
            throw Error("Logged in user not found.");
        }

        const userWallet = wallets.find((w) => w.walletClientType == "privy");
        if (!userWallet) {
            throw Error("Wallet not found.");
        }

        // Create random session ID
        const newSessionId: Hex = keccak256(toHex(Math.random().toString()));

        // Prepare the start position + first 3 moves of the game, and the hash of these boards.
        const game = [moves[0], moves[1], moves[2], moves[3]] as readonly [
            bigint,
            bigint,
            bigint,
            bigint
        ];
        const gameHash: Hex = keccak256(encodePacked(["uint256[4]"], [game]));

        // Sign and send transaction: prepare game
        console.log("Preparing game!");
        await sendRawTransaction({
            successText: "Reserved game!",
            gas: BigInt(75_000),
            data: encodeFunctionData({
                abi: [
                    {
                        type: "function",
                        name: "prepareGame",
                        inputs: [
                            {
                                name: "sessionId",
                                type: "bytes32",
                                internalType: "bytes32",
                            },
                            {
                                name: "game",
                                type: "bytes32",
                                internalType: "bytes32",
                            },
                        ],
                        outputs: [],
                        stateMutability: "nonpayable",
                    },
                ],
                functionName: "prepareGame",
                args: [newSessionId, gameHash],
            }),
        });

        // Sign and send transaction: start game
        console.log("Starting game!");
        await sendRawTransaction({
            successText: "Started game!",
            gas: BigInt(500_000),
            data: encodeFunctionData({
                abi: [
                    {
                        type: "function",
                        name: "startGame",
                        inputs: [
                            {
                                name: "sessionId",
                                type: "bytes32",
                                internalType: "bytes32",
                            },
                            {
                                name: "game",
                                type: "uint256[4]",
                                internalType: "uint256[4]",
                            },
                        ],
                        outputs: [],
                        stateMutability: "nonpayable",
                    },
                ],
                functionName: "startGame",
                args: [newSessionId, game],
            }),
        });

        return newSessionId;
    }

    async function playNewMoveTransaction(
        sessionId: Hex,
        move: bigint,
        moveCount: number
    ): Promise<void> {
        if (!ready || !wallets) {
            throw Error("Logged in user not found.");
        }

        const userWallet = wallets.find((w) => w.walletClientType == "privy");
        if (!userWallet) {
            throw Error("Wallet not found.");
        }

        // Sign and send transaction: play move
        console.log(`Playing move ${moveCount}!`);
        await sendRawTransaction({
            successText: `Played move ${moveCount}`,
            gas: BigInt(200_000),
            data: encodeFunctionData({
                abi: [
                    {
                        type: "function",
                        name: "play",
                        inputs: [
                            {
                                name: "sessionId",
                                type: "bytes32",
                                internalType: "bytes32",
                            },
                            {
                                name: "result",
                                type: "uint256",
                                internalType: "uint256",
                            },
                        ],
                        outputs: [],
                        stateMutability: "nonpayable",
                    },
                ],
                functionName: "play",
                args: [sessionId, move],
            }),
        });
    }

    return { initializeGameTransaction, playNewMoveTransaction };
}
