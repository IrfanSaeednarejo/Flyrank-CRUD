import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from "reactflow";
import { cn } from "@/lib/utils";
import type { Branch } from "@/schemas/workflow";

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

    const isYes = data?.branch === "YES";

    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                markerEnd={markerEnd}
                style={{
                    stroke: isYes ? "#10b981" : "#f43f5e",
                    strokeWidth: 2,
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