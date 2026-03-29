import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log(`[WS] Client connected (total: ${wss.clients.size})`);
    ws.send(JSON.stringify({ type: "connected", message: "MiniSwap Indexer" }));

    ws.on("close", () => {
      console.log(`[WS] Client disconnected (total: ${wss.clients.size})`);
    });
  });
}

export function broadcast(message: unknown) {
  if (!wss) return;
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
