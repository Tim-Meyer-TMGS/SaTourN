const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

function getBaseUrl(apiType) {
  return apiType === "free"
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

app.post("/api/deepl", async (req, res) => {
  try {
    const {
      apiKey,
      apiType,
      action,
      glossaryId,
      sourceLang,
      targetLang,
      text
    } = req.body || {};

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "API-Key fehlt." });
    }

    const baseUrl = getBaseUrl(apiType);
    let url;
    const options = {
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey.trim()}`
      }
    };

    if (action === "glossaries") {
      url = `${baseUrl}/v2/glossaries`;
    } else if (action === "entries") {
      if (!glossaryId) return res.status(400).json({ error: "Glossary ID fehlt." });
      url = `${baseUrl}/v2/glossaries/${encodeURIComponent(glossaryId)}/entries`;
      options.headers.Accept = "text/tab-separated-values";
    } else if (action === "translateWithoutGlossary" || action === "translateWithGlossary") {
      if (!text || !sourceLang || !targetLang) {
        return res.status(400).json({ error: "Text, source_lang oder target_lang fehlt." });
      }

      url = `${baseUrl}/v2/translate`;
      const body = new URLSearchParams({
        text: String(text).slice(0, 10000),
        source_lang: String(sourceLang).trim().toUpperCase(),
        target_lang: String(targetLang).trim().toUpperCase()
      });

      if (action === "translateWithGlossary") {
        if (!glossaryId) return res.status(400).json({ error: "Glossary ID fehlt." });
        body.append("glossary_id", glossaryId);
      }

      options.method = "POST";
      options.headers["Content-Type"] = "application/x-www-form-urlencoded";
      options.body = body;
    } else {
      return res.status(400).json({ error: "Unbekannte Aktion." });
    }

    const response = await fetchWithTimeout(url, options);
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    res.status(response.status);
    if (contentType.includes("application/json")) {
      try {
        return res.json(JSON.parse(responseText));
      } catch {
        return res.type("text/plain").send(responseText);
      }
    }

    return res.type("text/plain").send(responseText);
  } catch (error) {
    const isAbort = error && error.name === "AbortError";
    return res.status(isAbort ? 504 : 500).json({
      error: isAbort ? "DeepL Timeout" : "Serverfehler"
    });
  }
});

app.listen(PORT, () => {
  console.log(`DeepL Glossar Checker listening on port ${PORT}`);
});
