# Architecture Overview

This document explains how the onchain 2048 game works, from the smart contracts to the frontend, and how they interact to create a fully decentralized gaming experience.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Smart Contract Design](#smart-contract-design)
3. [Board Representation](#board-representation)
4. [Game Lifecycle](#game-lifecycle)
5. [Frontend Architecture](#frontend-architecture)
6. [Transaction Flow](#transaction-flow)
7. [Key Design Decisions](#key-design-decisions)

---

## High-Level Architecture

The 2048 game is played entirely onchain with these components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  • User interface and game rendering                        │
│  • Local game logic (optimistic updates)                    │
│  • Transaction signing via Privy embedded wallets           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Transactions
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Monad Blockchain (EVM-compatible)              │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Monad2048.sol (Main Contract)                 │  │
│  │  • Game state storage                                 │  │
│  │  • Validates all moves                                │  │
│  │  • Prevents cheating/replays                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                              │
│                              │ Uses                         │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         LibBoard.sol (Game Logic Library)             │  │
│  │  • Board transformations (move processing)            │  │
│  │  • Move validation                                    │  │
│  │  • Tile compression and merging                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Design

### Monad2048.sol - Main Game Contract

**Purpose**: Manages game state and ensures all moves are valid.

**Key Components**:

1. **Game State Storage**:

```solidity
struct GameState {
    uint8 move;          // Last move direction (UP=0, DOWN=1, LEFT=2, RIGHT=3)
    uint120 nextMove;    // Next move number (4, 5, 6, ...)
    uint128 board;       // Current board state (encoded as 128 bits)
}

mapping(bytes32 gameId => GameState state) public state;
```

2. **Replay Prevention**:

```solidity
// Prevents reusing the same starting position + first 3 moves
mapping(bytes32 gameHash => bytes32 gameId) public gameHashOf;
```

3. **Two Main Functions**:

   **`startGame(gameId, boards[4], moves[3])`**:
   - Called after the player makes their first 3 moves locally
   - Validates the starting board has exactly 2 tiles (value 2 or 4)
   - Validates each of the first 3 moves is legal
   - Prevents replay attacks by hashing the board sequence
   - Stores the game state after move 3

   **`play(gameId, move, resultBoard)`**:
   - Called for every move after the first 3
   - Validates the move transforms the previous board correctly
   - Updates the game state with the new board
   - Emits `NewMove` event

### LibBoard.sol - Game Logic Library

**Purpose**: Pure functions that implement 2048 game mechanics.

**Key Functions**:

1. **`validateStartPosition(board)`**: Ensures starting board has exactly 2 tiles
2. **`validateTransformation(prevBoard, move, nextBoard, seed)`**: Verifies a move is legal
3. **`processMove(board, move, seed)`**: Applies a move to a board and adds a random tile
4. **Move Processing Pipeline**:
   ```
   Board → Compress → Merge → Add Random Tile → New Board
   ```

**Move Directions**:

- `UP = 0`: Tiles slide upward
- `DOWN = 1`: Tiles slide downward
- `LEFT = 2`: Tiles slide left
- `RIGHT = 3`: Tiles slide right

---

## Board Representation

The game board is encoded as a single **128-bit unsigned integer** (`uint128`).

### Encoding Format

- Board has 16 cells (4x4 grid)
- Each cell uses 8 bits (1 byte)
- Cell value stores **log₂(tile_value)** instead of the actual tile value

**Why log₂?** This allows efficient storage:

```
Tile Value  →  Stored Value (log₂)
─────────────────────────────────
Empty (0)   →  0
2           →  1
4           →  2
8           →  3
16          →  4
32          →  5
64          →  6
128         →  7
256         →  8
512         →  9
1024        →  10
2048        →  11
4096        →  12
```

### Memory Layout

The board is stored as 128 bits (16 bytes) laid out as:

```
Bit positions:  [127-120][119-112]...[15-8][7-0]
Cell positions:    [0]      [1]    ...  [14] [15]

Grid mapping:
  0   1   2   3
  4   5   6   7
  8   9  10  11
 12  13  14  15
```

**Example**: A board with tiles `[2, 4, _, _]` in the first row would be:

```
0x01020000000000000000000000000000
  ^^ ^^ (rest are zeros)
  |  |
  |  +-- log₂(4) = 2
  +----- log₂(2) = 1
```

---

## Game Lifecycle

### 1. Game Initialization (Local)

**User Action**: Clicks "New Game"

**Frontend Flow**:

1. Generates a unique `gameId`:
   - First 160 bits: User's Ethereum address
   - Last 96 bits: Random nonce
2. Creates initial board with 2 random tiles (90% chance of 2, 10% chance of 4)
3. Sets `playedMovesCount = 1`
4. No blockchain transaction yet

### 2. First Three Moves (Local + Validation)

**User Action**: Swipes or presses arrow keys

**Frontend Flow**:

1. Processes move locally (compress, merge, add random tile)
2. Encodes the board state
3. Stores the move in `encodedMoves` array
4. Increments `playedMovesCount`

**Why wait until move 3?** There are billions of possible board states possible after 3 moves. This lets the contract mandate two random players to have different start positions.

### 3. Move 3 → Blockchain Initialization

**User Action**: Makes the 3rd move

**Frontend Flow**:

1. Processes the move locally
2. Calls `initializeGameTransaction(gameId, boards[4], moves[3])`
   - `boards[4]`: Initial board + boards after moves 1, 2, 3
   - `moves[3]`: The 3 move directions

**Smart Contract Flow** (`startGame`):

1. Validates the game ID encodes the player's address
2. Checks the game ID hasn't been used
3. Validates starting board has exactly 2 tiles
4. Validates each transformation using `LibBoard.validateTransformation()`
5. Checks board sequence hasn't been played before (anti-replay)
6. Stores game state after move 3
7. Emits `NewGame` event

**Transaction Details**:

- Gas: ~150,000
- Method: `eth_sendRawTransactionSync` (Monad's synchronous transaction API)
- Timeout: 10 seconds

### 4. Subsequent Moves (Onchain)

**User Action**: Makes move 4, 5, 6, ...

**Frontend Flow**:

1. Processes move locally (optimistic update)
2. Calls `playNewMoveTransaction(gameId, boardAfterMove, move, moveCount)`

**Smart Contract Flow** (`play`):

1. Validates the game ID matches the sender
2. Retrieves the previous board state
3. Applies the move using `LibBoard.processMove()`
4. Compares result to submitted board - must match exactly
5. Updates game state
6. Emits `NewMove` event

**Transaction Details**:

- Gas: ~100,000
- Each move is a separate transaction
- Frontend tracks nonce locally to send transactions sequentially

### 5. Random Tile Placement (Deterministic)

**How randomness works**:

Both frontend and contract use the same deterministic seed:

```solidity
seed = keccak256(gameId || moveNumber)
```

This ensures:

- Frontend can predict where tiles will appear
- Contract validates the same placement
- No randomness manipulation by players

**Tile selection**:

1. Find all empty cells
2. Use `seed % emptyCount` to pick a cell
3. Use `seed % 100` to decide value (>90 = tile 4, else tile 2)

### 6. Game Over Detection

**Frontend checks after each move**:

1. Is the board full? (16 tiles)
2. Are there any adjacent tiles with the same value?
3. If no valid moves remain → Game Over

**No onchain game-over transaction** - the contract simply won't accept invalid moves.

### 7. Game Resumption

**User Action**: Clicks "Resync Game" or switches networks

**Frontend Flow**:

1. Calls `getLatestGameBoard(gameId)` to read contract state
2. Decodes the board (convert log₂ values back to tile values)
3. Restores the board visually
4. Resumes gameplay from that point

---

## Frontend Architecture

### Technology Stack

- **React 19**: UI framework
- **Vite**: Build tool
- **Privy**: Authentication and embedded wallets (no seed phrases needed)
- **Viem**: Ethereum library for contract interactions
- **Tailwind CSS**: Styling

### Key Components

1. **App.tsx** - Main game logic:
   - Game state management (tiles, score, game over)
   - Move processing (compress, merge, add tiles)
   - Keyboard and touch input handling
   - Transaction orchestration

2. **Board.tsx** - Visual rendering:
   - 4x4 grid display
   - Tile animations (slide, merge, appear)
   - Responsive design

3. **useTransactions.tsx** - Blockchain interaction:
   - Transaction signing
   - Nonce management (local tracking for sequential txs)
   - Balance checking
   - Contract method calls

4. **NetworkContext.tsx** - Network management:
   - Testnet/Mainnet switching
   - RPC client configuration
   - Explorer URL mapping

### State Management

**Game State**:

```typescript
{
  tiles: Tile[],           // Current tiles on board
  score: number,           // Current score
  gameOver: boolean,       // Is game finished?
  activeGameId: Hex,       // Current game's ID
  encodedMoves: EncodedMove[], // History of moves
  playedMovesCount: number // How many moves made
}
```

**Tile Object**:

```typescript
{
  id: string,              // Unique identifier
  value: number,           // 2, 4, 8, ..., 2048
  row: number,             // 0-3
  col: number,             // 0-3
  mergedFrom?: string[],   // IDs of tiles that merged
  isNew?: boolean          // Just spawned?
}
```

---

## Transaction Flow

### Optimistic Updates

The frontend uses **optimistic updates** to provide instant feedback:

1. User makes a move
2. Frontend immediately updates the UI
3. Transaction is sent to blockchain in the background
4. If transaction fails, board reverts to previous state

### Error Handling

**If a transaction fails**:

1. Frontend catches the error
2. Displays an error toast with details
3. Reverts the board to the pre-move state
4. User can try again or resync with contract

**Insufficient Balance**:

- Opens a faucet dialog
- Provides link to get test tokens
- Prevents further moves until balance restored

### Nonce Management

**Problem**: Sending multiple transactions quickly requires careful nonce tracking.

**Solution**:

```typescript
userNonce.current = await getTransactionCount(address)

// For each transaction:
const nonce = userNonce.current
userNonce.current = nonce + 1  // Increment immediately

await sendTransaction({ nonce, ... })
```

This allows transactions to be sent sequentially without waiting for confirmation.

---

## Key Design Decisions

### 1. Why Wait Until Move 3?

**Gas Optimization**: Starting a game with 1 transaction is cheaper than 4 separate transactions.

**Trade-off**: First 3 moves aren't validated until the 4th move, but the contract checks all 3 retroactively.

### 2. Why Store Board as uint128?

**Efficiency**:

- 128 bits fits perfectly in a single storage slot
- Using log₂ encoding allows values up to 2^255 (way beyond 2048)
- Cheaper to store and read than an array

### 3. Why Deterministic Randomness?

**Verifiability**:

- Contract can validate that frontend placed tiles correctly
- No need for oracle or VRF (Verifiable Random Function)
- Prevents cheating - can't "reroll" tile placement

**Seed formula**: `keccak256(gameId || moveNumber)` ensures:

- Each move gets a unique seed
- Players can't predict future tiles
- Contract and frontend agree on placement

### 4. Why Privy Embedded Wallets?

**User Experience**:

- No seed phrase management
- Social login (Google, email)
- Passkey support
- Reduces friction for non-crypto users

### 5. Why Monad?

**Performance**:

- Synchronous transaction confirmation (`eth_sendRawTransactionSync`)
- Fast block times
- Low latency for onchain gaming
- Each move confirmed within ~10 seconds

### 6. Why Validate Every Move Onchain?

**Trust Minimization**:

- Anyone can verify game integrity
- Scores are provably legitimate
- No server can manipulate outcomes
- Truly decentralized gaming

### 7. Board Encoding Efficiency

**Log₂ encoding saves space**:

- Normal encoding: 16 cells × 16 bits = 256 bits
- Log₂ encoding: 16 cells × 8 bits = 128 bits
- 50% storage reduction

**Bit manipulation benefits**:

- Fast tile merging with bit shifts
- Efficient empty cell detection
- Compact state representation

---

## Security Features

### 1. Game ID Validation

The game ID must encode the player's address in the first 160 bits:

```solidity
require(player == address(uint160(uint256(gameId) >> 96)))
```

This ensures:

- Only the game creator can make moves
- No one can hijack another player's game

### 2. Replay Attack Prevention

The contract hashes the starting position + first 3 moves:

```solidity
bytes32 hashedBoards = keccak256(abi.encodePacked(boards))
require(gameHashOf[hashedBoards] == bytes32(0))
gameHashOf[hashedBoards] = gameId
```

This prevents:

- Reusing a winning game sequence
- Claiming multiple high scores from one game

### 3. Move Validation

Every move is validated by recomputing it:

```solidity
require(processMove(prevBoard, move, seed) == resultBoard)
```

This ensures:

- No invalid board states
- Tiles merge correctly
- Random tiles placed according to seed

### 4. Client-Side Nonce Tracking

Prevents nonce conflicts when sending rapid transactions:

- Frontend tracks nonce locally
- Increments immediately after sending
- Prevents transaction race conditions

---

## Contract Addresses

**Testnet (Chain ID: 10143)**:

- Address: `0xC52d29f79b2552801e95C8Dc7646f59125009904`

**Mainnet (Chain ID: 143)**:

- Address: `0x53748668642735CDa45935716525E7DFbC8aAACC`

Both deployments use identical contract code with gas optimizations:

- Solidity 0.8.28
- Optimizer runs: 2,000,000
- Via IR compilation
- EVM version: Paris

---

## Further Reading

- [Monad Developer Docs](https://docs.monad.xyz)
- [2048 Game Rules](<https://en.wikipedia.org/wiki/2048_(video_game)>)
- [Privy Documentation](https://docs.privy.io)
- [Viem Documentation](https://viem.sh)
- [Foundry Book](https://book.getfoundry.sh)
