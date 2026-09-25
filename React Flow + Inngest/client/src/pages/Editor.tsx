import { ReactFlowProvider } from "reactflow";
import { Toolbar } from "@/components/flow/Toolbar";
import { FlowCanvas } from "@/components/flow/FlowCanvas";
import { Inspector } from "@/components/flow/Inspector";
import { ExecutionLog } from "@/components/flow/ExecutionLog";

export default function Editor() {
    return (
        <ReactFlowProvider>
            <div className="flex h-screen flex-col">
                <Toolbar />
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex flex-1 flex-col">
                        <div className="flex-1">
                            <FlowCanvas />
                        </div>
                        <ExecutionLog />
                    </div>
                    <Inspector />
                </div>
            </div>
        </ReactFlowProvider>
    );
}