import { ReactFlowProvider } from "reactflow";
import { Toolbar } from "@/components/flow/Toolbar";
import { FlowCanvas } from "@/components/flow/FlowCanvas";
import { Inspector } from "@/components/flow/Inspector";

export default function Editor() {
    return (
        <ReactFlowProvider>
            <div className="flex h-screen flex-col">
                <Toolbar />
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1">
                        <FlowCanvas />
                    </div>
                    <Inspector />
                </div>
            </div>
        </ReactFlowProvider>
    );
}