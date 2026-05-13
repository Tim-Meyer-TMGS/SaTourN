const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

function getBaseUrl(apiType) {
  return apiType === "free"
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";
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
    } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "API-Key fehlt." });
    }

    const baseUrl = getBaseUrl(apiType);
    let url;
    let options = {
      headers: {
        Authorization: "DeepL-Auth-Key " + apiKey
      }
    };

    if (action === "glossaries") {
      url = baseUrl + "/v2/glossaries";
    } else if (action === "entries") {
      if (!glossaryId) {
        return res.status(400).json({ error: "Glossary ID fehlt." });
      }
      url = baseUrl + "/v2/glossaries/" + encodeURIComponent(glossaryId) + "/entries";
      options.headers.Accept = "text/tab-separated-values";
    } else if (action === "translateWithoutGlossary" || action === "translateWithGlossary") {
      if (!text || !sourceLang || !targetLang) {
        return res.status(400).json({ error: "Text, source_lang oder target_lang fehlt." });
      }

      url = baseUrl + "/v2/translate";

      const body = new URLSearchParams({
        text,
        source_lang: sourceLang,
        target_lang: targetLang
      });

      if (action === "translateWithGlossary") {
        if (!glossaryId) {
          return res.status(400).json({ error: "Glossary ID fehlt." });
        }
        body.append("glossary_id", glossaryId);
      }

      options.method = "POST";
      options.headers["Content-Type"] = "application/x-www-form-urlencoded";
      options.body = body;
    } else {
      return res.status(400).json({ error: "Unbekannte Aktion." });
    }

    const response = await fetch(url, options);
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    res.status(response.status);

    if (contentType.includes("application/json")) {
      try {
        return res.json(JSON.parse(responseText));
      } catch {
        return res.send(responseText);
      }
    }

    res.type("text/plain").send(responseText);
  } catch (error) {
    res.status(500).json({
      error: "Serverfehler",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`DeepL Glossary Checker läuft auf Port ${PORT}`);
});