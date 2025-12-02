import { GoogleGenAI } from "@google/genai";

// In Vite, environment variables need VITE_ prefix and use import.meta.env
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

/**
 * Combine two images (model + clothing) using Gemini AI
 * @param {string} modelBase64 - Base64 encoded model image
 * @param {string} clothingBase64 - Base64 encoded clothing image
 * @returns {Promise<string>} - Base64 encoded combined image
 */
export async function combineImagesWithGemini(modelBase64, clothingBase64) {
  // Check for API key
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is missing! Please add/create a .env file with this in the ROOT directory."
    );
  }

  try {
    const prompt = [
      {
        text: `The first image shows a person (the model). The second image shows a piece of clothing.
        Create a new image showing the person from the first image wearing the clothing from the second image.
        Ensure natural fit, correct lighting, realistic proportions, and seamless integration.
        The result should look as if the person is actually wearing the clothing item.`
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: modelBase64,
        },
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: clothingBase64,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    // Extract the generated image from response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // Return base64 image data
      }
    }

    throw new Error("No image data in response");
  } catch (error) {
    console.error("Error combining images with Gemini:", error);
    throw error;
  }
}

/**
 * Helper function to convert data URL to base64 (removes the data:image/png;base64, prefix)
 * @param {string} dataUrl - Full data URL from canvas or file reader
 * @returns {string} - Pure base64 string
 */
export function dataUrlToBase64(dataUrl) {
  return dataUrl.split(',')[1];
}

/**
 * Helper function to convert base64 to data URL for displaying in img tags
 * @param {string} base64 - Pure base64 string
 * @param {string} mimeType - MIME type (default: image/png)
 * @returns {string} - Data URL string
 */
export function base64ToDataUrl(base64, mimeType = "image/png") {
  return `data:${mimeType};base64,${base64}`;
}
