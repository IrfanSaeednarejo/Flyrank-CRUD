import { useWorkflowStore } from "@/store/workflow";
import { Button } from "@/components/ui/button";

export function Inspector() {
    const selectedId = useWorkflowStore((s) => s.selectedNodeId);
    const node = useWorkflowStore((s) =>
        s.nodes.find((n) => n.id === s.selectedNodeId)
    );
    const update = useWorkflowStore((s) => s.updateNodeData);
    const remove = useWorkflowStore((s) => s.deleteNode);
    const startId = useWorkflowStore((s) => s.startNodeId);
    const setStart = useWorkflowStore((s) => s.setStartNode);

    if (!selectedId || !node) {
        return (
            <div className="flex h-full w-80 items-center justify-center border-l bg-muted/30 p-4 text-sm text-muted-foreground">
                Select a node to edit it.
            </div>
        );
    }

    const isStart = startId === node.id;

    return (
        <div className="flex h-full w-80 flex-col gap-4 border-l bg-background p-4">
            <div>
                <div className="text-xs uppercase text-muted-foreground">Node ID</div>
                <div className="font-mono text-sm">{node.id}</div>
            </div>

            <label className="flex flex-col gap-1">
                <span className="text-xs uppercase text-muted-foreground">Label</span>
                <input
                    value={node.data.label}
                    onChange={(e) => update(node.id, { label: e.target.value })}
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                />
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-xs uppercase text-muted-foreground">
                    AI Prompt (must answer YES or NO)
                </span>
                <textarea
                    value={node.data.prompt}
                    onChange={(e) => update(node.id, { prompt: e.target.value })}
                    rows={5}
                    placeholder="e.g. Is this a support request?"
                    className="resize-none rounded-md border bg-background px-2 py-1 text-sm"
                />
            </label>

            <div className="flex items-center gap-2">
                <Button
                    variant={isStart ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStart(node.id)}
                >
                    {isStart ? "Start node ✓" : "Set as start"}
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(node.id)}
                >
                    Delete
                </Button>
            </div>
        </div>
    );
}