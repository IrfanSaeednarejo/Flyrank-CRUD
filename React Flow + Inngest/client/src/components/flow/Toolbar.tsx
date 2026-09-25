import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/workflow";

export function Toolbar() {
    const addNode = useWorkflowStore((s) => s.addNode);
    const clear = useWorkflowStore((s) => s.clear);
    const nodeCount = useWorkflowStore((s) => s.nodes.length);
    const startNodeId = useWorkflowStore((s) => s.startNodeId);
    const runWorkflow = useWorkflowStore((s) => s.runWorkflow);
    const runStatus = useWorkflowStore((s) => s.runStatus);

    const canRun = !!startNodeId && nodeCount > 0 && runStatus !== "running";

    return (
        <div className="flex items-center justify-between border-b bg-background px-4 py-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Visual AI Workflow</span>
                <span className="text-xs text-muted-foreground">
                    ({nodeCount} node{nodeCount === 1 ? "" : "s"})
                </span>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => addNode()}>+ Add Node</Button>
                <Button
                    size="sm"
                    variant="secondary"
                    disabled={!canRun}
                    onClick={() => runWorkflow()}
                >
                    {runStatus === "running" ? "Running…" : "▶ Run"}
                </Button>
                <Button size="sm" variant="outline" onClick={clear}>Clear</Button>
            </div>
        </div>
    );
}