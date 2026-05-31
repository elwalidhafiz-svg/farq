require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const { parseArabicScript } = require('./utils/pdfParser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Convert Arabic visual description to English prompt via Claude
async function translateToEnglishPrompt(arabicText) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system:
      'You are an expert at converting Arabic advertising script descriptions into detailed English prompts for image generation. Convert the Arabic visual description to a vivid, detailed English prompt suitable for Stable Diffusion. Focus on visual elements: composition, lighting, colors, subjects, style. Return only the English prompt, nothing else.',
    messages: [{ role: 'user', content: arabicText }],
  });
  return message.content[0].text.trim();
}

// Call Hugging Face Stable Diffusion with retry logic
async function generateImage(prompt, attempt = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 20000;

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
      {
        inputs: prompt,
        parameters: {
          num_inference_steps: 20,
          guidance_scale: 7.5,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 90000,
      }
    );

    // If we got a JSON response (error or loading message), check it
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const json = JSON.parse(Buffer.from(response.data).toString('utf8'));
      if (json.error && json.error.includes('loading') && attempt < MAX_RETRIES) {
        console.log(`Model loading, retrying in ${RETRY_DELAY_MS / 1000}s... (attempt ${attempt + 1})`);
        await sleep(RETRY_DELAY_MS);
        return generateImage(prompt, attempt + 1);
      }
      throw new Error(json.error || 'Unknown HuggingFace error');
    }

    const base64 = Buffer.from(response.data).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    // Handle 503 (model loading)
    if (err.response && err.response.status === 503 && attempt < MAX_RETRIES) {
      console.log(`503 received, retrying in ${RETRY_DELAY_MS / 1000}s... (attempt ${attempt + 1})`);
      await sleep(RETRY_DELAY_MS);
      return generateImage(prompt, attempt + 1);
    }
    console.error('Image generation error:', err.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate 3 image variations for a prompt
async function generateImageVariations(prompt) {
  const results = await Promise.all([
    generateImage(prompt),
    generateImage(prompt),
    generateImage(prompt),
  ]);
  return results;
}

// POST /api/upload
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'File must be a PDF' });
    }

    console.log('Parsing PDF...');
    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
    } catch (parseErr) {
      return res.status(422).json({ error: 'Could not parse PDF: ' + parseErr.message });
    }

    const rawText = pdfData.text;
    console.log('Extracted text length:', rawText.length);

    const scenes = parseArabicScript(rawText);
    if (scenes.length === 0) {
      return res.status(422).json({ error: 'Could not identify any scenes in the PDF. Please ensure it is an Arabic advertising script.' });
    }

    console.log(`Found ${scenes.length} scenes. Processing...`);

    const results = [];

    for (const scene of scenes) {
      console.log(`Processing scene ${scene.sceneNumber}...`);

      let englishPrompt = '';
      try {
        englishPrompt = await translateToEnglishPrompt(
          scene.visualDescription || `Scene ${scene.sceneNumber}: advertising visual`
        );
        console.log(`Scene ${scene.sceneNumber} English prompt: ${englishPrompt.slice(0, 80)}...`);
      } catch (claudeErr) {
        console.error(`Claude error for scene ${scene.sceneNumber}:`, claudeErr.message);
        englishPrompt = `Advertising scene ${scene.sceneNumber}, professional commercial photography, high quality`;
      }

      let images = [null, null, null];
      try {
        images = await generateImageVariations(englishPrompt);
      } catch (imgErr) {
        console.error(`Image generation error for scene ${scene.sceneNumber}:`, imgErr.message);
      }

      results.push({
        sceneNumber: scene.sceneNumber,
        visualDescription: scene.visualDescription,
        audioDescription: scene.audioDescription,
        englishPrompt,
        images,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Storyboard backend running on port ${PORT}`);
});
