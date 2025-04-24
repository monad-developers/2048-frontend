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
    Hex,
    parseGwei,
} from "viem";
import { waitForTransactionReceipt } from "viem/actions";
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

    // Sends a transaction and wait for receipt.
    async function sendRawTransactionAndConfirm({
        successText,
        gas,
        data,
        nonce,
        maxFeePerGas = parseGwei("50"),
        maxPriorityFeePerGas = parseGwei("5"),
    }: {
        successText?: string;
        gas: BigInt;
        data: Hex;
        nonce: number;
        maxFeePerGas?: BigInt;
        maxPriorityFeePerGas?: BigInt;
    }) {
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
                console.log(`Failed sent in ${time} ms`);
                throw Error(response.error.message);
            }

            const transactionHash: Hex = response.result;

            // Fire toast info with benchmark and transaction hash.
            console.log(`Transaction sent in ${time} ms: ${response.result}`);
            toast.success(`Sent transaction.`, {
                description: `${successText} Time: ${time} ms`,
                action: (
                    <Button
                        className="outline outline-white"
                        onClick={() =>
                            window.open(
                                `https://testnet.monadexplorer.com/tx/${transactionHash}`,
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

            // Confirm transaction
            const receipt = await waitForTransactionReceipt(publicClient, {
                hash: transactionHash,
            });

            if (receipt.status == "reverted") {
                console.log(
                    `Failed confirmation in ${Date.now() - startTime} ms`
                );
                throw Error(
                    `Failed to confirm transaction: ${transactionHash}`
                );
            }

            console.log(
                `Transaction confirmed in ${Date.now() - startTime} ms: ${
                    response.result
                }`
            );
            toast.success(`Confirmed transaction.`, {
                description: `${successText} Time: ${
                    Date.now() - startTime
                } ms`,
                action: (
                    <Button
                        className="outline outline-white"
                        onClick={() =>
                            window.open(
                                `https://testnet.monadexplorer.com/tx/${transactionHash}`,
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

    // Returns a the latest stored baord of a game as an array.
    async function getLatestGameBoard(
        gameId: Hex
    ): Promise<
        readonly [
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number
        ]
    > {
        const latestBoard = await publicClient.readContract({
            address: GAME_CONTRACT_ADDRESS,
            abi: [
                {
                    type: "function",
                    name: "getBoard",
                    inputs: [
                        {
                            name: "gameId",
                            type: "bytes32",
                            internalType: "bytes32",
                        },
                    ],
                    outputs: [
                        {
                            name: "boardArr",
                            type: "uint8[16]",
                            internalType: "uint8[16]",
                        },
                    ],
                    stateMutability: "view",
                },
            ],
            functionName: "getBoard",
            args: [gameId],
        });

        return latestBoard;
    }

    // Initializes a game. Calls `prepareGame` and `startGame`.
    async function initializeGameTransaction(
        gameId: Hex,
        moves: bigint[]
    ): Promise<void> {
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

        // Prepare the start position + first 3 moves of the game, and the hash of these boards.
        const game = [moves[0], moves[1], moves[2], moves[3]] as readonly [
            bigint,
            bigint,
            bigint,
            bigint
        ];

        // Sign and send transaction: start game
        console.log("Starting game!");
        const nonce = userNonce.current;
        userNonce.current = nonce + 1;

        await sendRawTransactionAndConfirm({
            nonce: nonce,
            successText: "Started game!",
            gas: BigInt(500_000),
            data: encodeFunctionData({
                abi: [
                    {
                        type: "function",
                        name: "startGame",
                        inputs: [
                            {
                                name: "gameId",
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
                args: [gameId, game],
            }),
        });
    }

    async function playNewMoveTransaction(
        gameId: Hex,
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
        const nonce = userNonce.current;
        userNonce.current = nonce + 1;

        await sendRawTransactionAndConfirm({
            nonce,
            successText: `Played move ${moveCount}`,
            gas: BigInt(200_000),
            data: encodeFunctionData({
                abi: [
                    {
                        type: "function",
                        name: "play",
                        inputs: [
                            {
                                name: "gameId",
                                type: "bytes32",
                                internalType: "bytes32",
                            },
                            {
                                name: "resultBoard",
                                type: "uint256",
                                internalType: "uint256",
                            },
                        ],
                        outputs: [],
                        stateMutability: "nonpayable",
                    },
                ],
                functionName: "play",
                args: [gameId, move],
            }),
        });
    }

    return {
        initializeGameTransaction,
        playNewMoveTransaction,
        getLatestGameBoard,
    };
}
