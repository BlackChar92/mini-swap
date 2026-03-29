import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Inserts (upsert to handle reorg replays) ───

export async function insertSwap(data: {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  sender: string;
  toAddress: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  pair: string;
}) {
  return prisma.swap.upsert({
    where: { txHash_logIndex: { txHash: data.txHash, logIndex: data.logIndex } },
    update: data,
    create: data,
  });
}

export async function insertMint(data: {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  sender: string;
  amount0: string;
  amount1: string;
  pair: string;
}) {
  return prisma.mint.upsert({
    where: { txHash_logIndex: { txHash: data.txHash, logIndex: data.logIndex } },
    update: data,
    create: data,
  });
}

export async function insertBurn(data: {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  sender: string;
  toAddress: string;
  amount0: string;
  amount1: string;
  pair: string;
}) {
  return prisma.burn.upsert({
    where: { txHash_logIndex: { txHash: data.txHash, logIndex: data.logIndex } },
    update: data,
    create: data,
  });
}

// ─── Queries ───

export async function getRecentActivity(limit: number) {
  const [swaps, mints, burns] = await Promise.all([
    prisma.swap.findMany({ orderBy: { blockNumber: "desc" }, take: limit }),
    prisma.mint.findMany({ orderBy: { blockNumber: "desc" }, take: limit }),
    prisma.burn.findMany({ orderBy: { blockNumber: "desc" }, take: limit }),
  ]);

  return [
    ...swaps.map((s) => ({ ...s, type: "swap" as const })),
    ...mints.map((m) => ({ ...m, type: "mint" as const })),
    ...burns.map((b) => ({ ...b, type: "burn" as const })),
  ]
    .sort((a, b) => b.blockNumber - a.blockNumber || b.id - a.id)
    .slice(0, limit);
}

export async function getSwapsByAddress(address: string, limit: number) {
  const addr = address.toLowerCase();
  return prisma.swap.findMany({
    where: {
      OR: [
        { sender: { equals: addr, mode: "insensitive" } },
        { toAddress: { equals: addr, mode: "insensitive" } },
      ],
    },
    orderBy: { blockNumber: "desc" },
    take: limit,
  });
}

export async function getRecentSwaps(limit: number) {
  return prisma.swap.findMany({ orderBy: { blockNumber: "desc" }, take: limit });
}

export async function getRecentMints(limit: number) {
  return prisma.mint.findMany({ orderBy: { blockNumber: "desc" }, take: limit });
}

export async function getRecentBurns(limit: number) {
  return prisma.burn.findMany({ orderBy: { blockNumber: "desc" }, take: limit });
}

// ─── Reorg: delete all events at or above a given block ───

export async function deleteEventsFromBlock(blockNumber: number) {
  await Promise.all([
    prisma.swap.deleteMany({ where: { blockNumber: { gte: blockNumber } } }),
    prisma.mint.deleteMany({ where: { blockNumber: { gte: blockNumber } } }),
    prisma.burn.deleteMany({ where: { blockNumber: { gte: blockNumber } } }),
  ]);
}

// ─── Sync state ───

export async function getSyncState() {
  return prisma.syncState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastBlock: 0, lastBlockHash: "" },
  });
}

export async function setSyncState(lastBlock: number, lastBlockHash: string) {
  return prisma.syncState.upsert({
    where: { id: 1 },
    update: { lastBlock, lastBlockHash },
    create: { id: 1, lastBlock, lastBlockHash },
  });
}
