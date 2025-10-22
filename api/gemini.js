export default async function handler(req, res) {
  // --- CORS for Flutter web ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    // --- Read body safely ---
    let body = "";
    await new Promise((resolve) => {
      req.on("data", (chunk) => (body += chunk));
      req.on("end", resolve);
    });

    const data = JSON.parse(body || "{}");
    const userMessage = data.message || "Hello Gemini";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    // --- Use current working endpoint (v1beta, flash-001) ---
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
        }),
      }
    );

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

