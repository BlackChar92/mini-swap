import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Pool statistics: 24h volume, total swap count, fee revenue.
 */
export async function getPoolStats(pair: string) {
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 86400;

  const [totalSwaps, swaps24h, mints24h, burns24h] = await Promise.all([
    prisma.swap.count({ where: { pair } }),
    prisma.swap.findMany({
      where: { pair, timestamp: { gte: oneDayAgo } },
    }),
    prisma.mint.count({
      where: { pair, timestamp: { gte: oneDayAgo } },
    }),
    prisma.burn.count({
      where: { pair, timestamp: { gte: oneDayAgo } },
    }),
  ]);

  // Calculate 24h volume (sum of input amounts)
  let volume0_24h = 0;
  let volume1_24h = 0;
  for (const s of swaps24h) {
    volume0_24h += Number(s.amount0In) + Number(s.amount0Out);
    volume1_24h += Number(s.amount1In) + Number(s.amount1Out);
  }

  // Fee revenue = 0.3% of volume
  const fee0_24h = volume0_24h * 0.003;
  const fee1_24h = volume1_24h * 0.003;

  return {
    totalSwaps,
    swaps24h: swaps24h.length,
    mints24h,
    burns24h,
    volume24h: {
      token0: volume0_24h.toFixed(4),
      token1: volume1_24h.toFixed(4),
    },
    fees24h: {
      token0: fee0_24h.toFixed(4),
      token1: fee1_24h.toFixed(4),
    },
  };
}

/**
 * Price history: average execution price per hour.
 * Returns an array of { timestamp, price } for charting.
 */
export async function getPriceHistory(pair: string, hours: number = 24) {
  const now = Math.floor(Date.now() / 1000);
  const since = now - hours * 3600;

  const swaps = await prisma.swap.findMany({
    where: { pair, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
  });

  // Group by hour and compute average price
  const buckets = new Map<number, { totalIn: number; totalOut: number; count: number }>();

  for (const s of swaps) {
    const hourTs = Math.floor(s.timestamp / 3600) * 3600;
    const bucket = buckets.get(hourTs) ?? { totalIn: 0, totalOut: 0, count: 0 };

    // Determine direction: token0 → token1 or vice versa
    const in0 = Number(s.amount0In);
    const out1 = Number(s.amount1Out);
    if (in0 > 0 && out1 > 0) {
      bucket.totalIn += in0;
      bucket.totalOut += out1;
      bucket.count++;
    } else {
      const in1 = Number(s.amount1In);
      const out0 = Number(s.amount0Out);
      if (in1 > 0 && out0 > 0) {
        // Inverse: price = in1 / out0 → token0 price in token1
        bucket.totalIn += out0;
        bucket.totalOut += in1;
        bucket.count++;
      }
    }

    buckets.set(hourTs, bucket);
  }

  const history: { timestamp: number; price: number; volume: number; swaps: number }[] = [];
  for (const [ts, b] of buckets) {
    if (b.totalIn > 0) {
      history.push({
        timestamp: ts,
        price: b.totalOut / b.totalIn, // token0 price in token1
        volume: b.totalIn + b.totalOut,
        swaps: b.count,
      });
    }
  }

  return history;
}

/**
 * User positions: LP-related activity for a specific address.
 */
export async function getUserActivity(address: string, limit: number = 50) {
  const [swaps, mints, burns] = await Promise.all([
    prisma.swap.findMany({
      where: {
        OR: [{ sender: address }, { toAddress: address }],
      },
      orderBy: { blockNumber: "desc" },
      take: limit,
    }),
    prisma.mint.findMany({
      where: { sender: address },
      orderBy: { blockNumber: "desc" },
      take: limit,
    }),
    prisma.burn.findMany({
      where: { sender: address },
      orderBy: { blockNumber: "desc" },
      take: limit,
    }),
  ]);

  return {
    swaps: swaps.length,
    mints: mints.length,
    burns: burns.length,
    totalVolume: swaps.reduce(
      (acc, s) => acc + Number(s.amount0In) + Number(s.amount1In),
      0,
    ).toFixed(4),
    history: [
      ...swaps.map((s) => ({ ...s, type: "swap" as const })),
      ...mints.map((m) => ({ ...m, type: "mint" as const })),
      ...burns.map((b) => ({ ...b, type: "burn" as const })),
    ]
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, limit),
  };
}
