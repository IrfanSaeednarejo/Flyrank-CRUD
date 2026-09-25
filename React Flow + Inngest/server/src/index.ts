import "dotenv/config";
import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import { functions } from "./inngest/functions";
import { healthRouter } from "./routes/health";
import { runRouter } from "./routes/run";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ?? "*" }));
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", runRouter);
app.use("/api/inngest", serve({ client: inngest, functions }));

const port = Number(process.env.PORT ?? 3001);

app.listen(port, "0.0.0.0", () => {
  console.log(`[server] listening on http://localhost:${port}`);
});