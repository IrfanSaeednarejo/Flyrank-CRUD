
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { BookSchema, type Book } from "./schema";
import { priceToNumber } from "./clean";
import { shouldRetry } from "./retry";


const USER_AGENT =
    "FlyRankInternshipA9/1.0 (+https://github.com/IrfanSaeednarejo/Flyrank-CRUD/tree/main/Scraper)";

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";
const CACHE_DIR = "cache";
const BOOKS_CACHE_DIR = join(CACHE_DIR, "books");
const OUTPUT_DIR = "output";

const TIMEOUT_MS = 5000;
const DELAY_MS = 500;
const RETRY_DELAY_MS = 1000;
const MAX_PAGES = 3;


interface Discovered {
    url: string;
    sourcePage: string;
}

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

interface ErrorRecord {
    product_url: string;
    reason: string;
    raw: RawBook;
}

interface FailedPage {
    product_url: string;
    reason: string;
}

interface RunStats {
    pages_fetched: number;
    cache_hits: number;
}

interface RunReport {
    started_at: string;
    finished_at: string;
    duration_ms: number;
    pages_fetched: number;
    cache_hits: number;
    valid_records: number;
    invalid_records: number;
    failed_pages: number;
}

class FetchError extends Error {
    constructor(message: string, public status?: number) {
        super(message);
        this.name = "FetchError";
    }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugFromUrl(url: string): string {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 2] ?? "unknown";
}

async function fetchOnce(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (response.status !== 200) {
            throw new FetchError(`status ${response.status}`, response.status);
        }
        return await response.text();
    } catch (err) {
        if (err instanceof FetchError) throw err;
        throw new FetchError(err instanceof Error ? err.message : String(err));
    }
}

async function fetchWithCache(
    url: string,
    dest: string,
    stats: RunStats
): Promise<string> {
    if (existsSync(dest)) {
        const html = await readFile(dest, "utf8");
        stats.cache_hits++;
        return html;
    }

    try {
        await sleep(DELAY_MS);
        const html = await fetchOnce(url);
        mkdirSync(join(dest, ".."), { recursive: true });
        await writeFile(dest, html, "utf8");
        stats.pages_fetched++;
        console.log(`FETCH: ${url} (${Buffer.byteLength(html)} bytes)`);
        return html;
    } catch (err) {
        const status = err instanceof FetchError ? err.status : undefined;
        if (!shouldRetry(status ?? 0, err)) throw err;

        console.log(`RETRY: ${url} (${err instanceof Error ? err.message : err})`);
        await sleep(RETRY_DELAY_MS);
        const html = await fetchOnce(url);
        mkdirSync(join(dest, ".."), { recursive: true });
        await writeFile(dest, html, "utf8");
        stats.pages_fetched++;
        console.log(`FETCH: ${url} (${Buffer.byteLength(html)} bytes)`);
        return html;
    }
}



async function crawlCatalogue(stats: RunStats): Promise<Discovered[]> {
    const discovered = new Map<string, Discovered>();
    let currentUrl: string | null = START_URL;
    let pageNumber = 1;

    while (currentUrl && pageNumber <= MAX_PAGES) {
        const dest = join(CACHE_DIR, `catalogue-page-${pageNumber}.html`);
        const sourcePage = currentUrl;

        const html = await fetchWithCache(currentUrl, dest, stats);
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
    const availability_text = $p
        .find(".availability")
        .first()
        .text()
        .trim()
        .replace(/\s+/g, " ");

    const ratingClass = $p.find(".star-rating").first().attr("class") ?? "";
    const rating_text = ratingClass.replace("star-rating", "").trim() || "Zero";

    const $descP = $p.find("#product_description").next("p");
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


function cleanAndValidate(raw: RawBook): Book {
    const candidate = {
        ...raw,
        price_gbp: priceToNumber(raw.price_text),
    };
    return BookSchema.parse(candidate);
}


async function main() {
    const startedAt = new Date();
    const stats: RunStats = { pages_fetched: 0, cache_hits: 0 };

    const discovered = await crawlCatalogue(stats);
    console.log(`\nDiscovered ${discovered.length} book pages.\n`);

    const rawRecords: RawBook[] = [];
    const failedPages: FailedPage[] = [];

    for (const { url, sourcePage } of discovered) {
        try {
            const dest = join(BOOKS_CACHE_DIR, `${slugFromUrl(url)}.html`);
            const html = await fetchWithCache(url, dest, stats);
            rawRecords.push(extractBook(html, url, sourcePage));
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            failedPages.push({ product_url: url, reason });
            console.log(`SKIP: ${url} — ${reason}`);
        }
    }

    const booksByUrl = new Map<string, Book>();
    const errors: ErrorRecord[] = [];

    for (const raw of rawRecords) {
        try {
            const book = cleanAndValidate(raw);
            booksByUrl.set(book.product_url, book);
        } catch (err) {
            errors.push({
                product_url: raw.product_url,
                reason: err instanceof Error ? err.message : String(err),
                raw,
            });
        }
    }

    const books = [...booksByUrl.values()].sort((a, b) =>
        a.product_url.localeCompare(b.product_url)
    );

    mkdirSync(OUTPUT_DIR, { recursive: true });
    await writeFile(join(OUTPUT_DIR, "books.json"), JSON.stringify(books, null, 2), "utf8");
    await writeFile(join(OUTPUT_DIR, "errors.json"), JSON.stringify(errors, null, 2), "utf8");

    if (failedPages.length > 0) {
        await writeFile(
            join(OUTPUT_DIR, "failed-pages.json"),
            JSON.stringify(failedPages, null, 2),
            "utf8"
        );
    }

    const finishedAt = new Date();
    const report: RunReport = {
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        pages_fetched: stats.pages_fetched,
        cache_hits: stats.cache_hits,
        valid_records: books.length,
        invalid_records: errors.length,
        failed_pages: failedPages.length,
    };

    await writeFile(
        join(OUTPUT_DIR, "run-report.json"),
        JSON.stringify(report, null, 2),
        "utf8"
    );

    console.log(`\nbooks=${books.length}`);
    console.log(`errors=${errors.length}`);
    console.log(`failed_pages=${failedPages.length}`);
    console.log(`duration_ms=${report.duration_ms}`);
}

main().catch((err) => {
    console.error("Fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
});