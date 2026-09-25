// src/index.ts

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";


const USER_AGENT =
    "FlyRankInternshipA9/1.0 (+https://github.com/IrfanSaeednarejo/Flyrank-CRUD/tree/main/Scraper)";

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = "cache";
const TIMEOUT_MS = 5000;
const DELAY_MS = 500;
const MAX_PAGES = 3;


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cachePathFor(pageNumber: number): string {
    return join(CACHE_DIR, `catalogue-page-${pageNumber}.html`);
}

async function fetchPage(url: string, dest: string): Promise<string> {
    const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status !== 200) {
        throw new Error(`Failed fetch ${url}: status ${response.status}`);
    }

    const html = await response.text();

    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    await writeFile(dest, html, "utf8");

    console.log(`FETCH: ${url} (${Buffer.byteLength(html)} bytes)`);
    return html;
}

async function loadOrFetch(url: string, dest: string): Promise<string> {
    if (existsSync(dest)) {
        const html = await readFile(dest, "utf8");
        console.log(`CACHE HIT: ${dest} (${Buffer.byteLength(html)} bytes)`);
        return html;
    }
    return fetchPage(url, dest);
}

interface PageResult {
    bookUrls: string[];
    nextUrl: string | null;
}

function extractPage(html: string, pageUrl: string): PageResult {
    const $ = cheerio.load(html);

    const bookUrls: string[] = [];
    $("h3 > a").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
            bookUrls.push(new URL(href, pageUrl).toString());
        }
    });
    const nextHref = $("li.next > a").attr("href");
    const nextUrl = nextHref ? new URL(nextHref, pageUrl).toString() : null;

    return { bookUrls, nextUrl };
}

async function crawl(): Promise<{
    pages: number;
    discovered: number;
    uniqueUrls: string[];
}> {
    const allUrls: string[] = [];
    const seen = new Set<string>();

    let currentUrl: string | null = START_URL;
    let pageNumber = 1;
    let pagesVisited = 0;

    while (currentUrl && pagesVisited < MAX_PAGES) {
        const dest = cachePathFor(pageNumber);

        const willFetch = !existsSync(dest);
        if (willFetch && pagesVisited > 0) await sleep(DELAY_MS);

        const html = await loadOrFetch(currentUrl, dest);
        pagesVisited++;

        const { bookUrls, nextUrl } = extractPage(html, currentUrl);
        for (const u of bookUrls) {
            allUrls.push(u);
            seen.add(u);
        }

        console.log(
            `  page ${pageNumber}: ${bookUrls.length} links, next=${nextUrl ? "yes" : "none"
            }`
        );

        currentUrl = nextUrl;
        pageNumber++;
    }

    return {
        pages: pagesVisited,
        discovered: allUrls.length,
        uniqueUrls: [...seen],
    };
}


async function main() {
    const { pages, discovered, uniqueUrls } = await crawl();

    console.log("");
    console.log(`catalogue_pages=${pages}`);
    console.log(`discovered=${discovered}`);
    console.log(`unique_urls=${uniqueUrls.length}`);
}

main().catch((err) => {
    console.error("Crawl failed:", err.message);
    process.exit(1);
});