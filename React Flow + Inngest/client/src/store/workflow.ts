import { create } from "zustand";
import { persist } from "zustand/middleware";
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
                set({ nodes: [], edges: [], selectedNodeId: null, startNodeId: null }),

            load: ({ nodes, edges }) =>
                set({ nodes, edges, selectedNodeId: null, startNodeId: nodes[0]?.id ?? null }),
        }),
        { name: "workflow-store-v1" }
    )
);