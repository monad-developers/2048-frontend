# 2048 Onchain Game - Monorepo

A fully onchain implementation of the 2048 game built on Monad. This monorepo contains both the frontend application and the smart contracts that power the game.

## 🏗️ Project Structure

```
2048-monorepo/
├── packages/
│   ├── frontend/          # React + Vite frontend application
│   └── contracts/         # Foundry smart contracts
├── package.json           # Root package.json with workspace scripts
├── pnpm-workspace.yaml    # PNPM workspace configuration
└── README.md
```

## 📦 Packages

### Frontend (`packages/frontend/`)

React-based web application that provides the user interface for playing 2048 onchain.

**Tech Stack:**

- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS v4 for styling
- Privy for authentication and embedded wallets
- Viem for Ethereum interactions
- Radix UI components

**Features:**

- Fully onchain gameplay - each move is a transaction
- Privy embedded wallets (no seed phrases required)
- Network switching (Monad Testnet/Mainnet)
- Real-time game state synchronization with smart contract
- Responsive design with touch support

### Contracts (`packages/contracts/`)

Foundry-based smart contracts implementing the 2048 game logic entirely onchain.

**Tech Stack:**

- Solidity 0.8.28
- Foundry (forge, cast, anvil)
- Optimized for gas efficiency

**Main Contracts:**

- `Monad2048.sol` - Main game contract with state management
- `LibBoard.sol` - Library for board transformations and move validation

**Contract Addresses:**

- **Testnet:** `0xC52d29f79b2552801e95C8Dc7646f59125009904`
- **Mainnet:** `0x53748668642735CDa45935716525E7DFbC8aAACC`

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Foundry (for contracts development)

### Installation

1. Clone the repository:

```bash
git clone <repo-url>
cd 2048-frontend
```

2. Install dependencies:

```bash
pnpm install
```

This will install dependencies for all workspace packages (frontend and contracts).

### Development

Start the frontend development server:

```bash
pnpm dev
# or
pnpm dev:frontend
```

The frontend will be available at `http://localhost:5173`

## 🛠️ Available Commands

### Root-Level Commands

Run commands across all packages or specific packages:

```bash
# Development
pnpm dev                    # Start frontend dev server
pnpm dev:frontend          # Same as above

# Build
pnpm build                 # Build all packages
pnpm build:frontend        # Build frontend only
pnpm build:contracts       # Build contracts only

# Test
pnpm test                  # Run tests for all packages
pnpm test:frontend         # Run frontend tests
pnpm test:contracts        # Run contract tests

# Lint
pnpm lint                  # Lint all packages
pnpm lint:frontend         # Lint frontend code
pnpm lint:contracts        # Check contract formatting

# Preview
pnpm preview              # Preview frontend production build

# Contracts
pnpm contracts:deploy     # Deploy contracts (requires env vars)
```

### Frontend-Specific Commands

Navigate to `packages/frontend/` and run:

```bash
pnpm dev                  # Start dev server
pnpm build                # Build for production
pnpm preview              # Preview production build
pnpm lint                 # Lint code
```

### Contracts-Specific Commands

Navigate to `packages/contracts/` and run:

```bash
pnpm build                # Compile contracts
pnpm test                 # Run tests with verbose output
pnpm test:gas            # Run tests with gas report
pnpm lint                 # Check formatting
pnpm format               # Format Solidity code
pnpm clean                # Clean build artifacts
pnpm deploy               # Deploy with custom RPC_URL
pnpm deploy:testnet       # Deploy to Monad testnet
pnpm deploy:mainnet       # Deploy to Monad mainnet
```

Or use Foundry directly:

```bash
forge build               # Compile contracts
forge test                # Run tests
forge test -vvv           # Run tests with verbose output
forge fmt                 # Format contracts
```

## 🔧 Configuration

### Frontend Environment Variables

Create `packages/frontend/.env.local`:

```env
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_MONAD_TESTNET_RPC_URL=https://monad-testnet.g.alchemy.com/v2/YOUR_KEY
VITE_MONAD_MAINNET_RPC_URL=https://monad-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_2048_FAUCET_URL=https://faucet.monad.xyz
```

### Contract Deployment

For contract deployment, set environment variables:

```bash
export RPC_URL="https://monad-testnet.g.alchemy.com/v2/YOUR_KEY"
export DEPLOYER_PRIVATE_KEY="your_private_key"
pnpm contracts:deploy
```

## 📚 How It Works

### Game Flow

1. **User Authentication**: Users log in with Privy (Google, Passkey, or Wallet)
2. **Game Start**: First 3 moves are played locally to initialize the board
3. **Initialize Transaction**: After move 3, `initializeGameTransaction` is called with the board states
4. **Subsequent Moves**: Each move after initialization calls `playNewMoveTransaction`
5. **Onchain Validation**: Smart contract validates each move and updates the board state
6. **Game State**: Board is stored onchain and can be queried/resynced at any time

### Board Encoding

The board is encoded as a 128-bit integer where each 8-bit segment represents a tile. The value stored is `log₂(tile_value)`, so:

- Empty tile (0) = 0
- Tile with 2 = 1
- Tile with 4 = 2
- Tile with 2048 = 11

## 🧪 Testing

### Frontend Tests

```bash
pnpm test:frontend
```

### Contract Tests

```bash
pnpm test:contracts
```

The contracts include comprehensive tests for:

- Board validation and transformations
- Move processing (up, down, left, right)
- Tile merging logic
- Game state management

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔗 Links

- [Monad Documentation](https://docs.monad.xyz)
- [Privy Documentation](https://docs.privy.io)
- [Foundry Book](https://book.getfoundry.sh)
- [Vite Documentation](https://vitejs.dev)
