import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "@/schemas/workflow";
import { useWorkflowStore } from "@/store/workflow";



export function PromptNode({ id, data, selected }: NodeProps<WorkflowNode["data"]>) {

    const isActive = useWorkflowStore((s) => s.activeNodeIds.includes(id));
    const nodeError = useWorkflowStore((s) => s.nodeErrors[id]);
    return (
        <div
            className={cn(
                "relative min-w-[180px] max-w-[240px] rounded-lg border-2 bg-background px-3 py-2 shadow-sm transition",
                selected ? "border-primary shadow-md" : "border-border",
                isActive && !nodeError && "border-amber-400 ring-2 ring-amber-300/50 shadow-amber-200",
                nodeError && "border-rose-500 ring-2 ring-rose-300/60 shadow-rose-200"
            )}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!h-2 !w-2 !bg-muted-foreground"
            />

            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {id}
            </div>
            <div className="mt-0.5 text-sm font-medium">{data.label}</div>
            {data.prompt && (
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {data.prompt}
                </div>
            )}


            <Handle
                type="source"
                id="YES"
                position={Position.Right}
                className="!h-3 !w-3 !bg-emerald-500"
                style={{ top: "35%" }}
            />

            <Handle
                type="source"
                id="NO"
                position={Position.Left}
                className="!h-3 !w-3 !bg-rose-500"
                style={{ top: "35%" }}
            />
            {nodeError && (
                <div
                    title={nodeError.message}
                    className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow"
                >
                    !
                </div>
            )}
        </div>
    );
}