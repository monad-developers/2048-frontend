import { Button } from "@/components/ui/button";
import { UserOpConstants } from "@/lib/userOpConstants";
import {
    buildUserOp,
    computeUserOpHash,
    UserOperationRequest,
} from "@/lib/userOps";
import { publicClient } from "@/utils/client";
import {
    ENTRYPOINT_V6_ADDRESS,
    GAME_CONTRACT_ADDRESS,
} from "@/utils/constants";
import { post } from "@/utils/fetch";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    createWalletClient,
    custom,
    encodeFunctionData,
    Hex,
    toHex,
    zeroAddress,
} from "viem";
import { monadTestnet } from "viem/chains";

async function withRetriesAndArgs<T>(
    fn: (args: any) => Promise<T>,
    args: any,
    name: string,
    retries = 10,
    delayMs = 100
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn(args);
        } catch (err) {
            lastError = err;
            if (attempt < retries && delayMs > 0) {
                await new Promise((res) => setTimeout(res, delayMs));
            }
        }
    }

    throw new Error(
        `Function ${name} failed after ${retries} retries. Last error: ${String(
            lastError
        )}`
    );
}

export function useTransactions() {
    // User and Wallet objects.
    const { user } = usePrivy();
    const { client } = useSmartWallets();
    const { ready, wallets } = useWallets();

    // Fetch and store smart wallet contract address, signer address and nonce on new login.
    const smartWalletNonce = useRef(0);
    const smartWalletAddress = useRef("");
    const smartWalletSignerAddress = useRef("");

    const [disableTxs, setDisableTxs] = useState(false);

    useEffect(() => {
        async function setupSmartWallet() {
            if (!user || !user.wallet) {
                return;
            }

            const userSmartWallet = user.linkedAccounts.find(
                (account) => account.type === "smart_wallet"
            );

            if (!userSmartWallet) {
                return;
            }

            if (!client) {
                return;
            }

            console.log("YO");

            setDisableTxs(true);

            try {
                const nonce = await publicClient.readContract({
                    address: ENTRYPOINT_V6_ADDRESS,
                    abi: [
                        {
                            type: "function",
                            name: "getNonce",
                            inputs: [
                                {
                                    name: "sender",
                                    type: "address",
                                    internalType: "address",
                                },
                                {
                                    name: "key",
                                    type: "uint192",
                                    internalType: "uint192",
                                },
                            ],
                            outputs: [
                                {
                                    name: "nonce",
                                    type: "uint256",
                                    internalType: "uint256",
                                },
                            ],
                            stateMutability: "view",
                        },
                    ],
                    functionName: "getNonce",
                    args: [userSmartWallet.address as Hex, 0n],
                });

                console.log("Setting nonce: ", nonce.toString());
                console.log("For smart wallet: ", userSmartWallet.address);
                console.log(
                    "Smart wallet type: ",
                    userSmartWallet.smartWalletType
                );

                smartWalletNonce.current = parseInt(nonce.toString());
                smartWalletAddress.current = userSmartWallet.address;
                smartWalletSignerAddress.current = user.wallet.address;

                const code = await publicClient.getCode({
                    address: userSmartWallet.address as Hex,
                });
                if (!code || code === "0x") {
                    smartWalletNonce.current += parseInt(nonce.toString()) + 1;

                    try {
                        console.log("Creating smart wallet...");
                        console.log(client);
                        const txHash = await client?.sendTransaction({
                            to: zeroAddress,
                        });
                        console.log("Created wallet at tx: ", txHash);
                    } catch (err) {
                        smartWalletNonce.current -= 1;
                    }
                }
            } catch (err) {
                console.log("Failed to setup game: ", err);
                toast.error(`Failed to setup game.`, {
                    description: `Error: ${(err as Error).message}`,
                });
            }

            setDisableTxs(false);
        }

        setupSmartWallet();
    }, [user, client]);

    // Fetch and store provider on new login.
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
        nonce,
        callData,
        callGasLimit,
        preVerificationGas,
        verificationGasLimit,
    }: {
        successText?: string;
        nonce: number;
        callData: Hex;
        callGasLimit: bigint;
        preVerificationGas: bigint;
        verificationGasLimit: bigint;
    }) {
        let e: Error | null = null;

        try {
            // Get provider.
            const provider = walletClient.current;

            // Sign and send transaction (userOp).
            const startTime = Date.now();

            // Construct userOp.
            const userOp: UserOperationRequest = buildUserOp({
                nonce,
                callData,
                callGasLimit,
                preVerificationGas,
                verificationGasLimit,
                callTarget: GAME_CONTRACT_ADDRESS as Hex,
                sender: smartWalletAddress.current as Hex,
            });

            // Get paymaster data (cannot hardcode; unique per op).
            const getPaymasterDataResponse = await post({
                url: import.meta.env.VITE_ALCHEMY_AA_RPC as string,
                params: {
                    jsonrpc: "2.0",
                    id: nonce,
                    method: "pm_getPaymasterData",
                    params: [
                        { ...userOp },
                        ENTRYPOINT_V6_ADDRESS,
                        toHex(monadTestnet.id),
                        {
                            policyId: import.meta.env.VITE_ALCHEMY_AA_POLICY_ID,
                        },
                    ],
                },
            });
            if (getPaymasterDataResponse.error) {
                console.log(
                    "Paymaster data response: ",
                    getPaymasterDataResponse
                );
                throw Error(`Failed to get paymaster data.`);
            }

            // Use paymaster data.
            userOp.paymasterAndData =
                getPaymasterDataResponse.result.paymasterAndData;

            // Get userOp hash to sign.
            const userOpHash = computeUserOpHash(
                monadTestnet.id,
                ENTRYPOINT_V6_ADDRESS,
                userOp
            );

            // Sign userOp hash.
            const signature = await provider.signMessage({
                account: smartWalletSignerAddress.current,
                message: { raw: userOpHash },
            });
            userOp.signature = signature;

            // Send user operation.
            const sendUserOperationResponse = await post({
                url: import.meta.env.VITE_ALCHEMY_AA_RPC as string,
                params: {
                    jsonrpc: "2.0",
                    id: nonce,
                    method: "eth_sendUserOperation",
                    params: [
                        { ...userOp },
                        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
                    ],
                },
            });
            if (sendUserOperationResponse.error) {
                console.log(
                    "Error sending user op: ",
                    sendUserOperationResponse
                );
                throw Error(`Failed to send userOp.`);
            }

            // Get sent userOp hash.
            const time_userOpSent = Date.now() - startTime;

            const userOpSentHash = sendUserOperationResponse.result;
            console.log(
                `Sent transaction in ${time_userOpSent} ms: `,
                userOpSentHash
            );

            // Fire toast success with benchmark.
            console.log(`Transaction sent in ${time_userOpSent} ms`);
            toast.success(`Sent user op.`, {
                description: `${successText} Time: ${time_userOpSent} ms`,
            });

            // Wait for transaction confirmation
            const transactionHash = await withRetriesAndArgs(
                async (opHash: Hex) => {
                    const getUserOperationReceiptResponse = await post({
                        url: import.meta.env.VITE_ALCHEMY_AA_RPC as string,
                        params: {
                            jsonrpc: "2.0",
                            id: 15,
                            method: "eth_getUserOperationReceipt",
                            params: [opHash],
                        },
                    });

                    if (!getUserOperationReceiptResponse.result) {
                        throw Error(`Failed to get tx.`);
                    }

                    return getUserOperationReceiptResponse.result.receipt
                        .transactionHash;
                },
                userOpHash,
                "getUserOpTransactionHash"
            );
            const time_userOpConfirmed = Date.now() - startTime;
            console.log(
                `Confirmed transaction in ${time_userOpConfirmed} ms: `,
                userOpSentHash
            );

            // Fire toast success with benchmark and transaction hash.
            console.log(
                `Transaction sent in ${time_userOpConfirmed} ms: ${transactionHash}`
            );
            toast.success(`Confirmed transaction.`, {
                description: `${successText} Time: ${time_userOpConfirmed} ms`,
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

            toast.error(`Failed to send transaction.`, {
                description: `Error: ${e.message}`,
            });
        }

        if (e) {
            throw e;
        }
    }

    // Resets nonce.
    async function resetNonce() {
        console.log("Resetting nonce...");
        const nonce = await publicClient.readContract({
            address: ENTRYPOINT_V6_ADDRESS,
            abi: [
                {
                    type: "function",
                    name: "getNonce",
                    inputs: [
                        {
                            name: "sender",
                            type: "address",
                            internalType: "address",
                        },
                        {
                            name: "key",
                            type: "uint192",
                            internalType: "uint192",
                        },
                    ],
                    outputs: [
                        {
                            name: "nonce",
                            type: "uint256",
                            internalType: "uint256",
                        },
                    ],
                    stateMutability: "view",
                },
            ],
            functionName: "getNonce",
            args: [smartWalletAddress.current as Hex, 0n],
        });
        smartWalletNonce.current = parseInt(nonce.toString());
        console.log("Reset nonce to: ", nonce.toString());
    }

    // Returns a the latest stored baord of a game as an array.
    async function getLatestGameBoard(
        gameId: Hex
    ): Promise<
        readonly [
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
            ],
            bigint
        ]
    > {
        const [latestBoard, nextMoveNumber] = await publicClient.readContract({
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
                        {
                            name: "nextMoveNumber",
                            type: "uint256",
                            internalType: "uint256",
                        },
                    ],
                    stateMutability: "view",
                },
            ],
            functionName: "getBoard",
            args: [gameId],
        });

        return [latestBoard, nextMoveNumber];
    }

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

        const nonce = smartWalletNonce.current;
        smartWalletNonce.current = nonce + 1;

        await sendRawTransactionAndConfirm({
            successText: "Started game!",
            nonce,
            callGasLimit: UserOpConstants.gas.startGame.callGasLimit,
            preVerificationGas:
                UserOpConstants.gas.startGame.preVerificationGas,
            verificationGasLimit:
                UserOpConstants.gas.startGame.verificationGasLimit,
            callData: encodeFunctionData({
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

        const nonce = smartWalletNonce.current;
        smartWalletNonce.current = nonce + 1;

        await sendRawTransactionAndConfirm({
            successText: `Played move ${moveCount}`,
            nonce,
            callGasLimit: UserOpConstants.gas.playMove.callGasLimit,
            preVerificationGas: UserOpConstants.gas.playMove.preVerificationGas,
            verificationGasLimit:
                UserOpConstants.gas.playMove.verificationGasLimit,
            callData: encodeFunctionData({
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
        disableTxs,
        resetNonce,
        initializeGameTransaction,
        playNewMoveTransaction,
        getLatestGameBoard,
    };
}
