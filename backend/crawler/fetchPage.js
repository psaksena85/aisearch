import fetch from "node-fetch";
import { JSDOM } from "jsdom";

export async function fetchPage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const html = await res.text();
    const dom = new JSDOM(html);
    const text = dom.window.document.body.textContent || "";

    return text.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.error("Error fetching page:", url, err);
    return null;
  }
}
