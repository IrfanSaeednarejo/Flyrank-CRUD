export function shouldRetry(status: number, err?: unknown): boolean {
    if (status >= 500 && status < 600) return true;
    if (status === 404 || status === 403) return false;
    if (err && !("status" in (err as any))) return true;
    return false;
}