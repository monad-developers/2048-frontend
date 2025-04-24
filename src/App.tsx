// Hooks
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useTransactions } from "./hooks/useTransactions";

// UI
import Board from "./components/Board";
import Container from "./components/Container";
import Scorecard from "./components/Scorecard";
import LoginButton from "./components/LoginButton";
import NewGameButton from "./components/NewGameButton";

// Utils
import { Hex, keccak256, toHex } from "viem";

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

    const [activeGameId, setActiveGameId] = useState<Hex>("0x");
    const [encodedMoves, setEncodedMoves] = useState<bigint[]>([]);
    const [playedMovesCount, setPlayedMovesCount] = useState<number>(0);

    const [boardState, setBoardState] = useState<BoardState>({
        tiles: [],
        score: 0,
    });

    // =============================================================//
    //                   Detect and execute moves                   //
    // =============================================================//

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

    // Move tiles in the specified direction
    const move = async (direction: Direction) => {
        const premoveBoard = boardState;

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

                // Create a new copy to avoid mutation issues
                const updatedBoardState = {
                    tiles: [...newBoardState.tiles],
                    score: newBoardState.score,
                };
                addRandomTile(updatedBoardState);

                // Add move
                const encodedBoard = tilesToBigInt(
                    updatedBoardState.tiles,
                    direction
                );
                const newEncodedMoves = [...encodedMoves, encodedBoard];
                const moveCount = playedMovesCount;

                if (moveCount == 3) {
                    initializeGameTransaction(
                        activeGameId,
                        newEncodedMoves
                    ).catch((error) => {
                        console.error("Error in move function:", error);
                        setBoardState(premoveBoard);
                        setGameError(true);
                        setGameErrorText((error as Error).message);
                        setIsAnimating(false);
                    });
                }

                if (moveCount > 3) {
                    playNewMoveTransaction(
                        activeGameId as Hex,
                        encodedBoard,
                        moveCount
                    ).catch((error) => {
                        console.error("Error in move function:", error);
                        setBoardState(premoveBoard);
                        setGameError(true);
                        setGameErrorText((error as Error).message);
                        setIsAnimating(false);
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
                setIsAnimating(false);
            }
        } catch (error) {
            console.error("Error in move function:", error);
            setBoardState(premoveBoard);
            setGameError(true);
            setGameErrorText((error as Error).message);
            setIsAnimating(false);
        }
    };

    // =============================================================//
    //                      Initialize new game                     //
    // =============================================================//

    // Initialize the game with two random tiles
    const initializeGame = () => {
        const newBoardState: BoardState = {
            tiles: [],
            score: 0,
        };

        // Add two random tiles
        addRandomTile(newBoardState);
        addRandomTile(newBoardState);

        setPlayedMovesCount(1);
        setActiveGameId(keccak256(toHex(Math.random().toString())));
        setEncodedMoves([tilesToBigInt(newBoardState.tiles, 0)]);

        setBoardState(newBoardState);
        setGameOver(false);
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

        const latestBoard = await getLatestGameBoard(activeGameId);

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

        if (!nonzero) {
            initializeGame();
        } else {
            setBoardState(newBoardState);
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
                gameErrorText={gameErrorText}
                resyncGame={resyncGame}
                initializeGame={initializeGame}
            />
        </Container>
    );
}
