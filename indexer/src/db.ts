import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "indexer.json");

mkdirSync(DATA_DIR, { recursive: true });

export interface SwapRecord {
  id: number;
  tx_hash: string;
  block_number: number;
  timestamp: number;
  sender: string;
  to_address: string;
  amount0_in: string;
  amount1_in: string;
  amount0_out: string;
  amount1_out: string;
  pair: string;
}

export interface MintRecord {
  id: number;
  tx_hash: string;
  block_number: number;
  timestamp: number;
  sender: string;
  amount0: string;
  amount1: string;
  pair: string;
}

export interface BurnRecord {
  id: number;
  tx_hash: string;
  block_number: number;
  timestamp: number;
  sender: string;
  to_address: string;
  amount0: string;
  amount1: string;
  pair: string;
}

interface Store {
  swaps: SwapRecord[];
  mints: MintRecord[];
  burns: BurnRecord[];
  lastBlock: number;
  nextId: number;
}

function load(): Store {
  try {
    return JSON.parse(readFileSync(DB_FILE, "utf-8"));
  } catch {
    return { swaps: [], mints: [], burns: [], lastBlock: 0, nextId: 1 };
  }
}

function save(store: Store) {
  writeFileSync(DB_FILE, JSON.stringify(store, null, 2));
}

const store = load();

export function insertSwap(data: Omit<SwapRecord, "id">) {
  store.swaps.push({ ...data, id: store.nextId++ });
  save(store);
}

export function insertMint(data: Omit<MintRecord, "id">) {
  store.mints.push({ ...data, id: store.nextId++ });
  save(store);
}

export function insertBurn(data: Omit<BurnRecord, "id">) {
  store.burns.push({ ...data, id: store.nextId++ });
  save(store);
}

export function getLastBlock(): bigint {
  return BigInt(store.lastBlock);
}

export function setLastBlock(blockNumber: number) {
  store.lastBlock = blockNumber;
  save(store);
}

export function getRecentSwaps(limit: number): SwapRecord[] {
  return store.swaps.slice(-limit).reverse();
}

export function getRecentMints(limit: number): MintRecord[] {
  return store.mints.slice(-limit).reverse();
}

export function getRecentBurns(limit: number): BurnRecord[] {
  return store.burns.slice(-limit).reverse();
}

export function getSwapsByAddress(address: string, limit: number): SwapRecord[] {
  const addr = address.toLowerCase();
  return store.swaps
    .filter((s) => s.sender.toLowerCase() === addr || s.to_address.toLowerCase() === addr)
    .slice(-limit)
    .reverse();
}
