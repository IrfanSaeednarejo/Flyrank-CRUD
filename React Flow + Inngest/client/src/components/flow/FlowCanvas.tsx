import { useCallback, useMemo } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";

import { useWorkflowStore } from "@/store/workflow";
import { PromptNode } from "./PromptNode";
import { BranchEdge } from "./BranchEdge";

export function FlowCanvas() {
    const nodes = useWorkflowStore((s) => s.nodes);
    const edges = useWorkflowStore((s) => s.edges);
    const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
    const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
    const onConnect = useWorkflowStore((s) => s.onConnect);
    const setSelectedNode = useWorkflowStore((s) => s.setSelectedNode);
    const addNode = useWorkflowStore((s) => s.addNode);

    const nodeTypes = useMemo(() => ({ prompt: PromptNode }), []);
    const edgeTypes = useMemo(() => ({ branch: BranchEdge }), []);

    const onNodeClick: NodeMouseHandler = useCallback(
        (_e, node) => setSelectedNode(node.id),
        [setSelectedNode]
    );

    return (
        <div className="h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={() => setSelectedNode(null)}
                onDoubleClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.classList.contains("react-flow__pane")) {
                        addNode();
                    }
                }}
                fitView
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={16} size={1} />
                <Controls />
                <MiniMap pannable zoomable />
            </ReactFlow>
        </div>
    );
}