// import express from "express";
// import cors from "cors";
// import axios from "axios";
// import dotenv from "dotenv";
// import { google } from "googleapis";

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const project = process.env.PROJECT_ID;
// const location = process.env.LOCATION || "global";
// const collectionId = process.env.COLLECTION_ID;

// // Function to get OAuth2 token from service account
// async function getAccessToken() {
//   const auth = new google.auth.GoogleAuth({
//     keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
//     scopes: ["https://www.googleapis.com/auth/cloud-platform"],
//   });
//   const client = await auth.getClient();
//   const token = await client.getAccessToken();
//   return token.token;
// }

// app.post("/api/search", async (req, res) => {
//   const { query } = req.body;
//   if (!query) return res.status(400).json({ error: "Query is required" });

//   try {
//     const accessToken = await getAccessToken();

//     // const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/collections/${collectionId}/servingConfigs/default:search`;
// const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/dataStores/${collectionId}/servingConfigs/default:search`;
//     const response = await axios.post(
//       url,
//       { query },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const results = (response.data.results || []).map(r => ({
//       title: r.document?.title || "No title",
//       uri: r.document?.uri || "",
//       snippet: r.document?.content?.substring(0, 300) || "",
//     }));

//     res.json({ results });
//   } catch (err) {
//     console.error("Vertex AI Search error:", err.response?.data || err.message);
//     res.status(500).json({ error: err.message });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const project = process.env.PROJECT_ID;
const collection = process.env.COLLECTION_ID;
const engine = process.env.ENGINE_ID;
const location = "global";

// Get access token from service account
async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  const url = `https://discoveryengine.googleapis.com/v1alpha/projects/${project}/locations/${location}/collections/${collection}/engines/${engine}/servingConfigs/default_search:search`;

  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      url,
      {
        query,
        pageSize: 10,
        queryExpansionSpec: { condition: "AUTO" },
        spellCorrectionSpec: { mode: "AUTO" },
        languageCode: "en-GB",
        userInfo: { timeZone: "America/Chicago" },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(JSON.stringify(response.data, null, 2));
    const results = response.data.results.map(r => {
  const data = r.document?.derivedStructData || {};
  return {
    title: data.title || "No title",
    url: data.link || data.formattedUrl || "",
    snippet: data.snippets?.[0]?.snippet || "",
    image: data.pagemap?.cse_image?.[0]?.src || ""
  };
});

    res.json({ results });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
