export default async function handler(req, res) {
  // --- Allow CORS for Flutter web requests ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight (OPTIONS) requests
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    // --- Read body safely (for Node environments without body parser) ---
    let body = "";
    await new Promise((resolve) => {
      req.on("data", (chunk) => (body += chunk));
      req.on("end", resolve);
    });

    const data = JSON.parse(body || "{}");
    const userMessage = data.message || "Hello Gemini";

    // --- Validate API key ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY in environment");
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // --- Call the updated Gemini API (v1beta, 1.5-flash) ---
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
        }),
      }
    );

    // --- Handle Gemini response ---
    if (!geminiResponse.ok) {
      const text = await geminiResponse.text();
      console.error("Gemini API error:", text);
      return res
        .status(geminiResponse.status)
        .json({ error: "Gemini API request failed", details: text });
    }

    const result = await geminiResponse.json();

    // --- Extract reply safely ---
    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ No response from Gemini";

    // --- Send response to Flutter ---
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Proxy error:", err);
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
}
