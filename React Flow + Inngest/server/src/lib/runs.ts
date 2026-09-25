export type RunStatus = "queued" | "done" | "error";

export type RunRecord = {
    id: string;
    status: RunStatus;
    trace?: unknown;
    error?: string;
    createdAt: number;
};

const runs = new Map<string, RunRecord>();

export function createRun(id: string): RunRecord {
    const rec: RunRecord = { id, status: "queued", createdAt: Date.now() };
    runs.set(id, rec);
    return rec;
}

export function getRun(id: string) {
    return runs.get(id);
}

export function updateRun(id: string, patch: Partial<RunRecord>) {
    const cur = runs.get(id);
    if (!cur) return;
    runs.set(id, { ...cur, ...patch });
}