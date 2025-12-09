import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [htmlContent, setHtmlContent] = useState(null); // State for HTML content
	const [htmlLoading, setHtmlLoading] = useState(false); // State for HTML loading
	const [htmlFooterContent, setHtmlFooterContent] = useState(null); // State for HTML content
	const [htmlFooterLoading, setHtmlFooterLoading] = useState(false); // State for HTML loading

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
			console.log("Fetched HTML content:", html);
			setHtmlContent(html); // Set the HTML content
		} catch (err) {
			console.error("Error fetching HTML:", err);
			setHtmlContent("<p>Error loading content</p>");
		} finally {
			setHtmlLoading(false);
		}
	};
	const fetchHtmlFooterContent = async () => {
		setHtmlLoading(true);

		try {
			const res = await fetch(
				"/content/experience-fragments/aethfe/aetna/Globals/footer/footer/master.react.html?wcmmode=disabled",
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
				}
			);

			if (!res.ok) {
				throw new Error("Failed to fetch HTML content");
			}

			const html = await res.text(); // Get the HTML as plain text
			console.log("Fetched HTML content:", html);
			setHtmlFooterContent(html); // Set the HTML content
		} catch (err) {
			console.error("Error fetching HTML:", err);
			setHtmlFooterContent("<p>Error loading content</p>");
		} finally {
			setHtmlFooterLoading(false);
		}
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
		setResults(data.results || []);
		setLoading(false);
	};

	// Fetch HTML content on page load
	useEffect(() => {
		fetchHtmlContent();
		fetchHtmlFooterContent();
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
			{htmlContent && htmlFooterContent && (
				<div className="container">
					<div className="row">
						<h1 className="title__block col-12">Aetna Search</h1>
						<div className="col-10 searchbox--wrapper">
							<input
								className="searchbox--input"
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search Aetna..."
							/>
							<button
								className="btn--primary cmp-searchbox__button"
								onClick={handleSearch}
							>
								Search
							</button>
						</div>

						{loading && <p>Loading...</p>}

						<div className="col-12 results--wrapper">
							{/* {results.map((r, i) => (
          <div key={i} style={{ marginBottom: "1rem", padding: "0.5rem", border: "1px solid #ccc" }}>
            <p>{r.text}</p>
            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a>
          </div>
        ))} */}

							{results.map((r, i) => (
								<div
									key={i}
									className="result--item col-12"
								>
									{r.image && (
										<img
											src={r.image}
											alt={r.title}
											style={{ width: 200, marginTop: "0.5rem" }}
										/>
									)}
									<h2 className="title__container">{r.title}</h2>
									<p>{r.snippet}</p>
									<a className="link__text" href={r.url} target="_blank" rel="noopener noreferrer">
										{r.url}
									</a>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
			{htmlFooterLoading && <p>Loading HTML content...</p>}

			<div>
				{htmlFooterContent && (
					<div
						dangerouslySetInnerHTML={{ __html: htmlFooterContent }} // Render the HTML content
					/>
				)}
			</div>
		</>
	);
}
