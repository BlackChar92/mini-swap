# MiniSwap

A minimal decentralized exchange and AMM built from scratch. Implements the constant product AMM model (x \* y = k) inspired by Uniswap V2, with a full-stack architecture: smart contracts, frontend, and event indexer.

**Live Demo**: [https://frontend-seven-rose-46.vercel.app](https://frontend-seven-rose-46.vercel.app) (Sepolia Testnet)

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                          Frontend                             │
│                Next.js + wagmi + RainbowKit                   │
│           Swap UI / Pool UI / Activity Feed                   │
└──────┬──────────────┬──────────────────────┬─────────────────┘
       │ write (tx)   │ read (Multicall)     │ read (REST + WS)
       ▼              ▼                      ▼
┌─────────────────────────────┐   ┌────────────────────────────┐
│      Smart Contracts         │   │          Indexer            │
│      (Foundry/Solidity)      │◄──│  Node.js + Prisma + viem   │
│                              │   │  Event sync + REST + WS    │
│  MiniFactory                 │   │  Reorg detection + SQLite  │
│  MiniPair (AMM)              │   └────────────────────────────┘
│  MiniRouter                  │
│  MiniMulticall (aggregator)  │   ┌────────────────────────────┐
│  MockERC20                   │   │    The Graph Subgraph       │
└──────────────────────────────┘   │  (production alternative)   │
                                   └────────────────────────────┘
```

## Contracts

| Contract | Description |
|----------|-------------|
| `MiniFactory` | Creates and manages trading pairs. Prevents duplicate pairs. |
| `MiniPair` | Core AMM contract. Holds reserves, executes swaps, mints/burns LP tokens. Uses `x * y = k` invariant with 0.3% swap fee. |
| `MiniRouter` | User-facing entry point. Handles slippage protection, deadline checks, and optimal liquidity calculation. |
| `MiniMulticall` | Read-only aggregator. Batches 6-8 RPC calls into one: pair info, swap quotes with on-chain price impact, balances, and all pairs. |
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
| Indexer | Node.js, TypeScript, viem, Express, Prisma + SQLite, WebSocket, Zod |
| Indexer (production alt) | The Graph subgraph (AssemblyScript) |
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
- Sync historical events with reorg detection and rollback
- Watch for new Swap/Mint/Burn events in real-time
- Push updates via WebSocket (`ws://localhost:3001/ws`)
- Serve a REST API at `http://localhost:3001`

### 4. Start the frontend

```bash
# Terminal 4
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Connect an EVM wallet, then:
- For local Anvil development, import an Anvil private key into MetaMask.
- TronLink is also available when its EVM provider is exposed as `window.tronLink.ethereum`.
- This frontend only targets EVM networks configured in wagmi (`foundry` locally or `sepolia`), not native TRON chain RPC/API.
- **Swap** tokens on the Swap page
- **Add liquidity** on the Pool page
- **View transaction history** in the Activity Feed (powered by the indexer)

## Indexer API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (uptime, timestamp) |
| `GET /api/activity?limit=20` | Recent swaps, mints, and burns (combined, sorted by block) |
| `GET /api/swaps?limit=50` | Recent swap events |
| `GET /api/mints?limit=50` | Recent liquidity additions |
| `GET /api/burns?limit=50` | Recent liquidity removals |
| `GET /api/swaps/:address` | Swap history for a specific address |
| `GET /api/stats/:pair` | Pool stats: 24h volume, fees, swap count |
| `GET /api/price/:pair?hours=24` | Price history (hourly buckets) |
| `GET /api/user/:address` | User profile: swap/mint/burn stats + total volume |
| `WS /ws` | Real-time event push (swap, mint, burn) |

All query params validated with Zod. Rate limited at 120 requests/minute.

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
│   ├── periphery/           # MiniRouter, MiniMulticall
│   ├── tokens/              # MockERC20
│   └── libraries/           # ERC20, Math
├── test/                    # Forge tests
├── script/                  # Deploy scripts
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/             # Pages (Swap, Pool, Faucet)
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Contract interaction hooks
│   │   ├── config/          # wagmi + contract config
│   │   └── abi/             # Contract ABIs
│   └── .env.sepolia         # Sepolia contract addresses (committed)
├── indexer/                 # Event indexer + REST API + WebSocket
│   ├── prisma/
│   │   └── schema.prisma    # Data models (Swap/Mint/Burn/SyncState)
│   └── src/
│       ├── index.ts         # Entry: discover pairs → sync → watch → serve
│       ├── sync.ts          # Historical sync + real-time watch + reorg detection
│       ├── api.ts           # Express middleware (CORS, rate limit, error handling)
│       ├── ws.ts            # WebSocket real-time broadcast
│       ├── events.ts        # Event ABI definitions
│       ├── services/        # event.service.ts, pair.service.ts
│       └── routes/          # activity.ts, stats.ts
└── subgraph/                # The Graph subgraph
    ├── schema.graphql       # Entity definitions
    ├── subgraph.yaml        # Data sources + mappings
    └── src/                 # AssemblyScript handlers
```

## Sepolia Deployment

| Contract | Address |
|----------|---------|
| Token ALPHA | [`0x57076B5CB36ECE9D1Cb30C2d81459307fddB61BE`](https://sepolia.etherscan.io/address/0x57076B5CB36ECE9D1Cb30C2d81459307fddB61BE) |
| Token BETA | [`0x37f742f89D04A15A1c5fa5a6da85525DD1b1aF25`](https://sepolia.etherscan.io/address/0x37f742f89D04A15A1c5fa5a6da85525DD1b1aF25) |
| Factory | [`0x1AE12704Cd62dDf6067A33bdd7e3Cb019B0a8870`](https://sepolia.etherscan.io/address/0x1AE12704Cd62dDf6067A33bdd7e3Cb019B0a8870) |
| Router | [`0xe22BC7ea7CE10B210aCFBD4ba45a131b1E2D5286`](https://sepolia.etherscan.io/address/0xe22BC7ea7CE10B210aCFBD4ba45a131b1E2D5286) |
| Pair (ALPHA/BETA) | [`0xb4177c1884B49d5cb1d4087A18411de7a375B441`](https://sepolia.etherscan.io/address/0xb4177c1884B49d5cb1d4087A18411de7a375B441) |
| Multicall | [`0x936f215b436D886f24B0D118C73D13D85B962d91`](https://sepolia.etherscan.io/address/0x936f215b436D886f24B0D118C73D13D85B962d91) |

All contracts are verified on Etherscan.

## License

MIT
