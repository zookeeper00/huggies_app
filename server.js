const express = require('express');
const axios = require('axios');
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const app = express();
 
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
 
// Initialize Secret Manager client
const secretManagerClient = new SecretManagerServiceClient();
 
async function fetchSecret(secretName) {
  try {
    const [version] = await secretManagerClient.accessSecretVersion({
      name: projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest,
    });
 
    return version.payload.data.toString();
  } catch (error) {
    console.error(Error accessing secret ${secretName}:, error);
    throw new Error('Failed to access secret');
  }
}
 
// Middleware to fetch secrets and authenticate
const auth = async (req, res, next) => {
  try {
    const username = await fetchSecret('USERNAME');
    const password = await fetchSecret('PASSWORD');
 
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send('Unauthorized');
      return;
    }
 
    const token = authHeader.substring('Bearer '.length);
    if (token !== await fetchSecret('HUGGING_FACE_AUTH_KEY')) {
      res.status(403).send('Forbidden');
      return;
    }
 
    // If authentication passes, continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).send('Internal Server Error');
  }
};
 
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
 
app.post('/generate-text', auth, async (req, res) => {
  const prompt = req.body.prompt;
 
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      { inputs: prompt },
      { headers: { Authorization: Bearer ${await fetchSecret('HUGGING_FACE_AUTH_KEY')} } }
    );
 
    res.json({ text: response.data[0].generated_text });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});
 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
 
app.listen(PORT, () => {
  console.log(Server is running on http://localhost:${PORT});
});
