import { NonRetriableError } from "inngest";
import { inngest } from "../client";
import { decide } from "../../lib/groq";
import { updateRun } from "../../lib/runs";
import type { Branch, Workflow, WorkflowNode } from "../../schemas/workflow";

export type TraceEntry = {
    nodeId: string;
    label: string;
    prompt: string;
    decision: Branch | null;
    nextNodeId: string | null;
    startedAt: number;
    finishedAt: number;
};

const MAX_STEPS = 50;

export const runWorkflow = inngest.createFunction(
    {
        id: "run-workflow",
        name: "Run AI Workflow",
        retries: 1,
        triggers: { event: "workflow/run" },
    },
    async ({ event, step }) => {
        const { graph, startNodeId, runId } = event.data as {
            graph: Workflow;
            startNodeId: string;
            runId: string;
        };
        try {
            const nodesById = new Map<string, WorkflowNode>(
                graph.nodes.map((n) => [n.id, n])
            );

            const outgoingBySource = new Map<string, typeof graph.edges>();
            for (const e of graph.edges) {
                const arr = outgoingBySource.get(e.source) ?? [];
                arr.push(e);
                outgoingBySource.set(e.source, arr);
            }

            const trace: TraceEntry[] = [];
            let currentId: string | null = startNodeId;

            for (let i = 0; i < MAX_STEPS && currentId; i++) {
                const node = nodesById.get(currentId);
                if (!node) {
                    throw new NonRetriableError(`Node not found: ${currentId}`);
                }

                const startedAt = Date.now();

                const decision: Branch = await step.run(
                    `llm-${node.id}`,
                    async () => decide(node.data.prompt)
                );

                const outgoing = outgoingBySource.get(node.id) ?? [];
                const match = outgoing.find((e) => e.data.branch === decision);
                const nextId = match?.target ?? null;

                const finishedAt = Date.now();

                trace.push({
                    nodeId: node.id,
                    label: node.data.label,
                    prompt: node.data.prompt,
                    decision: nextId ? decision : null,
                    nextNodeId: nextId,
                    startedAt,
                    finishedAt,
                });

                currentId = nextId;
            }

            const result = {
                trace,
                finalNodeId: trace.at(-1)?.nodeId ?? null,
            };

            updateRun(runId, { status: "done", trace: result.trace });
            return result;
        } catch (err) {
            updateRun(runId, {
                status: "error",
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }
);