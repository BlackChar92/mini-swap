import { type PublicClient, type Address, formatEther } from "viem";
import { SwapEvent, MintEvent, BurnEvent } from "./events.js";
import {
  insertSwap,
  insertMint,
  insertBurn,
  getLastBlock,
  setLastBlock,
} from "./db.js";

const BATCH_SIZE = 1000n;

export async function syncHistorical(client: PublicClient, pairAddress: Address) {
  const fromBlock = getLastBlock() + 1n;
  const latestBlock = await client.getBlockNumber();

  if (fromBlock > latestBlock) {
    console.log(`Already synced to block ${latestBlock}`);
    return;
  }

  console.log(`Syncing from block ${fromBlock} to ${latestBlock}...`);

  for (let start = fromBlock; start <= latestBlock; start += BATCH_SIZE) {
    const end = start + BATCH_SIZE - 1n > latestBlock ? latestBlock : start + BATCH_SIZE - 1n;

    const [swapLogs, mintLogs, burnLogs] = await Promise.all([
      client.getLogs({ address: pairAddress, event: SwapEvent, fromBlock: start, toBlock: end }),
      client.getLogs({ address: pairAddress, event: MintEvent, fromBlock: start, toBlock: end }),
      client.getLogs({ address: pairAddress, event: BurnEvent, fromBlock: start, toBlock: end }),
    ]);

    const blocks = new Map<bigint, bigint>();
    const allLogs = [...swapLogs, ...mintLogs, ...burnLogs];
    for (const log of allLogs) {
      if (!blocks.has(log.blockNumber)) {
        const block = await client.getBlock({ blockNumber: log.blockNumber });
        blocks.set(log.blockNumber, block.timestamp);
      }
    }

    for (const log of swapLogs) {
      insertSwap({
        tx_hash: log.transactionHash,
        block_number: Number(log.blockNumber),
        timestamp: Number(blocks.get(log.blockNumber) ?? 0n),
        sender: log.args.sender!,
        to_address: log.args.to!,
        amount0_in: formatEther(log.args.amount0In!),
        amount1_in: formatEther(log.args.amount1In!),
        amount0_out: formatEther(log.args.amount0Out!),
        amount1_out: formatEther(log.args.amount1Out!),
        pair: pairAddress,
      });
    }

    for (const log of mintLogs) {
      insertMint({
        tx_hash: log.transactionHash,
        block_number: Number(log.blockNumber),
        timestamp: Number(blocks.get(log.blockNumber) ?? 0n),
        sender: log.args.sender!,
        amount0: formatEther(log.args.amount0!),
        amount1: formatEther(log.args.amount1!),
        pair: pairAddress,
      });
    }

    for (const log of burnLogs) {
      insertBurn({
        tx_hash: log.transactionHash,
        block_number: Number(log.blockNumber),
        timestamp: Number(blocks.get(log.blockNumber) ?? 0n),
        sender: log.args.sender!,
        to_address: log.args.to!,
        amount0: formatEther(log.args.amount0!),
        amount1: formatEther(log.args.amount1!),
        pair: pairAddress,
      });
    }

    setLastBlock(Number(end));

    const total = swapLogs.length + mintLogs.length + burnLogs.length;
    if (total > 0) {
      console.log(`Block ${start}-${end}: indexed ${total} events`);
    }
  }

  console.log(`Historical sync complete at block ${latestBlock}`);
}

export function watchEvents(client: PublicClient, pairAddress: Address) {
  console.log("Watching for new events...");

  client.watchEvent({
    address: pairAddress,
    event: SwapEvent,
    onLogs: (logs) => {
      for (const log of logs) {
        insertSwap({
          tx_hash: log.transactionHash,
          block_number: Number(log.blockNumber),
          timestamp: Math.floor(Date.now() / 1000),
          sender: log.args.sender!,
          to_address: log.args.to!,
          amount0_in: formatEther(log.args.amount0In!),
          amount1_in: formatEther(log.args.amount1In!),
          amount0_out: formatEther(log.args.amount0Out!),
          amount1_out: formatEther(log.args.amount1Out!),
          pair: pairAddress,
        });
        setLastBlock(Number(log.blockNumber));
        console.log(`[Swap] ${log.transactionHash}`);
      }
    },
  });

  client.watchEvent({
    address: pairAddress,
    event: MintEvent,
    onLogs: (logs) => {
      for (const log of logs) {
        insertMint({
          tx_hash: log.transactionHash,
          block_number: Number(log.blockNumber),
          timestamp: Math.floor(Date.now() / 1000),
          sender: log.args.sender!,
          amount0: formatEther(log.args.amount0!),
          amount1: formatEther(log.args.amount1!),
          pair: pairAddress,
        });
        setLastBlock(Number(log.blockNumber));
        console.log(`[Mint] ${log.transactionHash}`);
      }
    },
  });

  client.watchEvent({
    address: pairAddress,
    event: BurnEvent,
    onLogs: (logs) => {
      for (const log of logs) {
        insertBurn({
          tx_hash: log.transactionHash,
          block_number: Number(log.blockNumber),
          timestamp: Math.floor(Date.now() / 1000),
          sender: log.args.sender!,
          to_address: log.args.to!,
          amount0: formatEther(log.args.amount0!),
          amount1: formatEther(log.args.amount1!),
          pair: pairAddress,
        });
        setLastBlock(Number(log.blockNumber));
        console.log(`[Burn] ${log.transactionHash}`);
      }
    },
  });
}
