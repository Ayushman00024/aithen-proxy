export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    let body = "";
    await new Promise((resolve) => {
      req.on("data", (chunk) => (body += chunk));
      req.on("end", resolve);
    });

    const data = JSON.parse(body || "{}");
    const userMessage = data.message || "Hello Gemini";

    const apiKey = process.env.GEMINI_API_KEY;
    const projectId = process.env.GCP_PROJECT_ID; // add this in Vercel envs

    if (!apiKey || !projectId) {
      return res
        .status(500)
        .json({ error: "Missing GEMINI_API_KEY or GCP_PROJECT_ID" });
    }

    // --- Vertex AI endpoint ---
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent`;

    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const text = await geminiResponse.text();
      console.error("Gemini API error:", text);
      return res
        .status(geminiResponse.status)
        .json({ error: "Gemini API request failed", details: text });
    }

    const result = await geminiResponse.json();
    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ No response from Gemini";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Proxy error:", err);
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
}

