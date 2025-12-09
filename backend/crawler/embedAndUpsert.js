import OpenAI from "openai";
import { index } from "../pinecone/client.js";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedAndUpsert(chunks, baseId, url) {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const emb = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk
    });

    await index.upsert([
      {
        id: `${baseId}-${i}`,
        values: emb.data[0].embedding,
        metadata: { text: chunk, url }
      }
    ]);
  }
}
