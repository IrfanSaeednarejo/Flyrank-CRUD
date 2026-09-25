import { useWorkflowStore } from "@/store/workflow";
import { cn } from "@/lib/utils";

export function ExecutionLog() {
    const status = useWorkflowStore((s) => s.runStatus);
    const trace = useWorkflowStore((s) => s.runTrace);
    const error = useWorkflowStore((s) => s.runError);
    const runErrors = useWorkflowStore((s) => s.runErrors);

    if (status === "idle") return null;

    return (
        <div className="max-h-64 overflow-auto border-t bg-muted/20 p-3 text-sm">
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
                {runErrors.length > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                        {runErrors.length} error{runErrors.length === 1 ? "" : "s"}
                    </span>
                )}
            </div>

            {error && (
                <div className="mb-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                    {error}
                </div>
            )}

            <ol className="space-y-1">
                {trace.map((t, i) => (
                    <li
                        key={i}
                        className={cn(
                            "flex items-center gap-2 font-mono text-xs",
                            t.error && "text-rose-700"
                        )}
                    >
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="font-semibold">{t.nodeId}</span>
                        <span className="truncate">"{t.prompt || t.label}"</span>

                        {t.error ? (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                {t.error.kind}
                            </span>
                        ) : t.decision ? (
                            <span
                                className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                                    t.decision === "YES" ? "bg-emerald-500" : "bg-rose-500"
                                )}
                            >
                                {t.decision}
                            </span>
                        ) : null}

                        {t.nextNodeId ? (
                            <span className="text-muted-foreground">→ {t.nextNodeId}</span>
                        ) : t.error ? (
                            <span className="truncate text-rose-700">
                                — {t.error.message}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">(terminal)</span>
                        )}
                    </li>
                ))}
            </ol>

            {runErrors.length > 0 && trace.every((t) => !t.error) && (
                <ul className="mt-2 space-y-1 text-xs text-rose-700">
                    {runErrors.map((e, i) => (
                        <li key={i}>
                            <span className="font-semibold">{e.nodeId}</span> · {e.kind} ·{" "}
                            {e.message}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}