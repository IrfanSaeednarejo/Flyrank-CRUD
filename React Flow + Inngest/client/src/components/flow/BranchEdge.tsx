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
    const isActive = useWorkflowStore((s) => s.activeEdgeIds.includes(id));
    const runStatus = useWorkflowStore((s) => s.runStatus);

    const [path, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isYes = data?.branch === "YES";
    const color = isYes ? "#10b981" : "#f43f5e";

    return (
        <>
            {/* subtle shadow pass behind the active edge for glow */}
            {isActive && (
                <BaseEdge
                    path={path}
                    style={{
                        stroke: color,
                        strokeWidth: 8,
                        opacity: 0.25,
                        filter: "blur(2px)",
                    }}
                />
            )}

            <BaseEdge
                path={path}
                markerEnd={markerEnd}
                style={{
                    stroke: color,
                    strokeWidth: isActive ? 3 : 2,
                    strokeDasharray: isActive ? "6 6" : undefined,
                    animation: isActive ? "flow-dash 0.6s linear infinite" : undefined,
                    transition: "stroke-width 150ms ease",
                    opacity: isActive ? 1 : runStatus === "idle" ? 1 : 0.35,
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
                        "rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm transition",
                        isYes ? "bg-emerald-500" : "bg-rose-500",
                        isActive && "ring-2 ring-offset-1",
                        isActive && (isYes ? "ring-emerald-300" : "ring-rose-300")
                    )}
                >
                    {data?.branch}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}