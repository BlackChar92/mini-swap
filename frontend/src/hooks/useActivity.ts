import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:3001";
const WS_URL = process.env.NEXT_PUBLIC_INDEXER_WS_URL || "ws://localhost:3001/ws";

export interface Activity {
  id: number;
  type: "swap" | "mint" | "burn";
  txHash: string;
  blockNumber: number;
  timestamp: number;
  sender: string;
  toAddress?: string;
  amount0In?: string;
  amount1In?: string;
  amount0Out?: string;
  amount1Out?: string;
  amount0?: string;
  amount1?: string;
}

async function fetchActivity(limit: number): Promise<Activity[]> {
  const res = await fetch(`${INDEXER_URL}/api/activity?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export function useActivity(limit = 20) {
  const queryClient = useQueryClient();

  // WebSocket: invalidate query on new events (replaces 5s polling)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "swap" || msg.type === "mint" || msg.type === "burn") {
            queryClient.invalidateQueries({ queryKey: ["activity"] });
          }
        };
        ws.onclose = () => {
          // Reconnect after 3 seconds
          reconnectTimer = setTimeout(connect, 3000);
        };
        ws.onerror = () => ws?.close();
      } catch {
        // WebSocket not available, will fallback to polling
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["activity", limit],
    queryFn: () => fetchActivity(limit),
    // Fallback polling if WebSocket is down
    refetchInterval: 10000,
  });
}
