import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { semanticSearch } from "./pinecone/query.js";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  const results = await semanticSearch(query, 10); // topK = 10

  // Merge chunks by URL
  const merged = {};
  results.forEach(r => {
    if (!merged[r.url]) {
      merged[r.url] = { text: r.text, score: r.score };
    } else {
      // Concatenate text from multiple chunks
      merged[r.url].text += " " + r.text;
      // Optional: keep the highest score
      merged[r.url].score = Math.max(merged[r.url].score, r.score);
    }
  });

  // Convert back to array, sorted by score descending
  const mergedArray = Object.entries(merged)
    .map(([url, { text, score }]) => ({ url, text, score }))
    .sort((a, b) => b.score - a.score);

  res.json({ results: mergedArray });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
