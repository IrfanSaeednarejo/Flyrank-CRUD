import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from "reactflow";
import { cn } from "@/lib/utils";
import type { Branch } from "@/schemas/workflow";
import { useWorkflowStore } from "@/store/workflow";


export function BranchEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
}: EdgeProps<{ branch: Branch }>) {
    const [path, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    const isActive = useWorkflowStore((s) => s.activeEdgeIds.includes(id));

    const isYes = data?.branch === "YES";

    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                markerEnd={markerEnd}
                style={{
                    stroke: isYes ? "#10b981" : "#f43f5e",
                    strokeWidth: isActive ? 3 : 2,
                    strokeDasharray: isActive ? "6 4" : undefined,
                    animation: isActive ? "dash 0.6s linear infinite" : undefined,
                }}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: "absolute",
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: "all",
                    }}
                    className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                        isYes ? "bg-emerald-500" : "bg-rose-500"
                    )}
                >
                    {data?.branch}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}