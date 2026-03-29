import { createServer } from "http";
import { createPublicClient, http, type Address } from "viem";
import { foundry, sepolia } from "viem/chains";
import { syncHistorical, watchEvents } from "./sync.js";
import { initWebSocket } from "./ws.js";
import app from "./api.js";

// ─── Config ───

const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS as Address;
const API_PORT = Number(process.env.API_PORT) || 3001;
const NETWORK = process.env.NETWORK || "foundry";

if (!FACTORY_ADDRESS) {
  console.error("FACTORY_ADDRESS env var is required");
  process.exit(1);
}

const chain = NETWORK === "sepolia" ? sepolia : foundry;

const factoryABI = [
  {
    inputs: [{ type: "uint256" }],
    name: "allPairs",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "allPairsLength",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─── Main ───

async function main() {
  console.log(`MiniSwap Indexer starting...`);
  console.log(`  Network: ${NETWORK}`);
  console.log(`  RPC: ${RPC_URL}`);
  console.log(`  Factory: ${FACTORY_ADDRESS}`);

  const client = createPublicClient({
    chain,
    transport: http(RPC_URL),
  });

  // Discover pairs
  const pairCount = await client.readContract({
    address: FACTORY_ADDRESS,
    abi: factoryABI,
    functionName: "allPairsLength",
  });

  console.log(`Found ${pairCount} pair(s)`);

  const pairs: Address[] = [];
  for (let i = 0n; i < pairCount; i++) {
    const pair = await client.readContract({
      address: FACTORY_ADDRESS,
      abi: factoryABI,
      functionName: "allPairs",
      args: [i],
    });
    pairs.push(pair);
    console.log(`  Pair ${i}: ${pair}`);
  }

  // Sync + watch
  for (const pair of pairs) {
    await syncHistorical(client, pair);
    watchEvents(client, pair);
  }

  // HTTP + WebSocket server
  const server = createServer(app);
  initWebSocket(server);

  server.listen(API_PORT, () => {
    console.log(`API:  http://localhost:${API_PORT}`);
    console.log(`WS:   ws://localhost:${API_PORT}/ws`);
    console.log(`Health: http://localhost:${API_PORT}/health`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
