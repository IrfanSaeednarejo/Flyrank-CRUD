import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const USER_AGENT =
    "FlyRankInternshipA9/1.0 (+https://github.com/IrfanSaeednarejo/Flyrank-CRUD/tree/main/Scraper)";

const PAGE_URL = "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = "cache";
const CACHE_FILE = join(CACHE_DIR, "catalogue-page-1.html");

const TIMEOUT_MS = 5000;

async function fetchAndCache(url: string, dest: string): Promise<string> {
    const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status !== 200) {
        throw new Error(
            `Failed fetch: status ${response.status} ${response.statusText}`
        );
    }

    const html = await response.text();

    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    await writeFile(dest, html, "utf8");

    const size = Buffer.byteLength(html, "utf8");
    console.log(`FETCH: ${url} (${size} bytes) -> ${dest}`);

    return html;
}

async function loadCachedOrFetch(url: string, dest: string): Promise<string> {
    if (existsSync(dest)) {
        const html = await readFile(dest, "utf8");
        const size = Buffer.byteLength(html, "utf8");
        console.log(`CACHE HIT: ${dest} (${size} bytes)`);
        return html;
    }
    return fetchAndCache(url, dest);
}


async function main() {
    const html = await loadCachedOrFetch(PAGE_URL, CACHE_FILE);
    console.log(`Ready. HTML length: ${html.length}`);
}

main().catch((err) => {
    console.error("Scrape failed:", err.message);
    process.exit(1);
});