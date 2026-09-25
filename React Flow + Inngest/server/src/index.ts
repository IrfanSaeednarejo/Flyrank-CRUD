import "dotenv/config";
import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/client.js";
import { healthRouter } from "./routes/health.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ?? "*" }));
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api/inngest", serve({ client: inngest, functions }));

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
