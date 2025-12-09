import { useState } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);

    const res = await fetch("http://localhost:5000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    setResults(data.results);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Aetna Semantic Search</h1>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search Aetna..."
        style={{ width: "70%", padding: "0.5rem", fontSize: "1rem" }}
      />
      <button onClick={handleSearch} style={{ padding: "0.5rem 1rem", marginLeft: "1rem" }}>
        Search
      </button>

      {loading && <p>Loading...</p>}

      <div style={{ marginTop: "2rem" }}>
        {results.map((r, i) => (
          <div key={i} style={{ marginBottom: "1rem", padding: "0.5rem", border: "1px solid #ccc" }}>
            <p>{r.text}</p>
            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
