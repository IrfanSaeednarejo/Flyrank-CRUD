import { z } from "zod";

export const NodeDataSchema = z.object({
    label: z.string().min(1).max(80),
    prompt: z.string().max(500).default(""),
});

export const WorkflowNodeSchema = z.object({
    id: z.string(),
    type: z.literal("prompt"),
    position: z.object({ x: z.number(), y: z.number() }),
    data: NodeDataSchema,
});

export const BranchSchema = z.enum(["YES", "NO"]);

export const WorkflowEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.literal("branch"),
    data: z.object({ branch: BranchSchema }),
    sourceHandle: z.enum(["YES", "NO"]).nullable().optional(),

});

export const WorkflowSchema = z.object({
    nodes: z.array(WorkflowNodeSchema),
    edges: z.array(WorkflowEdgeSchema),
    startNodeId: z.string().nullable(),
});

export type NodeData = z.infer<typeof NodeDataSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;