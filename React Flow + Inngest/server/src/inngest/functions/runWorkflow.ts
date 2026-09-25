import { NonRetriableError } from "inngest";
import { inngest } from "../client";
import { decide, GroqDecideError } from "../../lib/groq";
import { updateRun } from "../../lib/runs";
import type {
    Branch,
    NodeError,
    Workflow,
    WorkflowNode,
} from "../../schemas/workflow";

export type TraceEntry = {
    nodeId: string;
    label: string;
    prompt: string;
    decision: Branch | null;
    nextNodeId: string | null;
    startedAt: number;
    finishedAt: number;
    error?: NodeError;
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

        const errors: NodeError[] = [];

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
            let steps = 0;

            for (; steps < MAX_STEPS && currentId; steps++) {
                const node = nodesById.get(currentId);
                if (!node) {
                    const err: NodeError = {
                        nodeId: currentId,
                        kind: "node-not-found",
                        message: `Node "${currentId}" is referenced but doesn't exist in the graph.`,
                        at: Date.now(),
                    };
                    errors.push(err);
                    trace.push({
                        nodeId: currentId,
                        label: currentId,
                        prompt: "",
                        decision: null,
                        nextNodeId: null,
                        startedAt: Date.now(),
                        finishedAt: Date.now(),
                        error: err,
                    });
                    throw new NonRetriableError(err.message);
                }

                const startedAt = Date.now();

                let decision: Branch;
                try {
                    decision = await step.run(`llm-${node.id}`, async () =>
                        decide(node.data.prompt)
                    );
                } catch (err) {
                    const nodeError: NodeError = toNodeError(node.id, err);
                    errors.push(nodeError);
                    trace.push({
                        nodeId: node.id,
                        label: node.data.label,
                        prompt: node.data.prompt,
                        decision: null,
                        nextNodeId: null,
                        startedAt,
                        finishedAt: Date.now(),
                        error: nodeError,
                    });
                    throw new NonRetriableError(
                        `LLM failed at node ${node.id}: ${nodeError.message}`
                    );
                }

                const outgoing = outgoingBySource.get(node.id) ?? [];
                const match = outgoing.find((e) => e.data.branch === decision);
                const nextId = match?.target ?? null;

                trace.push({
                    nodeId: node.id,
                    label: node.data.label,
                    prompt: node.data.prompt,
                    decision: nextId ? decision : null,
                    nextNodeId: nextId,
                    startedAt,
                    finishedAt: Date.now(),
                });

                currentId = nextId;
            }

            if (steps >= MAX_STEPS) {
                const err: NodeError = {
                    nodeId: currentId ?? "?",
                    kind: "max-steps-exceeded",
                    message: `Workflow exceeded ${MAX_STEPS} steps — possible cycle.`,
                    at: Date.now(),
                };
                errors.push(err);
            }

            const result = {
                trace,
                finalNodeId: trace.at(-1)?.nodeId ?? null,
                errors,
            };
            updateRun(runId, { status: "done", trace: result.trace, errors });
            return result;
        } catch (err) {
            const message =
                err instanceof Error ? err.message : String(err);
            // If the error wasn't already captured, add a generic one.
            if (errors.length === 0) {
                errors.push({
                    nodeId: "?",
                    kind: "unknown",
                    message,
                    at: Date.now(),
                });
            }
            updateRun(runId, { status: "error", error: message, errors });
            throw err;
        }
    }
);

function toNodeError(nodeId: string, err: unknown): NodeError {
    if (err instanceof GroqDecideError) {
        return {
            nodeId,
            kind: err.kind,
            message: err.message,
            at: Date.now(),
        };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { nodeId, kind: "unknown", message, at: Date.now() };
}