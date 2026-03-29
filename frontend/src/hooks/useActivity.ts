import { useQuery } from "@tanstack/react-query";

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:3001";

export interface Activity {
  id: number;
  type: "swap" | "mint" | "burn";
  tx_hash: string;
  block_number: number;
  timestamp: number;
  sender: string;
  to_address?: string;
  amount0_in?: string;
  amount1_in?: string;
  amount0_out?: string;
  amount1_out?: string;
  amount0?: string;
  amount1?: string;
}

async function fetchActivity(limit: number): Promise<Activity[]> {
  const res = await fetch(`${INDEXER_URL}/api/activity?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export function useActivity(limit = 20) {
  return useQuery({
    queryKey: ["activity", limit],
    queryFn: () => fetchActivity(limit),
    refetchInterval: 5000,
  });
}
