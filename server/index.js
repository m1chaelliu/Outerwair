const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 5174;

// helper to strip data URL prefix
const stripDataUrl = (dataUrl) => dataUrl.replace(/^data:[^;]+;base64,/, '');

app.post('/api/combine', async (req, res) => {
  try {
    const { modelImage, clothingImage } = req.body; // base64 PNG/JPEG data URLs

    // Validate
    if (!modelImage || !clothingImage) {
      return res.status(400).json({ error: 'modelImage and clothingImage are required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

    // Build Gemini prompt
    const prompt = `You are given two images encoded as base64 data URLs.\nImage A is the model (selfie). Image B is a clothing item with transparent background.\nReturn a JSON object with these fields: { mask: "<base64-png>", bbox: {x,y,width,height}, transform: {scale,rotation,tx,ty}, notes: "Any tips" }.`;

    // Call Gemini (example using OpenAI responses endpoint; adapt if using Vertex AI)
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: `${prompt}\n---\nIMAGE_A:${modelImage}\nIMAGE_B:${clothingImage}`,
        max_output_tokens: 1200,
      }),
    });

    const data = await response.json();

    // Expect the model to return a JSON string somewhere in the response
    // Try to locate it safely
    let parsed = null;
    try {
      const content = (data.output && data.output[0] && (data.output[0].content || data.output[0].text || JSON.stringify(data.output[0]))) || null;
      const text = typeof content === 'string' ? content : JSON.stringify(content);
      // extract first JSON-looking substring
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (err) {
      console.error('Failed to parse Gemini output', err);
    }

    if (!parsed || !parsed.mask) {
      console.warn('Gemini did not return mask; returning original model image');
      return res.json({ success: true, combinedImage: modelImage, debug: data });
    }

    // Now composite using sharp
    const modelBuf = Buffer.from(stripDataUrl(modelImage), 'base64');
    const clothingBuf = Buffer.from(stripDataUrl(parsed.mask), 'base64');

    // Load images
    const modelMeta = await sharp(modelBuf).metadata();
    const clothingMeta = await sharp(clothingBuf).metadata();

    // For simplicity, place the clothing mask centered at bbox if provided else center
    let bbox = parsed.bbox || { x: Math.floor((modelMeta.width - clothingMeta.width) / 2), y: Math.floor((modelMeta.height - clothingMeta.height) / 2), width: clothingMeta.width, height: clothingMeta.height };

    // Resize mask to bbox size
    let resizedClothing = await sharp(clothingBuf).resize(Math.round(bbox.width), Math.round(bbox.height)).png().toBuffer();

    // Create an empty canvas the size of model, then composite the mask (as alpha) and the clothing image (we assume mask contains transparency)
    const composite = await sharp(modelBuf)
      .composite([
        { input: resizedClothing, left: Math.round(bbox.x), top: Math.round(bbox.y) }
      ])
      .png()
      .toBuffer();

    const combinedDataUrl = `data:image/png;base64,${composite.toString('base64')}`;

    return res.json({ success: true, combinedImage: combinedDataUrl, debug: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
