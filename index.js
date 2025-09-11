// index.js
import express from 'express';
import cors    from 'cors';
import fetch   from 'node-fetch';
import dotenv  from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1️⃣ CORS global aktivieren (inkl. Preflight)
app.use(cors());
app.options('*', cors());       
app.use(express.json());

// 2️⃣ Health-Check
app.get('/', (req, res) => {
  res.send('✅ SaTourN-Proxy alive');
});

// 3️⃣ API-Proxy-Endpoint
app.get('/api/search', async (req, res) => {
  const { type, query = '', isOpenData = 'false' } = req.query;
  const licenseKey = process.env.LICENSE_KEY;
  
  if (!licenseKey) {
    console.error('⚠️ LICENSE_KEY fehlt!');
    return res.status(500).send('Server-Error: LICENSE_KEY fehlt');
  }

  // qParam einmal korrekt zusammenbauen (ohne doppelte URL-Encoding)
  let qParam = '';
  if (query.startsWith('&q=')) {
    qParam = query.slice(3);                // rohen Teil
  } else {
    qParam = query;                         // z.B. 'area:"XYZ"'
  }
  if (isOpenData === 'true') {
    qParam += '+AND+attribute_license%3A(CC0+OR+CC-BY+OR+CC-BY-SA)';
  }

  // Ziel-URL konstruieren
 const targetUrl =
  'https://meta.et4.de/rest.ashx/search/' +
  `?experience=statistik_sachsen` +
  `&licensekey=${licenseKey}` +
  `&type=${encodeURIComponent(type)}` +
  `&q=${qParam}` + // ✅ NICHT nochmal encodeURIComponent
  `&limit=1000&template=ET2014A.xml`;


  console.log('👉 Proxy leitet weiter an:', targetUrl);

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    res.type('application/xml').send(text);
  } catch (err) {
    console.error('🔥 Fetch-Error:', err);
    res.status(500).send(`Fetch-Error: ${err.message}`);
  }
});

// 4️⃣ Server starten
app.listen(PORT, () => {
  console.log(`Proxy-Server läuft auf Port ${PORT}`);
});
