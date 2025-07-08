// 1.a) CORS und Root-Route für Health-Check
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/', (req, res) => {
  res.send('✅ SaTourN-Proxy alive');
});



const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/search', async (req, res) => {
  const { type, query = '', isOpenData = 'false' } = req.query;
  const licenseKey = process.env.LICENSE_KEY;
  let qParam = query;
  if (isOpenData === 'true') {
    qParam += '+AND+attribute_license%3A(CC0+OR+CC-BY+OR+CC-BY-SA)';
  }
  const url = `https://meta.et4.de/rest.ashx/search/?experience=statistik_sachsen&licensekey=${licenseKey}&type=${type}&q=${qParam}&template=ET2014A.xml`;
  try {
    const response = await fetch(url);
    const data = await response.text();
    res.send(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim API-Aufruf');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy läuft auf Port ${PORT}`);
});
