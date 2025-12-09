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

dotenv.config();

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your local sitemap
const sitemapPath = path.join(__dirname, "../sitemaps/aetna_sitemap.xml");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Crawl a sitemap from local file or remote URL
async function crawlSitemap(sitemapFilePathOrUrl) {
  try {
    let xmlData;

    if (sitemapFilePathOrUrl.startsWith("http")) {
      const res = await axios.get(sitemapFilePathOrUrl);
      xmlData = res.data;
    } else {
      xmlData = await fs.readFile(sitemapFilePathOrUrl, "utf-8");
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const jsonObj = parser.parse(xmlData);

    const urls = [];

    if (jsonObj.sitemapindex && jsonObj.sitemapindex.sitemap) {
      for (const sm of jsonObj.sitemapindex.sitemap) {
        if (sm.loc) urls.push(sm.loc);
      }
    }
    if (jsonObj.urlset && jsonObj.urlset.url) {
      for (const u of jsonObj.urlset.url) {
        if (u.loc) urls.push(u.loc);
      }
    }

    return urls;
  } catch (err) {
    console.warn(`Skipping sitemap ${sitemapFilePathOrUrl}: ${err.message}`);
    return [];
  }
}

async function fetchPageText(url) {
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    return $("body").text().replace(/\s+/g, " ").trim();
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
          input: chunk
        });
        const vector = emb.data[0].embedding;
  
        if (!vector || !Array.isArray(vector)) {
          console.warn(`Skipping chunk from ${url}, invalid embedding`);
          continue;
        }
  
        await index.upsert([
          {
            id: `${url}-${Math.random().toString(36).slice(2, 8)}`,
            values: vector,
            metadata: { text: chunk, url }
          }
        ]);
      } catch (e) {
        console.warn(`Upsert failed for chunk from ${url}: ${e.message}`);
      }
    }
  }

async function main() {
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = client.Index(process.env.PINECONE_INDEX);

  // Load URLs from local sitemap
  const allUrls = await crawlSitemap(sitemapPath);

  console.log(`Found ${allUrls.length} URLs`);

  for (const url of allUrls) {
    const text = await fetchPageText(url);
    if (!text) continue;

    const chunks = chunkText(text);
    await upsertToPinecone(index, chunks, url);

    console.log(`Upserted ${chunks.length} chunks from ${url}`);
  }

  console.log("Crawl + embed complete.");
}

main();
