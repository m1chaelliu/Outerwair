import { GoogleGenAI } from "@google/genai";

// In Vite, environment variables need VITE_ prefix and use import.meta.env
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

/**
 * Combine multiple images (model + clothing items) using Gemini AI
 * @param {string} modelBase64 - Base64 encoded model image
 * @param {string[]} clothingBase64Array - Array of base64 encoded clothing images
 * @returns {Promise<string>} - Base64 encoded combined image
 */
export async function combineImagesWithGemini(modelBase64, clothingBase64Array) {
  // Check for API key
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is missing! Please add/create a .env file with this in the ROOT directory."
    );
  }

  try {
    // Build the prompt array starting with text and model image
    const prompt = [
      {
        text: `The first image shows a person (the model). The following images show clothing items, each from these categories below:
        Categories:
        - Tops (shirts, t-shirts, blouses, sweaters, hoodies, tanks)
        - Bottoms (pants, jeans, skirts, shorts, leggings)
        - Outerwear (jackets, coats, blazers, cardigans)
        - Shoes (sneakers, boots, sandals, heels, flats)
        - Accessories (hats, scarves, bags, belts, jewelry, sunglasses)

        Only the accessories can have more than one image provided, but the rest of the categories will only have one.
        If an item doesn't fit a certain category, do not add it to the image.

        Create a new image showing the person from the first image wearing ALL of the clothing items from the subsequent images. 
        
        KEEP the original model's proportions. For example: 
        If the model doesn't have pants in the frame, DO NOT GENERATE parts not in the frame.
        Ensure natural fit, correct lighting, realistic proportions, and seamless integration.
        The result should look as if the person is actually wearing all the clothing items together in a complete outfit.
        
        Make it look as close to the first image of the person as possible.
        `
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: modelBase64,
        },
      },
    ];

    // Add all clothing images to the prompt
    clothingBase64Array.forEach(clothingBase64 => {
      prompt.push({
        inlineData: {
          mimeType: "image/png",
          data: clothingBase64,
        },
      });
    });

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
 * Analyze a clothing image and generate a descriptive title and category
 * @param {string} clothingBase64 - Base64 encoded clothing image
 * @returns {Promise<{title: string, category: string}>} - Generated title and category
 */
export async function analyzeClothingImage(clothingBase64) {
  // Check for API key
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is missing! Please add/create a .env file with this in the ROOT directory."
    );
  }

  try {
    const prompt = [
      {
        text: `Analyze this clothing item image and provide both a descriptive title and category.

        Categories (choose ONE):
        - Tops (shirts, t-shirts, blouses, sweaters, hoodies, tanks)
        - Bottoms (pants, jeans, skirts, shorts, leggings)
        - Outerwear (jackets, coats, blazers, cardigans)
        - Shoes (sneakers, boots, sandals, heels, flats)
        - Accessories (hats, scarves, bags, belts, jewelry, sunglasses)

        Generate a short title (3-5 words) describing the type, color, and distinctive features.

        Respond ONLY in this exact JSON format:
        {"title": "Blue Denim Jacket", "category": "Outerwear"}`
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: clothingBase64,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // Extract the text from response
    const text = response.candidates[0].content.parts[0].text.trim();

    // Parse JSON response
    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText);

    return {
      title: parsed.title || "Clothing Item",
      category: parsed.category || "Tops"
    };
  } catch (error) {
    console.error("Error analyzing clothing image with Gemini:", error);
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
