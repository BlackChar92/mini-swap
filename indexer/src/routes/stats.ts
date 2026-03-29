import { Router } from "express";
import { z } from "zod";
import { getPoolStats, getPriceHistory, getUserActivity } from "../services/pair.service.js";

const router = Router();

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");
const hoursSchema = z.coerce.number().int().min(1).max(720).default(24);

router.get("/stats/:pair", async (req, res) => {
  const pair = addressSchema.parse(req.params.pair);
  res.json(await getPoolStats(pair));
});

router.get("/price/:pair", async (req, res) => {
  const pair = addressSchema.parse(req.params.pair);
  const hours = hoursSchema.parse(req.query.hours);
  res.json(await getPriceHistory(pair, hours));
});

router.get("/user/:address", async (req, res) => {
  const address = addressSchema.parse(req.params.address);
  res.json(await getUserActivity(address));
});

export default router;
