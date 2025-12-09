import { useState, useEffect } from "react";

export default function App() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [htmlContent, setHtmlContent] = useState(null); // State for HTML content
	const [htmlLoading, setHtmlLoading] = useState(false); // State for HTML loading

	const fetchHtmlContent = async () => {
		setHtmlLoading(true);

		try {
			const res = await fetch(
				"/content/experience-fragments/aethfe/aetna/Globals/header_for_aetna/header/header-individuals/master.react.html?wcmmode=disabled",
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
				}
			);

			if (!res.ok) {
				throw new Error("Failed to fetch HTML content");
			}

			const html = await res.text(); // Get the HTML as plain text
			setHtmlContent(html); // Set the HTML content
		} catch (err) {
			console.error("Error fetching HTML:", err);
			setHtmlContent("<p>Error loading content</p>");
		} finally {
			setHtmlLoading(false);
		}
	};

  // Function to execute scripts in the injected HTML
  const executeScripts = () => {
    setTimeout(() => {
      const scripts = document.querySelectorAll("script");
      scripts.forEach((script) => {
        if (script.src) {
          const newScript = document.createElement("script");
          newScript.src = script.src;
          newScript.defer = script.defer;
          document.body.appendChild(newScript);
        } else {
          const inlineScript = document.createElement("script");
          inlineScript.textContent = script.textContent;
          document.body.appendChild(inlineScript);
        }
      });
    }, 10000);
  };

	const handleSearch = async () => {
		if (!query) return;
		setLoading(true);

		const res = await fetch("http://localhost:5000/api/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ query }),
		});

		const data = await res.json();
		setResults(data.results);
		setLoading(false);
	};

  // useEffect(() => {
  //   if (htmlContent) {
  //     executeScripts(); // Execute scripts after HTML is injected
  //   }
  // }, [htmlContent]);

	// Fetch HTML content on page load
	useEffect(() => {
		fetchHtmlContent();
	}, []);

	return (
		<>
			{htmlLoading && <p>Loading HTML content...</p>}

			<div>
				{htmlContent && (
					<div
						dangerouslySetInnerHTML={{ __html: htmlContent }} // Render the HTML content
						
					/>
				)}
			</div>
			<div
				style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "sans-serif" }}
			>
				<h1>Aetna Semantic Search</h1>
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search Aetna..."
					style={{ width: "70%", padding: "0.5rem", fontSize: "1rem" }}
				/>
				<button
					onClick={handleSearch}
					style={{ padding: "0.5rem 1rem", marginLeft: "1rem" }}
				>
					Search
				</button>

				{loading && <p>Loading...</p>}

				<div style={{ marginTop: "2rem" }}>
					{results.map((r, i) => (
						<div
							key={i}
							style={{
								marginBottom: "1rem",
								padding: "0.5rem",
								border: "1px solid #ccc",
							}}
						>
							<p>{r.text}</p>
							<a href={r.url} target="_blank" rel="noopener noreferrer">
								{r.url}
							</a>
						</div>
					))}
				</div>
			</div>
		</>
	);
}
