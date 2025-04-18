// Hooks
import { useEffect, useState } from "react";
import { useAsyncInterval } from "./hooks/useAsyncInterval";

// UI
import Board from "./components/Board";
import Container from "./components/Container";
import Scorecard from "./components/Scorecard";
import LoginButton from "./components/LoginButton";
import NewGameButton from "./components/NewGameButton";

// Utils
import { post } from "./utils/fetch";
import { publicClient } from "./utils/client";
import { GAME_CONTRACT_ADDRESS } from "./utils/constants";

import { monadTestnet } from "viem/chains";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
    createWalletClient,
    custom,
    encodeFunctionData,
    encodePacked,
    Hex,
    keccak256,
    parseGwei,
    SendTransactionParameters,
    toHex,
    TransactionReceipt,
} from "viem";
import { waitForTransactionReceipt } from "viem/actions";

enum Direction {
    UP,
    DOWN,
    LEFT,
    RIGHT,
}
type Tile = {
    id: string;
    value: number;
    row: number;
    col: number;
    mergedFrom?: string[];
    isNew?: boolean;
};
type BoardState = {
    tiles: Tile[];
    score: number;
};

export default function Game2048() {
    const { user } = usePrivy();
    const { ready, wallets } = useWallets();

    const [gameOver, setGameOver] = useState<boolean>(false);
    const [gameError, setGameError] = useState<boolean>(false);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);

    const [offset, setOffset] = useState<number>(0);
    const [encodedMoves, setEncodedMoves] = useState<bigint[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>("");

    const [boardState, setBoardState] = useState<BoardState>({
        tiles: [],
        score: 0,
    });

    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = async (event: KeyboardEvent) => {
            // Must sign in.
            if (!user) return;

            if (gameOver || isAnimating) return;

            switch (event.key) {
                case "ArrowUp":
                    await move(Direction.UP);
                    break;
                case "ArrowDown":
                    await move(Direction.DOWN);
                    break;
                case "ArrowLeft":
                    await move(Direction.LEFT);
                    break;
                case "ArrowRight":
                    await move(Direction.RIGHT);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [boardState, gameOver, isAnimating]);

    // Starts a game.
    useAsyncInterval(async () => {
        if (gameOver || gameError) return;

        try {
            // If not logged in: exit
            if (!ready || !wallets) return;

            // If no privy wallet: exit
            const userWallet = wallets.find(
                (w) => w.walletClientType == "privy"
            );
            if (!userWallet) return;

            // If there is an active session ID: exit
            if (activeSessionId) return;

            // If less than start position + 3 moves made: exit
            const moves = encodedMoves;
            if (moves.length < 4) return;

            // Create random session ID
            const newSessionId: Hex = keccak256(
                toHex(Math.random().toString())
            );

            // Prepare the start position + first 3 moves of the game, and the hash of these boards.
            const game = [moves[0], moves[1], moves[2], moves[3]] as readonly [
                bigint,
                bigint,
                bigint,
                bigint
            ];
            const gameHash: Hex = keccak256(
                encodePacked(["uint256[4]"], [game])
            );

            // Get provider
            const ethereumProvider = await userWallet.getEthereumProvider();
            const provider = createWalletClient({
                chain: monadTestnet,
                transport: custom(ethereumProvider),
            });

            // Prepare transaction: prepareGame
            const prepareGameAbi = [
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
            ];
            const prepareGameTx: SendTransactionParameters = {
                chain: monadTestnet,
                account: userWallet.address as Hex,
                to: GAME_CONTRACT_ADDRESS,
                gas: BigInt(75_000),
                maxFeePerGas: parseGwei("55"),
                data: encodeFunctionData({
                    abi: prepareGameAbi,
                    functionName: "prepareGame",
                    args: [newSessionId, gameHash],
                }),
            };

            // Send transaction: prepareGame
            const prepareGameTxHash = await provider.sendTransaction(
                prepareGameTx
            );
            console.log("Prepared game at tx: ", prepareGameTxHash);

            await waitForTransactionReceipt(publicClient, {
                hash: prepareGameTxHash,
            });

            // Prepare transaction: startGame
            const startGameAbi = [
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
            ];
            const startGameTx = {
                ...prepareGameTx,
                gas: BigInt(500_000),
                data: encodeFunctionData({
                    abi: startGameAbi,
                    functionName: "startGame",
                    args: [newSessionId, game],
                }),
            };

            // Send transaction: prepareGame
            const startGameTxHash = await provider.sendTransaction(startGameTx);
            console.log("Started game at tx: ", startGameTxHash);

            await waitForTransactionReceipt(publicClient, {
                hash: startGameTxHash,
            });

            setOffset(4);
            setActiveSessionId(newSessionId);
        } catch (error) {
            alert("Error starting game. Please check console for full error.");
            console.log(error);
            setGameError(true);
        }
    }, 1000);

    useAsyncInterval(async () => {
        if (gameOver || gameError) return;

        try {
            // If not logged in: exit
            if (!ready || !wallets) return;

            // If no privy wallet: exit
            const userWallet = wallets.find(
                (w) => w.walletClientType == "privy"
            );
            if (!userWallet) return;

            // If there is no active session ID: exit
            if (!activeSessionId) return;

            // If no moves: exit
            const moves = encodedMoves;
            if (moves.length === 0) {
                return;
            }

            // Get provider
            const ethereumProvider = await userWallet.getEthereumProvider();
            const provider = createWalletClient({
                chain: monadTestnet,
                transport: custom(ethereumProvider),
            });

            // Process a batch of at most 25 txs at a time.
            const batchSize = 25;
            const start = offset;
            const end = start + batchSize;

            const batch = moves.slice(start, end);
            console.log("Remaining transactions to process: ", batch.length);
            console.log("Processing batch: ", batch);

            // If no new moves: exit.
            if (start == moves.length) {
                return;
            }

            // Update offset.
            if (end > moves.length) {
                setOffset(moves.length);
            } else {
                setOffset(end);
            }

            // Get game session ID
            const sessionId = activeSessionId;
            // Get user nonce. We order the batch of transactions sequentially by nonce.
            const nonce = await publicClient.getTransactionCount({
                address: userWallet.address as Hex,
            });
            console.log("User nonce: ", nonce);

            // Same gas estimate will be passed to all 25 transactions.
            const playAbi = [
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
            ];

            // Build and sign batch of transactions
            const startTime = Date.now();

            // Await first signature to warm up wallet server.
            const sig0 = await provider.signTransaction({
                account: userWallet.address as Hex,
                nonce: nonce,
                to: GAME_CONTRACT_ADDRESS,
                gas: BigInt(200_000),
                maxFeePerGas: parseGwei("52"),
                data: encodeFunctionData({
                    abi: playAbi,
                    functionName: "play",
                    args: [sessionId as Hex, batch[0]],
                }),
            });
            console.log("Signed tx 0: ", sig0);

            // Sign all txs
            const signedTxsPromises: Promise<Hex>[] = Array(batch.length)
                .fill("0x")
                .map(async (_, index) => {
                    if (index == 0) {
                        return sig0;
                    }
                    const sig = await provider.signTransaction({
                        account: userWallet.address as Hex,
                        nonce: nonce + index,
                        to: GAME_CONTRACT_ADDRESS,
                        gas: BigInt(200_000),
                        maxFeePerGas: parseGwei("52"),
                        data: encodeFunctionData({
                            abi: playAbi,
                            functionName: "play",
                            args: [activeSessionId as Hex, batch[index]],
                        }),
                    });
                    console.log(`Signed tx ${index}: `, sig);

                    return sig;
                });
            const signedTxs: Hex[] = await Promise.all(signedTxsPromises);
            console.log(`Signed txs in ${Date.now() - startTime} ms`);

            // Prepare RPC call params
            const params = signedTxs.map((tx, index) => {
                return {
                    jsonrpc: "2.0",
                    id: index,
                    method: "eth_sendRawTransaction",
                    params: [tx],
                };
            });

            const result = await post({
                url: monadTestnet.rpcUrls.default.http[0],
                params,
            });
            console.log(`Sent transactions in ${Date.now() - startTime} ms`);
            console.log("Sent transactions: ", result);

            if (result.length > 0) {
                const txHash = result[result.length - 1].result;

                // Timeout after 4 seconds
                const timeout = new Promise((_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    `Timeout: Transaction took too long: ${txHash}`
                                )
                            ),
                        4000
                    )
                );

                let receipt: TransactionReceipt;
                try {
                    receipt = (await Promise.race([
                        waitForTransactionReceipt(publicClient, {
                            hash: txHash,
                        }),
                        timeout,
                    ])) as TransactionReceipt;
                } catch (err) {
                    throw err; // Rethrow the timeout or other errors
                }

                if (receipt.status !== "success") {
                    throw new Error(`Transaction unsuccessful: ${txHash}`);
                } else {
                    console.log("Processed all move txs successfully");
                }
            }
        } catch (error) {
            alert("Error playing game. Please check console for full error.");
            console.log(error);
            setGameError(true);
        }
    }, 5000);

    // Initialize the game with two random tiles
    const initializeGame = () => {
        const newBoardState: BoardState = {
            tiles: [],
            score: 0,
        };

        // Add two random tiles
        addRandomTile(newBoardState);
        addRandomTile(newBoardState);

        setOffset(0);
        setActiveSessionId("");
        setEncodedMoves([tilesToBigInt(newBoardState.tiles, 0)]);

        setBoardState(newBoardState);
        setGameOver(false);
    };

    // Generate a unique ID for tiles
    const generateTileId = () => {
        return keccak256(toHex(Math.random().toString()));
    };

    // Add a random tile to the board (2 with 90% chance, 4 with 10% chance)
    const addRandomTile = (boardState: BoardState) => {
        const emptyCells = [];

        // Find all empty cells
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (
                    !boardState.tiles.some(
                        (tile) => tile.row === row && tile.col === col
                    )
                ) {
                    emptyCells.push({ row, col });
                }
            }
        }

        // If there are no empty cells, return
        if (emptyCells.length === 0) return;

        // Choose a random empty cell
        const randomCell =
            emptyCells[Math.floor(Math.random() * emptyCells.length)];

        // Create a new tile
        const newTile: Tile = {
            id: generateTileId(),
            value: Math.random() < 0.9 ? 2 : 4,
            row: randomCell.row,
            col: randomCell.col,
            isNew: true,
        };

        boardState.tiles.push(newTile);
    };

    // Convert the tiles array to a 2D grid for easier processing
    const getTilesGrid = (tiles: Tile[]): (Tile | null)[][] => {
        const grid: (Tile | null)[][] = Array(4)
            .fill(null)
            .map(() => Array(4).fill(null));

        tiles.forEach((tile) => {
            grid[tile.row][tile.col] = tile;
        });

        return grid;
    };

    // Check if the game is over
    const checkGameOver = (boardState: BoardState) => {
        // If there are empty cells, the game is not over
        if (boardState.tiles.length < 16) return false;

        const grid = getTilesGrid(boardState.tiles);

        // Check if there are any adjacent cells with the same value
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const tile = grid[row][col];
                if (tile) {
                    // Check right
                    if (
                        col < 3 &&
                        grid[row][col + 1] &&
                        grid[row][col + 1]!.value === tile.value
                    ) {
                        return false;
                    }
                    // Check down
                    if (
                        row < 3 &&
                        grid[row + 1][col] &&
                        grid[row + 1][col]!.value === tile.value
                    ) {
                        return false;
                    }
                }
            }
        }

        return true;
    };

    // Move tiles in the specified direction
    const move = async (direction: Direction) => {
        try {
            // Create a copy of the board state
            const newBoardState: BoardState = {
                tiles: JSON.parse(JSON.stringify(boardState.tiles)),
                score: boardState.score,
            };

            // Reset the merged and new flags
            newBoardState.tiles.forEach((tile) => {
                tile.mergedFrom = undefined;
                tile.isNew = false;
            });

            // Get the traversal order based on the direction
            const traversals = getTraversalDirections(direction);

            let moved = false;

            // Process the tiles in the correct order
            traversals.row.forEach((row) => {
                traversals.col.forEach((col) => {
                    const tile = newBoardState.tiles.find(
                        (t) => t.row === row && t.col === col
                    );

                    if (tile) {
                        const { newRow, newCol, merged } = findFarthestPosition(
                            newBoardState,
                            tile,
                            direction
                        );

                        if (merged) {
                            // Merge with the tile at the new position
                            const targetTile = newBoardState.tiles.find(
                                (t) => t.row === newRow && t.col === newCol
                            );

                            if (targetTile) {
                                // Create a new tile with the merged value
                                const mergedTile: Tile = {
                                    id: generateTileId(),
                                    value: tile.value * 2,
                                    row: newRow,
                                    col: newCol,
                                    mergedFrom: [tile.id, targetTile.id],
                                };

                                // Remove the original tiles
                                newBoardState.tiles =
                                    newBoardState.tiles.filter(
                                        (t) =>
                                            t.id !== tile.id &&
                                            t.id !== targetTile.id
                                    );

                                // Add the merged tile
                                newBoardState.tiles.push(mergedTile);

                                // Update the score
                                newBoardState.score += mergedTile.value;

                                moved = true;
                            }
                        } else if (tile.row !== newRow || tile.col !== newCol) {
                            // Move the tile to the new position
                            tile.row = newRow;
                            tile.col = newCol;

                            moved = true;
                        }
                    }
                });
            });

            // If the board changed, add a new random tile
            if (moved) {
                // Pause moves
                setIsAnimating(true);

                // First update the state with the moved tiles
                setBoardState(newBoardState);

                // Add a new tile after the animation
                setTimeout(() => {
                    try {
                        // Create a new copy to avoid mutation issues
                        const updatedBoardState = {
                            tiles: [...newBoardState.tiles],
                            score: newBoardState.score,
                        };

                        addRandomTile(updatedBoardState);
                        setBoardState(updatedBoardState);

                        // Check if the game is over
                        if (checkGameOver(updatedBoardState)) {
                            setGameOver(true);
                        }

                        // Add move
                        setEncodedMoves([
                            ...encodedMoves,
                            tilesToBigInt(updatedBoardState.tiles, direction),
                        ]);

                        // Resume moves
                        setIsAnimating(false);
                    } catch (error) {
                        console.error("Error updating board state:", error);
                        setIsAnimating(false);
                    }
                }, 150); // Wait for the movement animation to complete
            }
        } catch (error) {
            console.error("Error in move function:", error);
            setIsAnimating(false);
        }
    };

    function tilesToBigInt(tiles: Tile[], direction: Direction): bigint {
        // Create a 16-element array initialized to 0
        const boardArray: number[] = new Array(16).fill(0);

        // Map tile positions to the board array
        tiles.forEach((tile) => {
            const index = tile.row * 4 + tile.col; // Convert (row, col) to linear index
            boardArray[index] = Math.log2(tile.value);
        });

        let result = BigInt(direction) << BigInt(248); // Shift direction to the most significant 8 bits

        for (let i = 0; i < 16; i++) {
            result |= BigInt(boardArray[i]) << BigInt((15 - i) * 8); // Place board values in the least significant 128 bits
        }

        return result;
    }

    // Get the traversal order based on the direction
    const getTraversalDirections = (direction: Direction) => {
        const traversals = {
            row: [0, 1, 2, 3],
            col: [0, 1, 2, 3],
        };

        // Process tiles in the correct order based on the direction
        if (direction === Direction.RIGHT) traversals.col = [3, 2, 1, 0];
        if (direction === Direction.DOWN) traversals.row = [3, 2, 1, 0];

        return traversals;
    };

    // Find the farthest position a tile can move in the specified direction
    const findFarthestPosition = (
        boardState: BoardState,
        tile: Tile,
        direction: Direction
    ) => {
        let { row, col } = tile;
        let newRow = row;
        let newCol = col;
        let merged = false;

        // Calculate the vector for the direction
        const vector = getVector(direction);

        // Move as far as possible in the direction
        do {
            row = newRow;
            col = newCol;
            newRow = row + vector.row;
            newCol = col + vector.col;
        } while (
            isWithinBounds(newRow, newCol) &&
            !isCellOccupied(boardState, newRow, newCol)
        );

        // Check if we can merge with the tile at the new position
        if (
            isWithinBounds(newRow, newCol) &&
            canMergeWithTile(boardState, tile, newRow, newCol)
        ) {
            merged = true;
        } else {
            // If we can't merge, use the previous position
            newRow = row;
            newCol = col;
        }

        return { newRow, newCol, merged };
    };

    // Get the vector for the direction
    const getVector = (direction: Direction) => {
        const vectors = {
            [Direction.UP]: { row: -1, col: 0 },
            [Direction.RIGHT]: { row: 0, col: 1 },
            [Direction.DOWN]: { row: 1, col: 0 },
            [Direction.LEFT]: { row: 0, col: -1 },
        };

        return vectors[direction];
    };

    // Check if the position is within the bounds of the board
    const isWithinBounds = (row: number, col: number) => {
        return row >= 0 && row < 4 && col >= 0 && col < 4;
    };

    // Check if the cell is occupied
    const isCellOccupied = (
        boardState: BoardState,
        row: number,
        col: number
    ) => {
        return boardState.tiles.some(
            (tile) => tile.row === row && tile.col === col
        );
    };

    // Check if the tile can merge with the tile at the specified position
    const canMergeWithTile = (
        boardState: BoardState,
        tile: Tile,
        row: number,
        col: number
    ) => {
        const targetTile = boardState.tiles.find(
            (t) => t.row === row && t.col === col
        );
        return (
            targetTile &&
            targetTile.value === tile.value &&
            !targetTile.mergedFrom
        );
    };

    return (
        <Container>
            <div className="flex items-center justify-between w-full max-w-md mb-4">
                <Scorecard score={boardState.score} />
                {!user ? (
                    <LoginButton initFn={initializeGame} />
                ) : (
                    <NewGameButton resetGame={initializeGame} />
                )}
            </div>

            <Board
                tiles={boardState.tiles}
                score={boardState.score}
                gameOver={gameOver}
                gameError={gameError}
                initializeGame={initializeGame}
            />
        </Container>
    );
}
