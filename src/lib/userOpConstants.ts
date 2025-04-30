import { parseGwei, toHex } from "viem";

export const UserOpConstants = {
    monad: {
        maxFeePerGas: toHex(parseGwei("77")),
        maxPriorityFeePerGas: toHex(parseGwei("2")),
    },
    alchemy: {
        paymasterAndData:
            "0xEaf0Cde110a5d503f2dD69B3a49E031e29b3F9D2fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
    },
    gas: {
        startGame: {
            callGasLimit: BigInt(450000),
            preVerificationGas: BigInt(50000),
            verificationGasLimit: BigInt(85000),
        },
        playMove: {
            callGasLimit: BigInt(200000),
            preVerificationGas: BigInt(50000),
            verificationGasLimit: BigInt(85000),
        },
    },
    dummySignature:
        "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
};
