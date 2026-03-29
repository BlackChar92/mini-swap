# MiniSwap

A minimal decentralized exchange and AMM built from scratch. Implements the constant product AMM model (x \* y = k) inspired by Uniswap V2, with a full-stack architecture: smart contracts, frontend, and event indexer.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                         │
│              Next.js + wagmi + RainbowKit                │
│         Swap UI / Pool UI / Activity Feed               │
└──────────┬──────────────────────────┬───────────────────┘
           │ write (tx)               │ read (REST)
           ▼                          ▼
┌─────────────────────┐   ┌─────────────────────────────┐
│   Smart Contracts    │   │         Indexer              │
│   (Foundry/Solidity) │◄──│  Node.js + viem             │
│                      │   │  Event sync + REST API      │
│  MiniFactory         │   └─────────────────────────────┘
│  MiniPair (AMM)      │
│  MiniRouter          │   ┌─────────────────────────────┐
│  MockERC20           │   │    The Graph Subgraph        │
└──────────────────────┘   │  (production alternative)    │
                           └─────────────────────────────┘
```

## Contracts

| Contract | Description |
|----------|-------------|
| `MiniFactory` | Creates and manages trading pairs. Prevents duplicate pairs. |
| `MiniPair` | Core AMM contract. Holds reserves, executes swaps, mints/burns LP tokens. Uses `x * y = k` invariant with 0.3% swap fee. |
| `MiniRouter` | User-facing entry point. Handles slippage protection, deadline checks, and optimal liquidity calculation. |
| `MockERC20` | Simple ERC20 token for testing. Anyone can mint. |

### Key Mechanisms

- **Constant product formula**: `x * y = k` ensures price adjusts with supply/demand
- **0.3% swap fee**: Collected by LPs via the `k` invariant check
- **LP tokens**: ERC20 tokens representing proportional share of the pool
- **MINIMUM_LIQUIDITY**: First 1000 LP tokens permanently locked to prevent division by zero
- **Reentrancy guard**: Lock modifier on all state-changing pair functions
- **Slippage protection**: Minimum output amount enforced by the router
- **Deadline check**: Transactions revert if confirmed too late

### Simplifications vs Uniswap V2

- No flash swaps
- No protocol fee switch
- No TWAP price oracle
- Single-hop swaps only (no multi-hop routing)
- Factory uses `new` instead of `create2`

## Tech Stack

| Layer | Stack |
|-------|-------|
| Contracts | Solidity 0.8.28, Foundry |
| Frontend | Next.js, TypeScript, wagmi v2, viem, RainbowKit, Tailwind CSS |
| Indexer (local) | Node.js, TypeScript, viem, Express |
| Indexer (production) | The Graph subgraph (AssemblyScript) |
| Testing | Forge tests with fuzz testing |

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)

### 1. Clone and build contracts

```bash
git clone https://github.com/Blackchar92/mini-swap.git
cd mini-swap
forge build
forge test -v
```

### 2. Start local blockchain and deploy

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy contracts (auto-fills frontend/.env.local)
bash script/deploy-local.sh
```

### 3. Start the indexer

```bash
# Terminal 3
cd indexer
pnpm install
FACTORY_ADDRESS=<address from deploy output> pnpm dev
```

The indexer will:
- Discover all pairs from the factory
- Sync historical events from genesis
- Watch for new Swap/Mint/Burn events in real-time
- Serve a REST API at `http://localhost:3001`

### 4. Start the frontend

```bash
# Terminal 4
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Connect a wallet (import an Anvil private key into MetaMask), then:
- **Swap** tokens on the Swap page
- **Add liquidity** on the Pool page
- **View transaction history** in the Activity Feed (powered by the indexer)

## Indexer API

| Endpoint | Description |
|----------|-------------|
| `GET /api/activity?limit=20` | Recent swaps, mints, and burns (combined, sorted by block) |
| `GET /api/swaps?limit=50` | Recent swap events |
| `GET /api/mints?limit=50` | Recent liquidity additions |
| `GET /api/burns?limit=50` | Recent liquidity removals |
| `GET /api/swaps/:address` | Swap history for a specific address |

## Testing

```bash
# Run all contract tests (includes fuzz tests)
forge test -v

# Run with gas reporting
forge test --gas-report
```

### Test Coverage

- Factory: pair creation, duplicate prevention, address validation
- Liquidity: initial + subsequent deposits, proportional withdrawal
- Swap: exact-input, exact-output, slippage protection, deadline expiry
- Fuzz: constant product invariant holds for random input amounts
- Fuzz: add/remove liquidity round-trip preserves funds

## The Graph Subgraph

The `subgraph/` directory contains a subgraph definition for deployment to [The Graph](https://thegraph.com/):

```bash
# After deploying contracts to a testnet, update subgraph.yaml with:
# - Contract address
# - Start block
# - Network name

cd subgraph
graph codegen
graph build
graph deploy --studio mini-swap
```

## Project Structure

```
mini-swap/
├── src/                     # Solidity contracts
│   ├── core/                # MiniFactory, MiniPair
│   ├── periphery/           # MiniRouter
│   ├── tokens/              # MockERC20
│   └── libraries/           # ERC20, Math
├── test/                    # Forge tests
├── script/                  # Deploy scripts
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/             # Pages (Swap, Pool)
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Contract interaction hooks
│   │   ├── config/          # wagmi + contract config
│   │   └── abi/             # Contract ABIs
│   └── .env.local           # Contract addresses
├── indexer/                 # Event indexer + REST API
│   └── src/
│       ├── index.ts         # Entry: discover pairs → sync → watch → serve
│       ├── sync.ts          # Historical sync + real-time watching
│       ├── api.ts           # Express REST API
│       ├── db.ts            # JSON file storage
│       └── events.ts        # Event ABI definitions
└── subgraph/                # The Graph subgraph
    ├── schema.graphql       # Entity definitions
    ├── subgraph.yaml        # Data sources + mappings
    └── src/                 # AssemblyScript handlers
```

## License

MIT
