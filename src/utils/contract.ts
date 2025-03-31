import { getContract } from "thirdweb";

import { client } from "./client";
import { monadTestnet } from "./chain";
import { GAME_CONTRACT_ADDRESS } from "./constants";

export const gameContract = getContract({
    client,
    chain: monadTestnet,
    address: GAME_CONTRACT_ADDRESS,
    abi: [
        {
            "type": "function",
            "name": "latestBoard",
            "inputs": [
                {
                    "name": "sessionId",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "outputs": [
                {
                    "name": "board",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "play",
            "inputs": [
                {
                    "name": "sessionId",
                    "type": "bytes32",
                    "internalType": "bytes32"
                },
                {
                    "name": "move",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "result",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "sessionFor",
            "inputs": [
                {
                    "name": "sessionId",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "outputs": [
                {
                    "name": "player",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "startGame",
            "inputs": [],
            "outputs": [
                {
                    "name": "startBoard",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "event",
            "name": "NewGameStart",
            "inputs": [
                {
                    "name": "player",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "id",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                },
                {
                    "name": "board",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "NewMove",
            "inputs": [
                {
                    "name": "player",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "id",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                },
                {
                    "name": "move",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "result",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "GameNotStarted",
            "inputs": []
        },
        {
            "type": "error",
            "name": "GamePaused",
            "inputs": []
        },
        {
            "type": "error",
            "name": "SessionInvalid",
            "inputs": []
        },
    ]
});