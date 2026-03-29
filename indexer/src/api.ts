import express from "express";
import cors from "cors";
import { getRecentSwaps, getRecentMints, getRecentBurns, getSwapsByAddress } from "./db.js";

const app = express();
app.use(cors());

app.get("/api/swaps", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(getRecentSwaps(limit));
});

app.get("/api/mints", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(getRecentMints(limit));
});

app.get("/api/burns", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(getRecentBurns(limit));
});

app.get("/api/swaps/:address", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(getSwapsByAddress(req.params.address, limit));
});

app.get("/api/activity", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const swaps = getRecentSwaps(limit);
  const mints = getRecentMints(limit);
  const burns = getRecentBurns(limit);

  const activity = [
    ...swaps.map((s) => ({ ...s, type: "swap" as const })),
    ...mints.map((m) => ({ ...m, type: "mint" as const })),
    ...burns.map((b) => ({ ...b, type: "burn" as const })),
  ].sort((a, b) => b.block_number - a.block_number)
    .slice(0, limit);

  res.json(activity);
});

export default app;
