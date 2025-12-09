import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function fetchPageTextBrowser(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // <-- Set false for testing; later you can set true
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    );

    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

    // Extract only meaningful content
    const text = await page.evaluate(() => {
      const main = document.querySelector("main");
      return (main ? main.innerText : document.body.innerText)
        .replace(/\s+/g, " ")
        .trim();
    });

    return text;
  } catch (err) {
    console.log(`Puppeteer error on ${url}: ${err.message}`);
    return "";
  } finally {
    if (browser) await browser.close();
  }
}
