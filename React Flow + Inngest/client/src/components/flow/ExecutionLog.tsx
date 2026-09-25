import { useWorkflowStore } from "@/store/workflow";
import { cn } from "@/lib/utils";

export function ExecutionLog() {
    const status = useWorkflowStore((s) => s.runStatus);
    const trace = useWorkflowStore((s) => s.runTrace);
    const error = useWorkflowStore((s) => s.runError);

    if (status === "idle") return null;

    return (
        <div className="max-h-56 overflow-auto border-t bg-muted/20 p-3 text-sm">
            <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold">Execution</span>
                <span
                    className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        status === "running" && "bg-amber-100 text-amber-700",
                        status === "done" && "bg-emerald-100 text-emerald-700",
                        status === "error" && "bg-rose-100 text-rose-700"
                    )}
                >
                    {status}
                </span>
            </div>

            {error && <div className="text-rose-600">{error}</div>}

            <ol className="space-y-1">
                {trace.map((t, i) => (
                    <li key={i} className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="font-semibold">{t.nodeId}</span>
                        <span className="truncate">“{t.prompt || t.label}”</span>
                        {t.decision && (
                            <span
                                className={cn(
                                    "rounded-full px-2 text-[10px] font-bold text-white",
                                    t.decision === "YES" ? "bg-emerald-500" : "bg-rose-500"
                                )}
                            >
                                {t.decision}
                            </span>
                        )}
                        {t.nextNodeId ? (
                            <span className="text-muted-foreground">→ {t.nextNodeId}</span>
                        ) : (
                            <span className="text-muted-foreground">(terminal)</span>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
}