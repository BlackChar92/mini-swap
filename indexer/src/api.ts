import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import activityRoutes from "./routes/activity.js";
import statsRoutes from "./routes/stats.js";

const app = express();

// ─── Middleware ───

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
}));

app.use(rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  limit: 120,            // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
}));

// ─── Routes ───

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

app.use("/api", activityRoutes);
app.use("/api", statsRoutes);

// ─── Error handling ───

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  console.error("[API Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
