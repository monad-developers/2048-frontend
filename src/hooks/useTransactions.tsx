import { Button } from "@/components/ui/button";
import { publicClient } from "@/utils/client";
import {
    ENTRYPOINT_V6_ADDRESS,
    GAME_CONTRACT_ADDRESS,
} from "@/utils/constants";
import { post } from "@/utils/fetch";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
    createWalletClient,
    custom,
    encodeAbiParameters,
    encodeFunctionData,
    Hex,
    hexToBigInt,
    isHex,
    keccak256,
    parseGwei,
    toHex,
} from "viem";
import {
    getUserOperation,
    getUserOperationReceipt,
} from "viem/account-abstraction";
import { waitForTransactionReceipt } from "viem/actions";
import { monadTestnet } from "viem/chains";

type AsHex<T> = {
    [K in keyof T]: `0x${string}`;
};

type BigNumberish =
    | string
    | number
    | bigint
    | Uint8Array<ArrayBufferLike>
    | undefined;

interface UserOperationStruct {
    /* the origin of the request */
    sender: string;
    /* nonce of the transaction, returned from the entry point for this address */
    nonce: BigNumberish;
    /* the initCode for creating the sender if it does not exist yet, otherwise "0x" */
    initCode: Hex | "0x";
    /* the callData passed to the target */
    callData: Hex;
    /* Value used by inner account execution */
    callGasLimit?: BigNumberish;
    /* Actual gas used by the validation of this UserOperation */
    verificationGasLimit?: BigNumberish;
    /* Gas overhead of this UserOperation */
    preVerificationGas?: BigNumberish;
    /* Maximum fee per gas (similar to EIP-1559 max_fee_per_gas) */
    maxFeePerGas?: BigNumberish;
    /* Maximum priority fee per gas (similar to EIP-1559 max_priority_fee_per_gas) */
    maxPriorityFeePerGas?: BigNumberish;
    /* Address of paymaster sponsoring the transaction, followed by extra data to send to the paymaster ("0x" for self-sponsored transaction) */
    paymasterAndData: Hex | "0x";
    /* Data passed into the account along with the nonce during the verification step */
    signature: Hex;
}

interface UserOperationRequest {
    /* the origin of the request */
    sender: Hex;
    /* nonce (as hex) of the transaction, returned from the entry point for this Address */
    nonce: Hex;
    /* the initCode for creating the sender if it does not exist yet, otherwise "0x" */
    initCode: Hex;
    /* the callData passed to the target */
    callData: Hex;
    /* Gas value (as hex) used by inner account execution */
    callGasLimit: Hex;
    /* Actual gas (as hex) used by the validation of this UserOperation */
    verificationGasLimit: Hex;
    /* Gas overhead (as hex) of this UserOperation */
    preVerificationGas: Hex;
    /* Maximum fee per gas (similar to EIP-1559 max_fee_per_gas) (as hex)*/
    maxFeePerGas: Hex;
    /* Maximum priority fee per gas (similar to EIP-1559 max_priority_fee_per_gas) (as hex)*/
    maxPriorityFeePerGas: Hex;
    /* Address of paymaster sponsoring the transaction, followed by extra data to send to the paymaster ("0x" for self-sponsored transaction) */
    paymasterAndData: Hex;
    /* Data passed into the account along with the nonce during the verification step */
    signature: Hex;
}

/**
 * Helper function to convert an arbitrary value from a UserOperation (e.g. `nonce`) to a
 * hexadecimal string.
 */
const formatAsHex = (
    value: undefined | string | Uint8Array | bigint | number
): `0x${string}` | undefined => {
    if (value === undefined) {
        return value;
    } else if (typeof value === "string") {
        if (!isHex(value))
            throw new Error("Cannot convert a non-hex string to a hex string");
        return value as `0x${string}`;
    } else {
        // Handles Uint8Array, bigint, and number
        return toHex(value);
    }
};

/**
 * Helper function to convert the fields of a user operation to hexadecimal strings.
 *
 * @param userOp {UserOperationStruct}
 * @returns {AsHex<UserOperationStruct>} userOp with all fields transformed to hexstrings
 */
const formatUserOpAsHex = (
    userOp: UserOperationStruct
): AsHex<UserOperationStruct> => {
    const {
        sender,
        nonce,
        initCode,
        callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData,
        signature,
    } = userOp;

    const formattedUserOp: AsHex<UserOperationStruct> = {
        sender: formatAsHex(sender)!,
        nonce: formatAsHex(nonce)!,
        initCode: formatAsHex(initCode)!,
        callData: formatAsHex(callData)!,
        callGasLimit: formatAsHex(callGasLimit),
        verificationGasLimit: formatAsHex(verificationGasLimit),
        preVerificationGas: formatAsHex(preVerificationGas),
        maxFeePerGas: formatAsHex(maxFeePerGas),
        maxPriorityFeePerGas: formatAsHex(maxPriorityFeePerGas),
        paymasterAndData: formatAsHex(paymasterAndData)!,
        signature: formatAsHex(signature)!,
    };

    return formattedUserOp;
};

const packUserOp = (userOp: AsHex<UserOperationStruct>): `0x${string}` => {
    // address -> `0x${string}`, uint256 -> bigint, bytes32 -> `0x${string}`
    const packedUserOp = encodeAbiParameters(
        [
            { name: "sender", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "initCode", type: "bytes32" },
            { name: "callData", type: "bytes32" },
            { name: "callGasLimit", type: "uint256" },
            { name: "verificationGasLimit", type: "uint256" },
            { name: "preVerificationGas", type: "uint256" },
            { name: "maxFeePerGas", type: "uint256" },
            { name: "maxPriorityFeePerGas", type: "uint256" },
            { name: "paymasterAndData", type: "bytes32" },
        ],
        [
            userOp.sender,
            BigInt(userOp.nonce),
            keccak256(userOp.initCode),
            keccak256(userOp.callData),
            BigInt(userOp.callGasLimit!),
            BigInt(userOp.verificationGasLimit!),
            BigInt(userOp.preVerificationGas!),
            BigInt(userOp.maxFeePerGas!),
            BigInt(userOp.maxPriorityFeePerGas!),
            keccak256(userOp.paymasterAndData),
        ]
    );

    return packedUserOp;
};

const computeUserOpHash = (
    userOp: AsHex<UserOperationStruct>
): `0x${string}` => {
    const packedUserOp = packUserOp(userOp);
    // address -> `0x${string}`, uint256 -> bigint, bytes32 -> `0x${string}`
    const encodedUserOp = encodeAbiParameters(
        [
            { name: "packed", type: "bytes32" },
            { name: "entryPoint", type: "address" },
            { name: "chainId", type: "uint256" },
        ],
        [
            keccak256(packedUserOp),
            ENTRYPOINT_V6_ADDRESS,
            BigInt(monadTestnet.id),
        ]
    );
    const userOpHash = keccak256(encodedUserOp);
    return userOpHash;
};

const signUserOp = async (
    address: Hex,
    userOp: UserOperationStruct,
    provider: any
): Promise<UserOperationRequest> => {
    // Format every field in the user op to be a hexstring, to make type conversions easier later
    const formattedUserOp = formatUserOpAsHex(userOp);

    // Compute hash and signature
    const userOpHash = computeUserOpHash(formattedUserOp);
    const signature = await provider.signMessage({
        account: address,
        message: { raw: userOpHash },
    });

    // @ts-ignore
    const signedUserOp: UserOperationRequest = {
        ...userOp,
        signature: signature,
    };

    return signedUserOp;
};

async function withRetries<T>(
    fn: (args: any) => Promise<T>,
    args: any,
    retries = 5,
    delayMs = 100
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log("Searching receipt for: ", args);
            return await fn(args);
        } catch (err) {
            lastError = err;
            if (attempt < retries && delayMs > 0) {
                await new Promise((res) => setTimeout(res, delayMs));
            }
        }
    }

    throw new Error(
        `Function failed after ${retries} retries. Last error: ${String(
            lastError
        )}`
    );
}

export function useTransactions() {
    // User and Wallet objects.
    const { user } = usePrivy();
    const { ready, wallets } = useWallets();

    const { client } = useSmartWallets();

    // Fetch user nonce on new login.
    const entrypointNonce = useRef(0);
    useEffect(() => {
        async function getNonce() {
            if (!user) {
                return;
            }

            const userSmartWallet = user.linkedAccounts.find(
                (account) => account.type === "smart_wallet"
            );

            if (!userSmartWallet) {
                return;
            }

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
            entrypointNonce.current = parseInt(nonce.toString());
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
        data,
        preVerificationGas,
        callGasLimit,
        verificationGasLimit,
        nonce,
    }: {
        successText?: string;
        gas?: BigInt;
        data: Hex;
        nonce?: number;
        maxFeePerGas?: BigInt;
        maxPriorityFeePerGas?: BigInt;
        preVerificationGas?: Hex;
        callGasLimit?: Hex;
        verificationGasLimit?: Hex;
    }) {
        let e: Error | null = null;

        try {
            // Sign and send transaction.
            const provider = walletClient.current;

            const startTime = Date.now();

            const userOp: UserOperationStruct = {
                callData: encodeFunctionData({
                    abi: [
                        {
                            type: "function",
                            name: "execute",
                            inputs: [
                                {
                                    name: "target",
                                    type: "address",
                                    internalType: "address",
                                },
                                {
                                    name: "value",
                                    type: "uint256",
                                    internalType: "uint256",
                                },
                                {
                                    name: "data",
                                    type: "bytes",
                                    internalType: "bytes",
                                },
                            ],
                            outputs: [],
                            stateMutability: "nonpayable",
                        },
                    ],
                    functionName: "execute",
                    args: [GAME_CONTRACT_ADDRESS, 0n, data],
                }),
                callGasLimit,
                initCode: "0x",
                maxFeePerGas: hexToBigInt("0x11ed8ec200"),
                maxPriorityFeePerGas: hexToBigInt("0x77359400"),
                nonce,
                preVerificationGas,
                paymasterAndData:
                    "0xEaf0Cde110a5d503f2dD69B3a49E031e29b3F9D2fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
                sender: "0x07FaC3FDf5928eE31355fD4946D754036ce969E0",
                signature:
                    "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
                verificationGasLimit,
            };

            const getPaymasterDataResponse = await post({
                url: "https://monad-testnet.g.alchemy.com/v2/fLdSfE7jJwKpro4BC6bTf3WBJuySgPVf",
                params: {
                    jsonrpc: "2.0",
                    id: 12,
                    method: "pm_getPaymasterData",
                    params: [
                        {
                            ...formatUserOpAsHex(userOp),
                        },
                        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
                        "0x279f",
                        {
                            policyId: "3a824277-3202-41cc-89d5-075c91af02dc",
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
            userOp.paymasterAndData =
                getPaymasterDataResponse.result.paymasterAndData;

            const userOpReq = await signUserOp(
                user?.wallet?.address as Hex,
                formatUserOpAsHex(userOp),
                provider
            );

            const result_eth_sendUserOperation = await post({
                url: "https://monad-testnet.g.alchemy.com/v2/fLdSfE7jJwKpro4BC6bTf3WBJuySgPVf",
                params: {
                    jsonrpc: "2.0",
                    id: 10,
                    method: "eth_sendUserOperation",
                    params: [
                        { ...userOpReq },
                        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
                    ],
                },
            });

            console.log("Userop hash: ", result_eth_sendUserOperation.result);

            let time = Date.now() - startTime;
            // Fire toast info with benchmark and transaction hash.
            console.log(`Transaction sent in ${time} ms`);
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

            const transactionHash = await withRetries(async (opHash: Hex) => {
                const result_eth_getUserOperationReceipt = await post({
                    url: "https://monad-testnet.g.alchemy.com/v2/fLdSfE7jJwKpro4BC6bTf3WBJuySgPVf",
                    params: {
                        jsonrpc: "2.0",
                        id: 15,
                        method: "eth_getUserOperationReceipt",
                        params: [opHash],
                    },
                });

                if (!result_eth_getUserOperationReceipt.result) {
                    throw Error(`Failed to get tx.`);
                }

                return result_eth_getUserOperationReceipt.result.receipt
                    .transactionHash;
            }, result_eth_sendUserOperation.result);

            console.log("USER OP transaction hash: ", transactionHash);

            // const transactionHash = await client?.sendTransaction({
            //     to: GAME_CONTRACT_ADDRESS,
            //     data,
            // });

            // // const response = await post({
            // //     url: monadTestnet.rpcUrls.default.http[0],
            // //     params: {
            // //         id: 0,
            // //         jsonrpc: "2.0",
            // //         method: "eth_sendRawTransaction",
            // //         params: [signedTransaction],
            // //     },
            // // });

            // if (response.error) {
            //     console.log(`Failed sent in ${time} ms`);
            //     throw Error(response.error.message);
            // }

            // const transactionHash: Hex = response.result;

            time = Date.now() - startTime;
            // Fire toast info with benchmark and transaction hash.
            console.log(`Transaction sent in ${time} ms: ${transactionHash}`);
            toast.success(`Confirmed transaction.`, {
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

            // // Confirm transaction
            // const receipt = await waitForTransactionReceipt(publicClient, {
            //     hash: transactionHash,
            // });

            // if (receipt.status == "reverted") {
            //     console.log(
            //         `Failed confirmation in ${Date.now() - startTime} ms`
            //     );
            //     throw Error(
            //         `Failed to confirm transaction: ${transactionHash}`
            //     );
            // }

            // console.log(
            //     `Transaction confirmed in ${Date.now() - startTime} ms: ${
            //         response.result
            //     }`
            // );
            // toast.success(`Confirmed transaction.`, {
            //     description: `${successText} Time: ${
            //         Date.now() - startTime
            //     } ms`,
            //     action: (
            //         <Button
            //             className="outline outline-white"
            //             onClick={() =>
            //                 window.open(
            //                     `https://testnet.monadexplorer.com/tx/${transactionHash}`,
            //                     "_blank",
            //                     "noopener,noreferrer"
            //                 )
            //             }
            //         >
            //             <div className="flex items-center gap-1 p-1">
            //                 <p>View</p>
            //                 <ExternalLink className="w-4 h-4" />
            //             </div>
            //         </Button>
            //     ),
            // });
        } catch (error) {
            e = error as Error;

            // const nonce = await publicClient.getTransactionCount({
            //     address: user?.wallet?.address as Hex,
            // });
            // userNonce.current = nonce;

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

    // Initializes a game. Calls `prepareGame` and `startGame`.
    // {
    //     "preVerificationGas": "0xba54", 50_000
    //     "callGasLimit": "0x66bb8", 450_000
    //     "verificationGasLimit": "0x13678" 85_000
    // }
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
        // const nonce = userNonce.current;
        // userNonce.current = nonce + 1;
        const nonce = entrypointNonce.current;
        entrypointNonce.current = nonce + 1;

        await sendRawTransactionAndConfirm({
            nonce,
            preVerificationGas: toHex(BigInt(50000)),
            callGasLimit: toHex(BigInt(450000)),
            verificationGasLimit: toHex(BigInt(85000)),
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
        // const nonce = userNonce.current;
        // userNonce.current = nonce + 1;

        await sendRawTransactionAndConfirm({
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
