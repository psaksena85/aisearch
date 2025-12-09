import OpenAI from "openai";
import { index } from "./client.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function semanticSearch(query, topK = 5) {
  try {
    // 1. Create embedding
    const embResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    const queryEmbedding = embResponse.data[0].embedding;

    // 2. Query Pinecone (correct v2 syntax)
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });

    // 3. Format results
    return searchResponse.matches.map(m => ({
      text: m?.metadata?.text || "",
      url: m?.metadata?.url || "",
      score: m.score
    }));
  } catch (err) {
    console.error("Search error:", err);
    return [];
  }
}
