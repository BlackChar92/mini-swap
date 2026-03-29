import { Router } from "express";
import { z } from "zod";
import {
  getRecentActivity,
  getRecentSwaps,
  getRecentMints,
  getRecentBurns,
  getSwapsByAddress,
} from "../services/event.service.js";

const router = Router();

// ─── Validation schemas ───

const limitSchema = z.coerce.number().int().min(1).max(200).default(20);
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

// ─── Routes ───

router.get("/activity", async (req, res) => {
  const limit = limitSchema.parse(req.query.limit);
  const data = await getRecentActivity(limit);
  res.json(data);
});

router.get("/swaps", async (req, res) => {
  const limit = limitSchema.parse(req.query.limit);
  res.json(await getRecentSwaps(limit));
});

router.get("/mints", async (req, res) => {
  const limit = limitSchema.parse(req.query.limit);
  res.json(await getRecentMints(limit));
});

router.get("/burns", async (req, res) => {
  const limit = limitSchema.parse(req.query.limit);
  res.json(await getRecentBurns(limit));
});

router.get("/swaps/:address", async (req, res) => {
  const address = addressSchema.parse(req.params.address);
  const limit = limitSchema.parse(req.query.limit);
  res.json(await getSwapsByAddress(address, limit));
});

export default router;
