const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 3001;

app.get('/aprs', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param' });
  try {
    const response = await fetch(url);
    const data = await response.text();
    res.set('Content-Type', 'application/json');
    res.send(data);
  } catch (e) {
    res.status(500).json({ error: 'Proxy error' });
  }
});

app.listen(PORT, () => console.log(`APRS proxy running on port ${PORT}`)); 