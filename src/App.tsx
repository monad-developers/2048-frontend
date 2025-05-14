// Hooks
import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useTransactions } from "./hooks/useTransactions";

// UI
import Board from "./components/Board";
import Container from "./components/Container";
import Scorecard from "./components/Scorecard";
import LoginButton from "./components/LoginButton";
import { Toaster } from "@/components/ui/sonner";

// Utils
import {
    encodePacked,
    Hex,
    hexToBigInt,
    isAddress,
    keccak256,
    toBytes,
    toHex,
} from "viem";
import { FaucetDialog } from "./components/FaucetDialog";

// Types
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
type EncodedMove = {
    board: bigint; // 128 bits
    move: number; // 8 bits
};
type BoardState = {
    tiles: Tile[];
    score: number;
};

export default function Game2048() {
    // =============================================================//
    //                      Custom Hook Values                      //
    // =============================================================//

    const { user } = usePrivy();

    const {
        resetNonceAndBalance,
        getLatestGameBoard,
        playNewMoveTransaction,
        initializeGameTransaction,
    } = useTransactions();

    // =============================================================//
    //                         Game State                           //
    // =============================================================//

    const [gameOver, setGameOver] = useState<boolean>(false);
    const [gameError, setGameError] = useState<boolean>(false);
    const [gameErrorText, setGameErrorText] = useState<string>("");
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const [faucetModalOpen, setFaucetModalOpen] = useState<boolean>(false);

    const [activeGameId, setActiveGameId] = useState<Hex>("0x");
    const [encodedMoves, setEncodedMoves] = useState<EncodedMove[]>([]);
    const [playedMovesCount, setPlayedMovesCount] = useState<number>(0);

    const [boardState, setBoardState] = useState<BoardState>({
        tiles: [],
        score: 0,
    });
    const [resetBoards, setResetBoards] = useState<BoardState[]>([]);

    // =============================================================//
    //                   Detect and execute moves                   //
    // =============================================================//

    // Reset board on error.
    useEffect(() => {
        const boards = resetBoards;

        if (boards.length > 0) {
            const scores = boards.map((b) => b.score);
            const idx = scores.indexOf(Math.min(...scores));

            setBoardState(boards[idx]);
        }
    }, [resetBoards]);

    function resetBoardOnError(
        premoveBoard: BoardState,
        currentMove: number,
        error: Error
    ) {
        if (!gameError) {
            setGameError(true);
            setGameErrorText(error.message);

            setResetBoards((current) => [...current, premoveBoard]);
            setPlayedMovesCount(currentMove);

            setIsAnimating(false);
        }

        if (error.message.includes("insufficient balance")) {
            setFaucetModalOpen(true);
        }
    }

    // Handle keyboard / swipe events
    const gameContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = gameContainerRef.current;
        if (!container) return;

        const handleKeyDown = async (event: KeyboardEvent) => {
            if (!user || gameOver || isAnimating) return;

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

        let touchStartX = 0;
        let touchStartY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault(); // 👈 this is key to prevent scroll
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        };

        const handleTouchEnd = async (e: TouchEvent) => {
            e.preventDefault(); // 👈 also here
            if (!user || gameOver || isAnimating) return;

            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;

            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 50) await move(Direction.RIGHT);
                else if (dx < -50) await move(Direction.LEFT);
            } else {
                if (dy > 50) await move(Direction.DOWN);
                else if (dy < -50) await move(Direction.UP);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        container.addEventListener("touchstart", handleTouchStart, {
            passive: false,
        }); // 👈 passive: false is REQUIRED
        container.addEventListener("touchend", handleTouchEnd, {
            passive: false,
        });

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchend", handleTouchEnd);
        };
    }, [boardState, gameOver, isAnimating]);

    // Move tiles in the specified direction
    const move = async (direction: Direction) => {
        const premoveBoard = boardState;
        const currentMove = playedMovesCount;

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

                // Create a new copy to avoid mutation issues
                const updatedBoardState = {
                    tiles: [...newBoardState.tiles],
                    score: newBoardState.score,
                };
                addRandomTileViaSeed(
                    updatedBoardState,
                    activeGameId,
                    currentMove
                );

                // Add move
                const encoded = tilesToEncodedMove(
                    updatedBoardState.tiles,
                    direction
                );
                const newEncodedMoves = [...encodedMoves, encoded];
                const moveCount = playedMovesCount;

                if (moveCount == 3) {
                    const boards = [
                        newEncodedMoves[0].board,
                        newEncodedMoves[1].board,
                        newEncodedMoves[2].board,
                        newEncodedMoves[3].board,
                    ] as readonly [bigint, bigint, bigint, bigint];

                    const moves = [
                        newEncodedMoves[1].move,
                        newEncodedMoves[2].move,
                        newEncodedMoves[3].move,
                    ] as readonly [number, number, number];

                    initializeGameTransaction(
                        activeGameId,
                        boards,
                        moves
                    ).catch((error) => {
                        console.error("Error in init transaction:", error);
                        resetBoardOnError(premoveBoard, currentMove, error);
                    });
                }

                if (moveCount > 3) {
                    playNewMoveTransaction(
                        activeGameId as Hex,
                        encoded.board,
                        encoded.move,
                        moveCount
                    ).catch((error) => {
                        console.error("Error in move transaction:", error);
                        resetBoardOnError(premoveBoard, currentMove, error);
                    });
                }

                setBoardState(updatedBoardState);
                setEncodedMoves(newEncodedMoves);
                setPlayedMovesCount(moveCount + 1);

                // Check if the game is over
                if (checkGameOver(updatedBoardState)) {
                    setGameOver(true);
                }

                // Resume moves
                await new Promise((resolve) => setTimeout(resolve, 150));
                setIsAnimating(false);
            }
        } catch (error) {
            console.error("Error in move operation:", error);
            resetBoardOnError(premoveBoard, currentMove, error as Error);
        }
    };

    // =============================================================//
    //                      Initialize new game                     //
    // =============================================================//

    // Initialize the game with two random tiles
    const initializeGame = () => {
        setResetBoards([]);

        const newBoardState: BoardState = {
            tiles: [],
            score: 0,
        };

        // Add two random tiles
        addRandomTile(newBoardState);
        addRandomTile(newBoardState);

        setPlayedMovesCount(1);
        setActiveGameId(randomIDForAddress(user?.wallet?.address!));
        setEncodedMoves([tilesToEncodedMove(newBoardState.tiles, 0)]);

        setBoardState(newBoardState);
        setGameError(false);
        setGameOver(false);
    };

    function randomIDForAddress(address: string): Hex {
        if (!isAddress(address)) {
            throw new Error("Invalid Ethereum address");
        }

        const addressBytes = toBytes(address); // 20 bytes (160 bits)
        const randomBytes = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes (96 bits)
        const fullBytes = new Uint8Array(32); // 32 bytes total

        fullBytes.set(addressBytes, 0); // Set address at start
        fullBytes.set(randomBytes, 20); // Set random bits after

        return toHex(fullBytes);
    }

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

    // =============================================================//
    //                      Re-sync ongoing game                    //
    // =============================================================//

    // Resumes a game where it was left off
    const resyncGame = async () => {
        const newBoardState: BoardState = {
            tiles: [],
            score: boardState.score,
        };

        const [latestBoard, nextMoveNumber] = await getLatestGameBoard(
            activeGameId
        );

        let nonzero = false;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const value = latestBoard[4 * i + j];
                if (value > 0) {
                    nonzero = true;

                    const newTile: Tile = {
                        id: generateTileId(),
                        value: 2 ** value,
                        row: i,
                        col: j,
                        isNew: true,
                    };

                    newBoardState.tiles.push(newTile);
                }
            }
        }

        setResetBoards([]);
        await resetNonceAndBalance();
        if (!nonzero) {
            initializeGame();
        } else {
            setBoardState(newBoardState);
            setPlayedMovesCount(parseInt(nextMoveNumber.toString()));
            setGameErrorText("");
            setGameError(false);
        }
    };

    // =============================================================//
    //                      Board logic helpers                     //
    // =============================================================//

    // Generate a unique ID for tiles
    const generateTileId = () => {
        return keccak256(toHex(Math.random().toString()));
    };

    // Add a random tile to the board (2 with 90% chance, 4 with 10% chance)
    const addRandomTileViaSeed = (
        boardState: BoardState,
        gameId: Hex,
        moveNumber: number
    ) => {
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
        const seed = hexToBigInt(
            keccak256(
                encodePacked(
                    ["bytes32", "uint256"],
                    [gameId, BigInt(moveNumber)]
                )
            )
        );
        const index = parseInt((seed % BigInt(emptyCells.length)).toString());
        const randomCell = emptyCells[index];

        // Choose random value.
        const value = parseInt((seed % BigInt(100)).toString()) > 90 ? 4 : 2;

        // Create a new tile
        const newTile: Tile = {
            id: generateTileId(),
            value,
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

    function tilesToEncodedMove(
        tiles: Tile[],
        direction: Direction
    ): EncodedMove {
        const boardArray: number[] = new Array(16).fill(0);

        tiles.forEach((tile) => {
            const index = tile.row * 4 + tile.col;
            boardArray[index] = Math.log2(tile.value);
        });

        let board = BigInt(0);
        for (let i = 0; i < 16; i++) {
            board |= BigInt(boardArray[i]) << BigInt((15 - i) * 8);
        }

        const move = direction;

        return { board, move };
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

    // Display

    const [isLaptopOrLess, setIsLaptopOrLess] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 1024px)");
        const handleResize = () => setIsLaptopOrLess(mediaQuery.matches);

        // Set initial value
        handleResize();

        // Listen for changes
        mediaQuery.addEventListener("change", handleResize);
        return () => mediaQuery.removeEventListener("change", handleResize);
    }, []);

    return (
        <Container>
            <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between w-full max-w-md mx-auto mb-2 p-4">
                    <Scorecard score={boardState.score} />
                    <LoginButton resetGame={initializeGame} />
                </div>

                <div className="flex-1 overflow-auto px-2">
                    <Board
                        containerRef={gameContainerRef}
                        tiles={boardState.tiles}
                        score={boardState.score}
                        gameOver={gameOver}
                        gameError={gameError}
                        gameErrorText={gameErrorText}
                        resyncGame={resyncGame}
                        initializeGame={initializeGame}
                    />
                </div>

                <FaucetDialog
                    resyncGame={resyncGame}
                    isOpen={faucetModalOpen}
                    setIsOpen={setFaucetModalOpen}
                />
            </div>

            <Toaster
                visibleToasts={isLaptopOrLess ? 1 : 3}
                position={isLaptopOrLess ? "top-center" : "bottom-right"}
                richColors
                expand={true}
            />
        </Container>
    );
}
