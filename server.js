const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run

// Directly use environment variables set by Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'admin';

const auth = (req, res, next) => {
  const user = basicAuth(req);

  if (!user || user.name !== BASIC_AUTH_USERNAME || user.pass !== BASIC_AUTH_PASSWORD) {
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
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` } }
    );

    res.json({ text: response.data[0].generated_text });
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
