import {
    Hex,
    toHex,
    keccak256,
    encodeFunctionData,
    encodeAbiParameters,
} from "viem";
import { UserOpConstants } from "./userOpConstants";

// Credit to: https://github.com/privy-io/base-paymaster-example/blob/faec4b02b4f8d8d0e0d1303777621f78073b021a/lib/user-operations.ts

export interface UserOperationRequest {
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

export const packUserOp = (userOp: UserOperationRequest): `0x${string}` => {
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

export const computeUserOpHash = (
    chainId: number,
    entryPointAddress: Hex,
    userOp: UserOperationRequest
): `0x${string}` => {
    const packedUserOp = packUserOp(userOp);
    // address -> `0x${string}`, uint256 -> bigint, bytes32 -> `0x${string}`
    const encodedUserOp = encodeAbiParameters(
        [
            { name: "packed", type: "bytes32" },
            { name: "entryPoint", type: "address" },
            { name: "chainId", type: "uint256" },
        ],
        [keccak256(packedUserOp), entryPointAddress, BigInt(chainId)]
    );
    const userOpHash = keccak256(encodedUserOp);
    return userOpHash;
};

export function buildUserOp({
    nonce,
    sender,
    callData,
    callTarget,
    callGasLimit,
    preVerificationGas,
    verificationGasLimit,
}: {
    nonce: number;
    sender: Hex;
    callData: Hex;
    callTarget: Hex;
    callGasLimit: bigint;
    preVerificationGas: bigint;
    verificationGasLimit: bigint;
}): UserOperationRequest {
    const userOp: UserOperationRequest = {
        nonce: toHex(nonce),
        sender,
        // `execute` function call on Alchemy's `LightAccount` smart account implementation.
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
            args: [callTarget, 0n, callData],
        }),
        callGasLimit: toHex(callGasLimit),
        preVerificationGas: toHex(preVerificationGas),
        verificationGasLimit: toHex(verificationGasLimit),
        // We assume that the associated smart account is already deployed.
        initCode: "0x",
        // Hardcoded gas values for Monad testnet.
        maxFeePerGas: UserOpConstants.monad.maxFeePerGas,
        maxPriorityFeePerGas: UserOpConstants.monad.maxPriorityFeePerGas,
        // Hardcoded paymaster value for Alchemy's Monad testnet paymaster.
        paymasterAndData: UserOpConstants.alchemy.paymasterAndData as Hex,
        // Hardcoded dummy signature data.
        signature: UserOpConstants.dummySignature as Hex,
    };

    return userOp;
}
