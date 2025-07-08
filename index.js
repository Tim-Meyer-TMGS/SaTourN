// index.js
import express from 'express';            // ESM-Syntax: setze "type": "module" in package.json
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------
// Middleware & Health
// -------------------

// CORS für alle Ursprünge (Entwicklung/Frontend)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Health-Check auf "/"
app.get('/', (req, res) => {
  res.send('✅ SaTourN-Proxy alive');
});

// --------------------
// API-Proxy-Endpoint
// --------------------
app.get('/api/search', async (req, res) => {
  const { type, query = '', isOpenData = 'false' } = req.query;
  const licenseKey = process.env.LICENSE_KEY;

  // 1) Lizenz-Key prüfen
  if (!licenseKey) {
    console.error('⚠️ LICENSE_KEY fehlt!');
    return res.status(500).send('Server-Error: LICENSE_KEY fehlt');
  }

  // 2) Query-Parameter aufbauen
  let qParam = query;
  if (isOpenData === 'true') {
    qParam += '+AND+attribute_license%3A(CC0+OR+CC-BY+OR+CC-BY-SA)';
  }

  // 3) Ziel-URL konstruieren und loggen
  const targetUrl = [
    'https://meta.et4.de/rest.ashx/search/',
    '?experience=statistik_sachsen',
    `&licensekey=${licenseKey}`,
    `&type=${encodeURIComponent(type)}`,
    `&q=${encodeURIComponent(qParam)}`,
    '&template=ET2014A.xml'
  ].join('');

  console.log('👉 Proxy leitet weiter an:', targetUrl);

  // 4) Fetch & Response
  try {
    const response = await fetch(targetUrl);
    const text = await response.text();

    // Rückgabe als XML
    res.type('application/xml').send(text);
  } catch (err) {
    console.error('🔥 Fetch-Error:', err);
    // Zum Debug: detaillierte Fehlermeldung zurücksenden
    res.status(500).send(`Fetch-Error: ${err.message}`);
  }
});

// -------------------
// Server starten
// -------------------
app.listen(PORT, () => {
  console.log(`Proxy-Server läuft auf Port ${PORT}`);
});
