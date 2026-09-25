import { create } from "zustand";
import { persist } from "zustand/middleware";
import { startRun, pollRun, type TraceEntry } from "@/lib/api";

import {
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    type Connection,
    type EdgeChange,
    type NodeChange,
} from "reactflow";
import type {
    Branch,
    WorkflowEdge,
    WorkflowNode,
} from "@/schemas/workflow";

type WorkflowState = {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    selectedNodeId: string | null;
    startNodeId: string | null;
    // add these to the state type
    runStatus: "idle" | "running" | "done" | "error";
    runTrace: TraceEntry[];
    runError: string | null;
    activeEdgeIds: string[];
    activeNodeIds: string[];
    runWorkflow: () => Promise<void>;
    clearRun: () => void;

    // flow handlers
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (conn: Connection) => void;

    // node ops
    addNode: (position?: { x: number; y: number }) => void;
    updateNodeData: (id: string, patch: Partial<WorkflowNode["data"]>) => void;
    deleteNode: (id: string) => void;

    // selection
    setSelectedNode: (id: string | null) => void;
    setStartNode: (id: string | null) => void;

    // utility
    clear: () => void;
    load: (data: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
};

let nodeCounter = 1;

export const useWorkflowStore = create<WorkflowState>()(
    persist(
        (set, get) => ({
            nodes: [],
            edges: [],
            selectedNodeId: null,
            startNodeId: null,
            runStatus: "idle",
            runTrace: [],
            runError: null,
            activeEdgeIds: [],
            activeNodeIds: [],
            clearRun: () =>
                set({ runStatus: "idle", runTrace: [], runError: null, activeEdgeIds: [], activeNodeIds: [] }),

            runWorkflow: async () => {
                const { nodes, edges, startNodeId } = get();
                if (!startNodeId) {
                    set({ runError: "No start node set." });
                    return;
                }

                set({ runStatus: "running", runTrace: [], runError: null, activeEdgeIds: [], activeNodeIds: [] });

                try {
                    const graph = { nodes, edges, startNodeId };
                    const { runId } = await startRun(graph, startNodeId);
                    const result = await pollRun(runId);

                    if (result.status === "error") {
                        set({ runStatus: "error", runError: result.error ?? "unknown error" });
                        return;
                    }

                    const trace = result.trace ?? [];
                    const activeNodeIds = trace.map((t) => t.nodeId);

                    const activeEdgeIds: string[] = [];
                    for (const t of trace) {
                        if (!t.nextNodeId || !t.decision) continue;
                        const edge = edges.find(
                            (e) =>
                                e.source === t.nodeId &&
                                e.target === t.nextNodeId &&
                                e.data.branch === t.decision
                        );
                        if (edge) activeEdgeIds.push(edge.id);
                    }

                    set({
                        runStatus: "done",
                        runTrace: trace,
                        activeNodeIds,
                        activeEdgeIds,
                    });
                } catch (err) {
                    set({
                        runStatus: "error",
                        runError: err instanceof Error ? err.message : String(err),
                    });
                }
            },

            onNodesChange: (changes) =>
                set({ nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[] }),

            onEdgesChange: (changes) =>
                set({ edges: applyEdgeChanges(changes, get().edges) as WorkflowEdge[] }),

            onConnect: (conn) => {
                if (!conn.source || !conn.target) return;
                if (conn.source === conn.target) return;

                const branch = (conn.sourceHandle as Branch | null) ?? "YES";
                const { edges } = get();

                // remove any existing edge from this source with same branch
                const filtered = edges.filter(
                    (e) => !(e.source === conn.source && e.data?.branch === branch)
                );

                const newEdge: WorkflowEdge = {
                    id: `e-${conn.source}-${conn.target}-${branch}`,
                    source: conn.source,
                    target: conn.target,
                    type: "branch",
                    sourceHandle: branch,
                    data: { branch },
                };

                set({ edges: addEdge(newEdge, filtered) as WorkflowEdge[] });
            },

            addNode: (position) => {
                const id = `n${nodeCounter++}`;
                const node: WorkflowNode = {
                    id,
                    type: "prompt",
                    position: position ?? {
                        x: 100 + Math.random() * 400,
                        y: 100 + Math.random() * 300,
                    },
                    data: { label: `Node ${id}`, prompt: "" },
                };
                set({
                    nodes: [...get().nodes, node],
                    selectedNodeId: id,
                    startNodeId: get().startNodeId ?? id,
                });
            },

            updateNodeData: (id, patch) =>
                set({
                    nodes: get().nodes.map((n) =>
                        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
                    ),
                }),

            deleteNode: (id) =>
                set({
                    nodes: get().nodes.filter((n) => n.id !== id),
                    edges: get().edges.filter((e) => e.source !== id && e.target !== id),
                    selectedNodeId:
                        get().selectedNodeId === id ? null : get().selectedNodeId,
                    startNodeId: get().startNodeId === id ? null : get().startNodeId,
                }),

            setSelectedNode: (id) => set({ selectedNodeId: id }),
            setStartNode: (id) => set({ startNodeId: id }),

            clear: () =>
                set({
                    nodes: [], edges: [], selectedNodeId: null, startNodeId: null,
                    runStatus: "idle", runTrace: [], runError: null,
                    activeEdgeIds: [], activeNodeIds: [],
                }),

            load: ({ nodes, edges }) =>
                set({ nodes, edges, selectedNodeId: null, startNodeId: nodes[0]?.id ?? null }),
        }),
        { name: "workflow-store-v1" }
    )
);