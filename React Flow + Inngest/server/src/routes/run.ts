import { Router } from "express";
import { randomUUID } from "crypto";
import { inngest } from "../inngest/client";
import { RunRequestSchema } from "../schemas/workflow";
import { createRun, getRun } from "../lib/runs";

export const runRouter = Router();

runRouter.post("/run", async (req, res) => {
    const parsed = RunRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { graph, startNodeId } = parsed.data;
    const runId = randomUUID();
    createRun(runId);

    await inngest.send({
        name: "workflow/run",
        data: { graph, startNodeId, runId },
    });

    res.json({ runId });
});

runRouter.get("/run/:runId", (req, res) => {
    const rec = getRun(req.params.runId);
    if (!rec) return res.status(404).json({ error: "run not found" });
    res.json(rec);
});