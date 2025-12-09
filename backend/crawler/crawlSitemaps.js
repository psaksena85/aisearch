// backend/crawler/crawlSitemaps.js
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { XMLParser } from "fast-xml-parser";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { fetchPageTextBrowser } from "./scrapeWithPuppeteer.js";

dotenv.config();

// ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to local sitemap
const sitemapPath = path.join(__dirname, "../sitemaps/aetna_sitemap.xml");

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Detect Incapsula / Imperva firewall
async function isIncapsulaBlocked(url) {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
    });

    const html = res.data;

    if (
      html.includes("Incapsula incident ID") ||
      html.includes("Request unsuccessful") ||
      html.includes("Access denied") ||
      html.includes("blocked by Imperva") ||
      html.includes("www.incapsula.com")
    ) {
      return true;
    }

    return false;
  } catch (err) {
    console.log(`Error checking ${url}: ${err.message}`);
    return true; // treat as blocked
  }
}

// Parse local sitemap
async function crawlSitemap(filePath) {
  try {
    const xml = await fs.readFile(filePath, "utf-8");
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonObj = parser.parse(xml);

    const urls = [];

    if (jsonObj.urlset && jsonObj.urlset.url) {
      for (const u of jsonObj.urlset.url) {
        if (u.loc) urls.push(u.loc);
      }
    }

    return urls;
  } catch (err) {
    console.warn(`Sitemap load error: ${err.message}`);
    return [];
  }
}

// Extract text already handled = OK
async function fetchPageText(url) {
  try {
    const res = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(res.data);

    const text = $("body").text().replace(/\s+/g, " ").trim();
    return text;
  } catch (err) {
    console.warn(`Error fetching ${url}: ${err.message}`);
    return "";
  }
}

function chunkText(text, chunkSize = 500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

async function upsertToPinecone(index, chunks, url) {
  for (const chunk of chunks) {
    try {
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const vector = emb.data[0].embedding;

      if (!Array.isArray(vector)) {
        console.warn(`Invalid embedding for ${url}`);
        continue;
      }

      // Pinecone v3 = array, NOT nested object
      await index.upsert([
        {
          id: `${url}-${Math.random().toString(36).slice(2, 8)}`,
          values: vector,
          metadata: { text: chunk, url },
        },
      ]);
    } catch (e) {
      console.warn(`Upsert failed for ${url}: ${e.message}`);
    }
  }
}

async function main() {
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const index = client.index(process.env.PINECONE_INDEX);

  console.log("Loading sitemap...");
  const allUrls = await crawlSitemap(sitemapPath);
  console.log(`Found ${allUrls.length} URLs in sitemap.`);

  const allowed = [];
  const blocked = [];

  console.log("Checking for Incapsula blocks...");

  for (const url of allUrls) {
    const blockedFlag = await isIncapsulaBlocked(url);

    if (blockedFlag) {
      console.log(`❌ BLOCKED: ${url}`);
      blocked.push(url);
    } else {
      console.log(`✅ ALLOWED: ${url}`);
      allowed.push(url);
    }
  }

  fs.writeFileSync("blocked_urls.json", JSON.stringify(blocked, null, 2));
  fs.writeFileSync("allowed_urls.json", JSON.stringify(allowed, null, 2));

  console.log(`Allowed URLs: ${allowed.length}`);
  console.log(`Blocked URLs: ${blocked.length}`);

  // Now embed *only* allowed URLs
  for (const url of allowed) {
    const text = await fetchPageTextBrowser(url);
    if (!text) continue;

    const chunks = chunkText(text);
    await upsertToPinecone(index, chunks, url);

    console.log(`Upserted ${chunks.length} chunks from ${url}`);
  }

  console.log("Crawl + embed complete.");
}

main();
