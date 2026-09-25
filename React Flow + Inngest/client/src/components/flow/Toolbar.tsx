import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/workflow";
import { downloadWorkflow, readWorkflowFile } from "@/lib/workflowFile";

export function Toolbar() {
    const addNode = useWorkflowStore((s) => s.addNode);
    const clear = useWorkflowStore((s) => s.clear);
    const nodeCount = useWorkflowStore((s) => s.nodes.length);
    const startNodeId = useWorkflowStore((s) => s.startNodeId);
    const runWorkflow = useWorkflowStore((s) => s.runWorkflow);
    const runStatus = useWorkflowStore((s) => s.runStatus);
    const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);

    const canRun = !!startNodeId && nodeCount > 0 && runStatus !== "running";
    const canExport = nodeCount > 0;

    const handleExport = () => {
        const { nodes, edges, startNodeId } = useWorkflowStore.getState();
        downloadWorkflow({ nodes, edges, startNodeId });
    };

    const handleImportClick = () => {
        setImportError(null);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-importing the same file
        if (!file) return;

        try {
            const workflow = await readWorkflowFile(file);
            loadWorkflow(workflow);
        } catch (err) {
            setImportError(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <div className="flex items-center justify-between border-b bg-background px-4 py-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Visual AI Workflow</span>
                <span className="text-xs text-muted-foreground">
                    ({nodeCount} node{nodeCount === 1 ? "" : "s"})
                </span>
                {importError && (
                    <span className="ml-3 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                        Import failed: {importError}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => addNode()}>
                    + Add Node
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExport}
                    disabled={!canExport}
                >
                    Export
                </Button>

                <Button size="sm" variant="outline" onClick={handleImportClick}>
                    Import
                </Button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleFileChange}
                />

                <Button
                    size="sm"
                    variant="secondary"
                    disabled={!canRun}
                    onClick={() => runWorkflow()}
                >
                    {runStatus === "running" ? "Running…" : "▶ Run"}
                </Button>

                <Button size="sm" variant="outline" onClick={clear}>
                    Clear
                </Button>
            </div>
        </div>
    );
}