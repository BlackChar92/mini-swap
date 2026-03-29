import { createPublicClient, http, type Address } from "viem";
import { foundry } from "viem/chains";
import { syncHistorical, watchEvents } from "./sync.js";
import app from "./api.js";

// Config
const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS as Address;
const API_PORT = Number(process.env.API_PORT) || 3001;

if (!FACTORY_ADDRESS) {
  console.error("FACTORY_ADDRESS env var is required");
  process.exit(1);
}

// ABI for reading pair address from factory
const factoryABI = [
  {
    inputs: [{ type: "address" }, { type: "address" }],
    name: "getPair",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
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

async function main() {
  const client = createPublicClient({
    chain: foundry,
    transport: http(RPC_URL),
  });

  // Discover all pairs from factory
  const pairCount = await client.readContract({
    address: FACTORY_ADDRESS,
    abi: factoryABI,
    functionName: "allPairsLength",
  });

  console.log(`Found ${pairCount} pairs`);

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

  // Sync and watch each pair
  for (const pair of pairs) {
    await syncHistorical(client, pair);
    watchEvents(client, pair);
  }

  // Start API server
  app.listen(API_PORT, () => {
    console.log(`Indexer API running at http://localhost:${API_PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
