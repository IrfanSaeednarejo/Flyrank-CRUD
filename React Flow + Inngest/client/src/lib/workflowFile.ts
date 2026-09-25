import {
    WorkflowFileSchema,
    WorkflowSchema,
    type Workflow,
    type WorkflowFile,
} from "@/schemas/workflow";

const FILE_KIND = "ai-workflow" as const;
const FILE_VERSION = 1 as const;

export function buildWorkflowFile(workflow: Workflow): WorkflowFile {
    return {
        kind: FILE_KIND,
        version: FILE_VERSION,
        exportedAt: new Date().toISOString(),
        workflow,
    };
}


export function serializeWorkflow(workflow: Workflow): string {
    return JSON.stringify(buildWorkflowFile(workflow), null, 2);
}

export function downloadWorkflow(workflow: Workflow, filename?: string) {
    const json = serializeWorkflow(workflow);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download =
        filename ??
        `workflow-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function parseWorkflowJson(raw: string): Workflow {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error("Invalid JSON file.");
    }

    const envelope = WorkflowFileSchema.safeParse(parsed);
    if (envelope.success) {
        return envelope.data.workflow;
    }

    const bare = WorkflowSchema.safeParse(parsed);
    if (bare.success) {
        return bare.data;
    }

    const issues = envelope.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("; ");
    throw new Error(`Workflow file is invalid. ${issues}`);
}


export async function readWorkflowFile(file: File): Promise<Workflow> {
    const text = await file.text();
    return parseWorkflowJson(text);
}