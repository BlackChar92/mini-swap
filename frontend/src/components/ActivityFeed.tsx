"use client";

import { useActivity, type Activity } from "@/hooks/useActivity";

function shortenHash(hash: string) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

function ActivityRow({ item }: { item: Activity }) {
  if (item.type === "swap") {
    const isAtoB = Number(item.amount0In) > 0;
    const amountIn = isAtoB ? item.amount0In : item.amount1In;
    const amountOut = isAtoB ? item.amount1Out : item.amount0Out;
    const tokenIn = isAtoB ? "TKA" : "TKB";
    const tokenOut = isAtoB ? "TKB" : "TKA";

    return (
      <tr className="border-b border-gray-800">
        <td className="py-2 px-3">
          <span className="px-2 py-0.5 bg-blue-900 text-blue-300 rounded text-xs font-medium">
            Swap
          </span>
        </td>
        <td className="py-2 px-3 text-sm text-gray-300">
          {Number(amountIn).toFixed(4)} {tokenIn} → {Number(amountOut).toFixed(4)} {tokenOut}
        </td>
        <td className="py-2 px-3 text-sm text-gray-500">{shortenAddress(item.sender)}</td>
        <td className="py-2 px-3 text-sm text-gray-500">{formatTime(item.timestamp)}</td>
        <td className="py-2 px-3 text-sm text-gray-500">{shortenHash(item.txHash)}</td>
      </tr>
    );
  }

  if (item.type === "mint") {
    return (
      <tr className="border-b border-gray-800">
        <td className="py-2 px-3">
          <span className="px-2 py-0.5 bg-green-900 text-green-300 rounded text-xs font-medium">
            Add
          </span>
        </td>
        <td className="py-2 px-3 text-sm text-gray-300">
          {Number(item.amount0).toFixed(4)} TKA + {Number(item.amount1).toFixed(4)} TKB
        </td>
        <td className="py-2 px-3 text-sm text-gray-500">{shortenAddress(item.sender)}</td>
        <td className="py-2 px-3 text-sm text-gray-500">{formatTime(item.timestamp)}</td>
        <td className="py-2 px-3 text-sm text-gray-500">{shortenHash(item.txHash)}</td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-800">
      <td className="py-2 px-3">
        <span className="px-2 py-0.5 bg-red-900 text-red-300 rounded text-xs font-medium">
          Remove
        </span>
      </td>
      <td className="py-2 px-3 text-sm text-gray-300">
        {Number(item.amount0).toFixed(4)} TKA + {Number(item.amount1).toFixed(4)} TKB
      </td>
      <td className="py-2 px-3 text-sm text-gray-500">{shortenAddress(item.sender)}</td>
      <td className="py-2 px-3 text-sm text-gray-500">{formatTime(item.timestamp)}</td>
      <td className="py-2 px-3 text-sm text-gray-500">{shortenHash(item.txHash)}</td>
    </tr>
  );
}

export function ActivityFeed() {
  const { data: activities, isLoading, error } = useActivity();

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
      </div>

      {isLoading && (
        <p className="p-6 text-gray-500 text-sm">Loading...</p>
      )}

      {error && (
        <p className="p-6 text-gray-500 text-sm">
          Indexer not running. Start it with: cd indexer && pnpm dev
        </p>
      )}

      {activities && activities.length === 0 && (
        <p className="p-6 text-gray-500 text-sm">No activity yet</p>
      )}

      {activities && activities.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Details</th>
              <th className="py-2 px-3 font-medium">Account</th>
              <th className="py-2 px-3 font-medium">Time</th>
              <th className="py-2 px-3 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((item) => (
              <ActivityRow key={`${item.type}-${item.txHash}-${item.id}`} item={item} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
