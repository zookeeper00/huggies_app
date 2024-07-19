const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth'); // Add this line to import basic-auth
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const app = express();
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run

// Initialize Secret Manager client
const client = new SecretManagerServiceClient();

async function accessSecretVersion(name) {
  const [version] = await client.accessSecretVersion({
    name: name,
  });

  // Extract the secret payload
  return version.payload.data.toString('utf8');
}

// Fetch secrets from Secret Manager
const USERNAME_SECRET = process.env.USERNAME_SECRET;
const PASSWORD_SECRET = process.env.PASSWORD_SECRET;
const HUGGING_FACE_API_KEY_SECRET = process.env.HUGGING_FACE_API_KEY_SECRET;

let USERNAME, PASSWORD, HUGGING_FACE_API_KEY;

async function fetchSecrets() {
  USERNAME = await accessSecretVersion(USERNAME_SECRET);
  PASSWORD = await accessSecretVersion(PASSWORD_SECRET);
  HUGGING_FACE_API_KEY = await accessSecretVersion(HUGGING_FACE_API_KEY_SECRET);
}

fetchSecrets().catch(console.error);

// Authentication middleware
const auth = (req, res, next) => {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted area"');
    res.status(401).send('Authentication required.');
    return;
  }
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
