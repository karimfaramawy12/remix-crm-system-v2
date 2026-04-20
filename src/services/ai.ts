import { GoogleGenAI } from "@google/genai";

// The platform injects GEMINI_API_KEY into process.env
const apiKey = process.env.GEMINI_API_KEY;

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateAIContent = async (prompt: string, systemInstruction: string) => {
  if (!ai) {
    throw new Error('AI Assistant not configured');
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction
      }
    });
    return response.text;
  } catch (err) {
    console.error('AI Generation Error:', err);
    throw err;
  }
};
