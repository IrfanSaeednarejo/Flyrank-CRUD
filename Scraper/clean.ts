
export function priceToNumber(priceText: string): number {
    const cleaned = priceText.replace(/[^0-9.]/g, "");
    const n = Number(cleaned);
    if (!Number.isFinite(n)) {
        throw new Error(`Cannot parse price from "${priceText}"`);
    }
    return n;
}