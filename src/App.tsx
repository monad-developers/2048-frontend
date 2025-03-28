"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FunPurpleButton } from "./components/FunPurpleButton"
import { LogOutIcon } from "lucide-react"

import { createThirdwebClient } from "thirdweb";
import { useActiveAccount, useConnect } from "thirdweb/react";
import { inAppWallet, hasStoredPasskey } from "thirdweb/wallets/in-app";

type Direction = "up" | "down" | "left" | "right"
type Tile = {
  id: string
  value: number
  row: number
  col: number
  mergedFrom?: string[]
  isNew?: boolean
}
type BoardState = {
  tiles: Tile[]
  score: number
}

export default function Game2048() {

  // =============================================================//
  //                            WEB3 LOGIC                        //
  // =============================================================//

  const client = createThirdwebClient({ clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID });

  const { connect } = useConnect()
  const account = useActiveAccount();
  
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    setLoginLoading(true);

    try {
      await connect(async () => {
        const wallet = inAppWallet({
          auth: {
            options: ["passkey"],
          },
        });
        const hasPasskey = await hasStoredPasskey(client);
        await wallet.connect({
          client,
          strategy: "passkey",
          type: hasPasskey ? "sign-in" : "sign-up",
        });
        return wallet;
      });

      initializeGame();
      setLoginLoading(false);
      
    } catch(err) {
      console.log("Problem logging in: ", err);
      setLoginLoading(false);
    }
  };

  // =============================================================//
  //                       UI GAME LOGIC                          //
  // =============================================================//

  const [boardState, setBoardState] = useState<BoardState>({
    tiles: [],
    score: 0,
  })
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  // Initialize the game
  useEffect(() => {
    initializeGame()
  }, [])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Must sign in.
      if(!account) return;

      if (gameOver || isAnimating) return

      switch (event.key) {
        case "ArrowUp":
          move("up")
          break
        case "ArrowDown":
          move("down")
          break
        case "ArrowLeft":
          move("left")
          break
        case "ArrowRight":
          move("right")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [boardState, gameOver, isAnimating])

  // Initialize the game with two random tiles
  const initializeGame = () => {
    const newBoardState: BoardState = {
      tiles: [],
      score: 0,
    }

    // Add two random tiles
    addRandomTile(newBoardState)
    addRandomTile(newBoardState)

    setBoardState(newBoardState)
    setGameOver(false)
  }

  // Generate a unique ID for tiles
  const generateTileId = () => {
    return Math.random().toString(36).substring(2, 10)
  }

  // Add a random tile to the board (2 with 90% chance, 4 with 10% chance)
  const addRandomTile = (boardState: BoardState) => {
    const emptyCells = []

    // Find all empty cells
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (!boardState.tiles.some((tile) => tile.row === row && tile.col === col)) {
          emptyCells.push({ row, col })
        }
      }
    }

    // If there are no empty cells, return
    if (emptyCells.length === 0) return

    // Choose a random empty cell
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]

    // Create a new tile
    const newTile: Tile = {
      id: generateTileId(),
      value: Math.random() < 0.9 ? 2 : 4,
      row: randomCell.row,
      col: randomCell.col,
      isNew: true,
    }

    boardState.tiles.push(newTile)
  }

  // Convert the tiles array to a 2D grid for easier processing
  const getTilesGrid = (tiles: Tile[]): (Tile | null)[][] => {
    const grid: (Tile | null)[][] = Array(4)
      .fill(null)
      .map(() => Array(4).fill(null))

    tiles.forEach((tile) => {
      grid[tile.row][tile.col] = tile
    })

    return grid
  }

  // Check if the game is over
  const checkGameOver = (boardState: BoardState) => {
    // If there are empty cells, the game is not over
    if (boardState.tiles.length < 16) return false

    const grid = getTilesGrid(boardState.tiles)

    // Check if there are any adjacent cells with the same value
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const tile = grid[row][col]
        if (tile) {
          // Check right
          if (col < 3 && grid[row][col + 1] && grid[row][col + 1]!.value === tile.value) {
            return false
          }
          // Check down
          if (row < 3 && grid[row + 1][col] && grid[row + 1][col]!.value === tile.value) {
            return false
          }
        }
      }
    }

    return true
  }

  // Move tiles in the specified direction
  const move = (direction: Direction) => {
    try {
      // Create a copy of the board state
      const newBoardState: BoardState = {
        tiles: JSON.parse(JSON.stringify(boardState.tiles)),
        score: boardState.score,
      }

      // Reset the merged and new flags
      newBoardState.tiles.forEach((tile) => {
        tile.mergedFrom = undefined
        tile.isNew = false
      })

      // Get the traversal order based on the direction
      const traversals = getTraversalDirections(direction)

      let moved = false

      // Process the tiles in the correct order
      traversals.row.forEach((row) => {
        traversals.col.forEach((col) => {
          const tile = newBoardState.tiles.find((t) => t.row === row && t.col === col)

          if (tile) {
            const { newRow, newCol, merged } = findFarthestPosition(newBoardState, tile, direction)

            if (merged) {
              // Merge with the tile at the new position
              const targetTile = newBoardState.tiles.find((t) => t.row === newRow && t.col === newCol)

              if (targetTile) {
                // Create a new tile with the merged value
                const mergedTile: Tile = {
                  id: generateTileId(),
                  value: tile.value * 2,
                  row: newRow,
                  col: newCol,
                  mergedFrom: [tile.id, targetTile.id],
                }

                // Remove the original tiles
                newBoardState.tiles = newBoardState.tiles.filter((t) => t.id !== tile.id && t.id !== targetTile.id)

                // Add the merged tile
                newBoardState.tiles.push(mergedTile)

                // Update the score
                newBoardState.score += mergedTile.value

                moved = true
              }
            } else if (tile.row !== newRow || tile.col !== newCol) {
              // Move the tile to the new position
              tile.row = newRow
              tile.col = newCol

              moved = true
            }
          }
        })
      })

      // If the board changed, add a new random tile
      if (moved) {
        setIsAnimating(true)

        // First update the state with the moved tiles
        setBoardState(newBoardState)

        // Add a new tile after the animation
        setTimeout(() => {
          try {
            // Create a new copy to avoid mutation issues
            const updatedBoardState = {
              tiles: [...newBoardState.tiles],
              score: newBoardState.score,
            }

            addRandomTile(updatedBoardState)
            setBoardState(updatedBoardState)

            // Check if the game is over
            if (checkGameOver(updatedBoardState)) {
              setGameOver(true)
            }

            setIsAnimating(false)
          } catch (error) {
            console.error("Error updating board state:", error)
            setIsAnimating(false)
          }
        }, 150) // Wait for the movement animation to complete
      }
    } catch (error) {
      console.error("Error in move function:", error)
      setIsAnimating(false)
    }
  }

  // Get the traversal order based on the direction
  const getTraversalDirections = (direction: Direction) => {
    const traversals = {
      row: [0, 1, 2, 3],
      col: [0, 1, 2, 3],
    }

    // Process tiles in the correct order based on the direction
    if (direction === "right") traversals.col = [3, 2, 1, 0]
    if (direction === "down") traversals.row = [3, 2, 1, 0]

    return traversals
  }

  // Find the farthest position a tile can move in the specified direction
  const findFarthestPosition = (boardState: BoardState, tile: Tile, direction: Direction) => {
    let { row, col } = tile
    let newRow = row
    let newCol = col
    let merged = false

    // Calculate the vector for the direction
    const vector = getVector(direction)

    // Move as far as possible in the direction
    do {
      row = newRow
      col = newCol
      newRow = row + vector.row
      newCol = col + vector.col
    } while (isWithinBounds(newRow, newCol) && !isCellOccupied(boardState, newRow, newCol))

    // Check if we can merge with the tile at the new position
    if (isWithinBounds(newRow, newCol) && canMergeWithTile(boardState, tile, newRow, newCol)) {
      merged = true
    } else {
      // If we can't merge, use the previous position
      newRow = row
      newCol = col
    }

    return { newRow, newCol, merged }
  }

  // Get the vector for the direction
  const getVector = (direction: Direction) => {
    const vectors = {
      up: { row: -1, col: 0 },
      right: { row: 0, col: 1 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
    }

    return vectors[direction]
  }

  // Check if the position is within the bounds of the board
  const isWithinBounds = (row: number, col: number) => {
    return row >= 0 && row < 4 && col >= 0 && col < 4
  }

  // Check if the cell is occupied
  const isCellOccupied = (boardState: BoardState, row: number, col: number) => {
    return boardState.tiles.some((tile) => tile.row === row && tile.col === col)
  }

  // Check if the tile can merge with the tile at the specified position
  const canMergeWithTile = (boardState: BoardState, tile: Tile, row: number, col: number) => {
    const targetTile = boardState.tiles.find((t) => t.row === row && t.col === col)

    return targetTile && targetTile.value === tile.value && !targetTile.mergedFrom
  }

  // Get the background color for a tile based on its value
  const getTileColor = (value: number) => {
    switch (value) {
      case 2:
        return "bg-purple-100 text-gray-800"
      case 4:
        return "bg-purple-200 text-gray-800"
      case 8:
        return "bg-purple-300 text-gray-800"
      case 16:
        return "bg-purple-400 text-white"
      case 32:
        return "bg-purple-500 text-white"
      case 64:
        return "bg-purple-600 text-white"
      case 128:
        return "bg-amber-300 text-gray-800"
      case 256:
        return "bg-amber-400 text-white"
      case 512:
        return "bg-amber-500 text-white"
      case 1024:
        return "bg-amber-600 text-white"
      case 2048:
        return "bg-amber-700 text-white"
      default:
        return "bg-purple-800 text-white"
    }
  }

  // Get the font size for a tile based on its value
  const getTileFontSize = (value: number) => {
    if (value < 100) return "text-3xl"
    if (value < 1000) return "text-2xl"
    return "text-xl"
  }

  // Calculate the position of a tile
  const getTilePosition = (row: number, col: number) => {
    return {
      top: `calc(${row * 25}% + 0.5rem)`,
      left: `calc(${col * 25}% + 0.5rem)`,
      width: "calc(25% - 1rem)",
      height: "calc(25% - 1rem)",
    }
  }

  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const targetScore = boardState.score;
    if (displayScore !== targetScore) {
      const duration = 150; // Total animation duration in ms
      const startTime = Date.now();
      const startScore = displayScore;
  
      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        
        if (elapsed < duration) {
          const progress = elapsed / duration;
          const nextScore = Math.round(startScore + (targetScore - startScore) * progress);
          setDisplayScore(nextScore);
          requestAnimationFrame(animate);
        } else {
          setDisplayScore(targetScore);
        }
      };
  
      requestAnimationFrame(animate);
    }
  }, [boardState.score, displayScore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <h1
      className="mb-8 text-6xl font-extrabold text-yellow-400 drop-shadow-[4px_4px_0px_rgba(255,0,0,1)] md:drop-shadow-[6px_6px_0px_rgba(255,0,0,1)] uppercase tracking-wider transform rotate-[-2deg]"
      >
        2048
      </h1>

      <div className="flex items-center justify-between w-full max-w-md mb-4">

        <Card className="p-4 text-center bg-purple-600 font-bold shadow-[0_8px_0_rgb(107,33,168)] uppercase tracking-widest">
          <h2 className="text-sm font-bold text-white">SCORE</h2>
          <p className="text-4xl font-extrabold text-yellow-400 retro-number">{displayScore}</p>
          <style jsx="true">{`
            @keyframes flicker {
              0% { opacity: 1; }
              50% { opacity: 0.8; }
              100% { opacity: 1; }
            }
            .retro-number {
              font-family: 'Press Start 2P', cursive;
              animation: flicker 1s infinite alternate;
            }
          `}</style>
        </Card>

        {
          !account 
            ? <FunPurpleButton text="Sign-in to play" loadingText="Creating player" isLoading={loginLoading} onClick={handleLogin} /> 
            : <div className="flex flex-col items-center gap-4">
                <FunPurpleButton text="New Game" loadingText="" onClick={initializeGame} />
                <p><span className="font-bold">Player</span>: {account.address.slice(0,4) + '...' + account.address.slice(-2)}</p>
              </div>
        }
        
        
        
      </div>

      <div className="relative bg-gray-300 rounded-lg p-2 w-full max-w-md aspect-square">
        {/* Grid background */}
        <div className="grid grid-cols-4 grid-rows-4 gap-2 h-full w-full">
          {Array(16)
            .fill(0)
            .map((_, index) => (
              <div key={`cell-${index}`} className="bg-gray-200 rounded-md"></div>
            ))}
        </div>

        {/* Tiles */}
        {boardState.tiles.map((tile) => (
          <div
            key={tile.id}
            className={`absolute rounded-md flex items-center justify-center ${getTileColor(tile.value)}`}
            style={{
              ...getTilePosition(tile.row, tile.col),
              zIndex: 10,
              transition: "all 150ms ease-in-out",
              transform: tile.mergedFrom ? "scale(1.1)" : tile.isNew ? "scale(0.5)" : "scale(1)",
              animation: tile.mergedFrom
                ? "merge 200ms ease-in-out"
                : tile.isNew
                  ? "appear 200ms ease-in-out forwards"
                  : "none",
            }}
          >
            <span className={`font-bold ${getTileFontSize(tile.value)}`}>{tile.value}</span>
          </div>
        ))}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg z-20">
            <div className="p-6 bg-white rounded-lg text-center">
              <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
              <p className="mb-4">Your score: {boardState.score}</p>
              <Button className="border bg-purple-200" onClick={initializeGame}>Play Again</Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-gray-600">
        <p className="mb-2">Use arrow keys to move the tiles.</p>
        <p>Join the numbers and get to the 2048 tile!</p>
      </div>

      <style jsx={"true"} global={"true"}>{`
        @keyframes appear {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes merge {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

