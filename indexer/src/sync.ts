import { type PublicClient, type Address, formatEther } from "viem";
import { SwapEvent, MintEvent, BurnEvent } from "./events.js";
import {
  insertSwap,
  insertMint,
  insertBurn,
  getSyncState,
  setSyncState,
  deleteEventsFromBlock,
} from "./services/event.service.js";
import { broadcast } from "./ws.js";

const BATCH_SIZE = 2000n;
const CONFIRMATIONS = 2;

// ─── Reorg detection ───

async function detectReorg(
  client: PublicClient,
  lastBlock: number,
  lastBlockHash: string,
): Promise<number | null> {
  if (!lastBlockHash || lastBlock === 0) return null;

  try {
    const block = await client.getBlock({ blockNumber: BigInt(lastBlock) });
    if (block.hash === lastBlockHash) return null;

    // Reorg detected — roll back 10 blocks as safety margin
    console.warn(`[Reorg] Detected at block ${lastBlock}, rolling back...`);
    return Math.max(0, lastBlock - 10);
  } catch {
    return null;
  }
}

// ─── Historical sync ───

export async function syncHistorical(client: PublicClient, pairAddress: Address) {
  const state = await getSyncState();
  let fromBlock = BigInt(state.lastBlock) + 1n;
  const latestBlock = await client.getBlockNumber();
  const safeBlock = latestBlock - BigInt(CONFIRMATIONS);

  const forkPoint = await detectReorg(client, state.lastBlock, state.lastBlockHash);
  if (forkPoint !== null) {
    await deleteEventsFromBlock(forkPoint);
    fromBlock = BigInt(forkPoint);
  }

  if (fromBlock > safeBlock) {
    console.log(`Synced to block ${state.lastBlock} (chain head: ${latestBlock})`);
    return;
  }

  console.log(`Syncing ${pairAddress.slice(0, 10)}... from block ${fromBlock} to ${safeBlock}`);

  for (let start = fromBlock; start <= safeBlock; start += BATCH_SIZE) {
    const end = start + BATCH_SIZE - 1n > safeBlock ? safeBlock : start + BATCH_SIZE - 1n;

    const logs = await client.getLogs({
      address: pairAddress,
      events: [SwapEvent, MintEvent, BurnEvent],
      fromBlock: start,
      toBlock: end,
    });

    // Fetch unique block timestamps
    const blockCache = new Map<bigint, { timestamp: number; hash: string }>();
    for (const bn of new Set(logs.map((l) => l.blockNumber))) {
      const block = await client.getBlock({ blockNumber: bn });
      blockCache.set(bn, { timestamp: Number(block.timestamp), hash: block.hash ?? "" });
    }

    for (const log of logs) {
      const bi = blockCache.get(log.blockNumber)!;
      const base = {
        txHash: log.transactionHash,
        logIndex: log.logIndex ?? 0,
        blockNumber: Number(log.blockNumber),
        blockHash: bi.hash,
        timestamp: bi.timestamp,
        pair: pairAddress,
      };

      if (log.eventName === "Swap") {
        await insertSwap({
          ...base,
          sender: log.args.sender!,
          toAddress: log.args.to!,
          amount0In: formatEther(log.args.amount0In!),
          amount1In: formatEther(log.args.amount1In!),
          amount0Out: formatEther(log.args.amount0Out!),
          amount1Out: formatEther(log.args.amount1Out!),
        });
      } else if (log.eventName === "Mint") {
        await insertMint({
          ...base,
          sender: log.args.sender!,
          amount0: formatEther(log.args.amount0!),
          amount1: formatEther(log.args.amount1!),
        });
      } else if (log.eventName === "Burn") {
        await insertBurn({
          ...base,
          sender: log.args.sender!,
          toAddress: log.args.to!,
          amount0: formatEther(log.args.amount0!),
          amount1: formatEther(log.args.amount1!),
        });
      }
    }

    const endBlock = await client.getBlock({ blockNumber: end });
    await setSyncState(Number(end), endBlock.hash ?? "");

    if (logs.length > 0) {
      console.log(`  Block ${start}-${end}: ${logs.length} events`);
    }
  }

  console.log(`Historical sync complete at block ${safeBlock}`);
}

// ─── Real-time watch ───

export function watchEvents(client: PublicClient, pairAddress: Address) {
  console.log(`Watching events for ${pairAddress.slice(0, 10)}...`);

  async function handle(eventName: string, logs: Array<Record<string, unknown>>) {
    for (const log of logs) {
      const blockNumber = log.blockNumber as bigint;
      let timestamp = Math.floor(Date.now() / 1000);
      let blockHash = (log.blockHash as string) ?? "";

      try {
        const block = await client.getBlock({ blockNumber });
        timestamp = Number(block.timestamp);
        blockHash = block.hash ?? blockHash;
      } catch { /* fallback to Date.now() */ }

      const args = log.args as Record<string, unknown>;
      const base = {
        txHash: log.transactionHash as string,
        logIndex: (log.logIndex as number) ?? 0,
        blockNumber: Number(blockNumber),
        blockHash,
        timestamp,
        pair: pairAddress,
      };

      if (eventName === "Swap") {
        const record = {
          ...base,
          sender: args.sender as string,
          toAddress: args.to as string,
          amount0In: formatEther(args.amount0In as bigint),
          amount1In: formatEther(args.amount1In as bigint),
          amount0Out: formatEther(args.amount0Out as bigint),
          amount1Out: formatEther(args.amount1Out as bigint),
        };
        await insertSwap(record);
        broadcast({ type: "swap", data: record });
      } else if (eventName === "Mint") {
        const record = {
          ...base,
          sender: args.sender as string,
          amount0: formatEther(args.amount0 as bigint),
          amount1: formatEther(args.amount1 as bigint),
        };
        await insertMint(record);
        broadcast({ type: "mint", data: record });
      } else if (eventName === "Burn") {
        const record = {
          ...base,
          sender: args.sender as string,
          toAddress: args.to as string,
          amount0: formatEther(args.amount0 as bigint),
          amount1: formatEther(args.amount1 as bigint),
        };
        await insertBurn(record);
        broadcast({ type: "burn", data: record });
      }

      await setSyncState(Number(blockNumber), blockHash);
      console.log(`[${eventName}] block=${blockNumber} tx=${base.txHash.slice(0, 10)}...`);
    }
  }

  client.watchEvent({
    address: pairAddress,
    event: SwapEvent,
    onLogs: (logs) => handle("Swap", logs as never[]),
  });

  client.watchEvent({
    address: pairAddress,
    event: MintEvent,
    onLogs: (logs) => handle("Mint", logs as never[]),
  });

  client.watchEvent({
    address: pairAddress,
    event: BurnEvent,
    onLogs: (logs) => handle("Burn", logs as never[]),
  });
}
