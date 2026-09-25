import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";


const USER_AGENT =
    "FlyRankInternshipA9/1.0 (+https://github.com/IrfanSaeednarejo/Flyrank-CRUD/tree/main/Scraper)";

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";
const CACHE_DIR = "cache";
const BOOKS_CACHE_DIR = join(CACHE_DIR, "books");
const TIMEOUT_MS = 5000;
const DELAY_MS = 500;
const MAX_PAGES = 3;

interface RawBook {
    title: string;
    product_url: string;
    price_text: string;
    availability_text: string;
    rating_text: string;
    description: string | null;
    source_page: string;
    fetched_at: string;
}

interface Discovered {
    url: string;
    sourcePage: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugFromUrl(url: string): string {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 2] ?? "unknown";
}

async function fetchWithCache(url: string, dest: string): Promise<string> {
    if (existsSync(dest)) {
        const html = await readFile(dest, "utf8");
        console.log(`CACHE HIT: ${dest} (${Buffer.byteLength(html)} bytes)`);
        return html;
    }

    await sleep(DELAY_MS);

    const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status !== 200) {
        throw new Error(`Failed fetch ${url}: status ${response.status}`);
    }

    const html = await response.text();
    mkdirSync(join(dest, ".."), { recursive: true });
    await writeFile(dest, html, "utf8");
    console.log(`FETCH: ${url} (${Buffer.byteLength(html)} bytes)`);
    return html;
}


async function crawlCatalogue(): Promise<Discovered[]> {
    const discovered = new Map<string, Discovered>();
    let currentUrl: string | null = START_URL;
    let pageNumber = 1;

    while (currentUrl && pageNumber <= MAX_PAGES) {
        const dest = join(CACHE_DIR, `catalogue-page-${pageNumber}.html`);
        const sourcePage = currentUrl;
        const html = await fetchWithCache(currentUrl, dest);

        const $ = cheerio.load(html);
        $("h3 > a").each((_, el) => {
            const href = $(el).attr("href");
            if (!href) return;
            const abs = new URL(href, sourcePage).toString();
            if (!discovered.has(abs)) {
                discovered.set(abs, { url: abs, sourcePage });
            }
        });

        const nextHref = $("li.next > a").attr("href");
        currentUrl = nextHref ? new URL(nextHref, sourcePage).toString() : null;
        pageNumber++;
    }

    return [...discovered.values()];
}


function extractBook(html: string, productUrl: string, sourcePage: string): RawBook {
    const $ = cheerio.load(html);

    const $p = $(".product_page");

    const title = $p.find("h1").first().text().trim();
    const price_text = $p.find(".price_color").first().text().trim();
    const availability_text = $p.find(".availability").first().text().trim().replace(/\s+/g, " ");

    const ratingClass = $p.find(".star-rating").first().attr("class") ?? "";
    const rating_text = ratingClass.replace("star-rating", "").trim() || "Zero";

    const $descHeader = $p.find("#product_description");
    const $descP = $descHeader.next("p");
    const description = $descP.length ? $descP.text().trim() : null;

    return {
        title,
        product_url: productUrl,
        price_text,
        availability_text,
        rating_text,
        description,
        source_page: sourcePage,
        fetched_at: new Date().toISOString(),
    };
}


async function main() {
    const discovered = await crawlCatalogue();
    console.log(`\nDiscovered ${discovered.length} book pages.\n`);

    const records: RawBook[] = [];
    let detailPages = 0;

    for (const { url, sourcePage } of discovered) {
        const dest = join(BOOKS_CACHE_DIR, `${slugFromUrl(url)}.html`);
        const html = await fetchWithCache(url, dest);

        const record = extractBook(html, url, sourcePage);
        records.push(record);
        detailPages++;

        if (detailPages === 1) {
            console.log("\n--- Sample raw record ---");
            console.log(JSON.stringify(record, null, 2));
            console.log("-------------------------\n");
        }
    }

    console.log(`detail_pages=${detailPages}`);
}

main().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});