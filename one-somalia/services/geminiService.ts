import { GoogleGenAI, Type } from "@google/genai";
import { FactResponse } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize the client
const ai = new GoogleGenAI({ apiKey });

export const fetchSomaliaFact = async (): Promise<FactResponse> => {
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Tell me a short, interesting, and positive cultural or historical fact about Somalia (the country as a unified whole). Keep it under 30 words.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fact: {
              type: Type.STRING,
              description: "The interesting fact text",
            },
            category: {
              type: Type.STRING,
              description: "A one-word category for the fact (e.g., History, Culture, Geography)",
            }
          },
          required: ["fact", "category"],
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response generated");
    }

    return JSON.parse(text) as FactResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};