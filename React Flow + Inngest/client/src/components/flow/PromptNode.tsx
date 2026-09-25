import { useWorkflowStore } from "@/store/workflow";
import { cn } from "@/lib/utils";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNode } from "@/schemas/workflow";

export function PromptNode({ id, data, selected }: NodeProps<WorkflowNode["data"]>) {
    const isActive = useWorkflowStore((s) => s.activeNodeIds.includes(id));
    const nodeError = useWorkflowStore((s) => s.nodeErrors?.[id]);
    const retryFromNode = useWorkflowStore((s) => s.retryFromNode);
    const retryingNodeId = useWorkflowStore((s) => s.retryingNodeId);
    const runStatus = useWorkflowStore((s) => s.runStatus);

    const isRetrying = retryingNodeId === id && runStatus === "running";
    const canRetry = !!nodeError && runStatus !== "running";

    return (
        <div
            className={cn(
                "relative min-w-[180px] max-w-[240px] rounded-lg border-2 bg-background px-3 py-2 shadow-sm transition",
                selected ? "border-primary shadow-md" : "border-border",
                isActive && !nodeError && "border-amber-400 ring-2 ring-amber-300/50 shadow-amber-200",
                nodeError && "border-rose-500 ring-2 ring-rose-300/60 shadow-rose-200",
                isRetrying && "animate-pulse"
            )}
        >
            <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-muted-foreground" />

            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {id}
            </div>
            <div className="mt-0.5 text-sm font-medium">{data.label}</div>
            {data.prompt && (
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {data.prompt}
                </div>
            )}

            {/* YES handle */}
            <Handle
                type="source"
                id="YES"
                position={Position.Right}
                className="!h-3 !w-3 !bg-emerald-500"
                style={{ top: "35%" }}
            />
            {/* NO handle */}
            <Handle
                type="source"
                id="NO"
                position={Position.Left}
                className="!h-3 !w-3 !bg-rose-500"
                style={{ top: "35%" }}
            />

            {nodeError && (
                <button
                    type="button"
                    title={
                        canRetry
                            ? `${nodeError.kind}: ${nodeError.message}\n\nClick to retry from this node.`
                            : `${nodeError.kind}: ${nodeError.message}`
                    }
                    disabled={!canRetry}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (canRetry) retryFromNode(id);
                    }}
                    className={cn(
                        "absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow transition",
                        canRetry
                            ? "cursor-pointer bg-rose-500 text-white hover:bg-rose-600 hover:scale-110"
                            : "cursor-not-allowed bg-rose-300 text-white"
                    )}
                >
                    {isRetrying ? "…" : "!"}
                </button>
            )}
        </div>
    );
}