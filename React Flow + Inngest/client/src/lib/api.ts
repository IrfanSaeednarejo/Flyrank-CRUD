import type { Workflow } from "@/schemas/workflow";
import type { NodeError } from "@/schemas/workflow";

const BASE = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

export type TraceEntry = {
    nodeId: string;
    label: string;
    prompt: string;
    decision: "YES" | "NO" | null;
    nextNodeId: string | null;
    startedAt: number;
    finishedAt: number;
    error?: NodeError;
};


export type RunRecord = {
    id: string;
    status: "queued" | "done" | "error";
    trace?: TraceEntry[];
    errors?: NodeError[];
    error?: string;
};

export async function startRun(graph: Workflow, startNodeId: string) {
    const res = await fetch(`${BASE}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph, startNodeId }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
            `Server rejected the run (${res.status}). ${body.slice(0, 200)}`
        );
    }
    return (await res.json()) as { runId: string };
}

export async function getRun(runId: string) {
    const res = await fetch(`${BASE}/api/run/${runId}`);
    if (!res.ok) throw new Error(`poll failed: ${res.status}`);
    return (await res.json()) as RunRecord;
}

export async function pollRun(
    runId: string,
    { intervalMs = 700, timeoutMs = 60_000 } = {}
): Promise<RunRecord> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const rec = await getRun(runId);
        if (rec.status === "done" || rec.status === "error") return rec;
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error("run timed out");
}