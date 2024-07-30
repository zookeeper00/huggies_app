const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');
const app = express();

const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const BASE_URL = 'http://20.244.110.84:8000/generate/';
const API_URL = 'https://hub-proxy-service-2fhjcmydtq-uk.a.run.app';
const API_KEY = process.env.API_KEY;
const MODEL_NAME = 'gpt-35-turbo';
const USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'admin';

if (!API_KEY) {
  console.error('API_KEY is not set. Please set the API_KEY environment variable.');
  process.exit(1);
}

const auth = (req, res, next) => {
  const user = basicAuth(req);

  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted area"');
    res.set('Cache-Control', 'no-store'); // Prevent caching of credentials
    res.status(401).send('Authentication required.');
    return;
  }

  // Prevent caching of authenticated requests
  res.set('Cache-Control', 'no-store');

  // If authentication passes, continue to the next middleware or route handler
  next();
};

app.use(auth); // Apply authentication middleware globally
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/generate-text', async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await axios.post(
      `${BASE_URL}?api_url=${encodeURIComponent(API_URL)}&api_key=${API_KEY}&model_name=${MODEL_NAME}&prompt=${encodeURIComponent(prompt)}`,
      {},
      { headers: { 'accept': 'application/json' } }
    );

    res.json({ text: response.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
