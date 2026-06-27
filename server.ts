import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route to enrich link
  app.post("/api/enrich-link", async (req, res) => {
    try {
      const { url, contextText } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // We'll prompt Gemini to analyze this URL and extract structure info
      const prompt = `You are a link analyzer for Pinterest and other websites.
Analyze the following URL: "${url}"
${contextText ? `Additional context or pasted text provided by user: "${contextText}"` : ""}

Generate a highly descriptive Arabic title, guess its main category (e.g., "ديكور", "طبخ", "أزياء", "تقنية", "صحة", "تعليم", "أخرى"), write a brief summary of what the link is about in modern clean Arabic, and list 2-3 relevant hashtags/tags in Arabic.

If the URL is a Pinterest pin or board, try to figure out what type of pin/board it is from the words in the URL or the provided context. If no context, make an educated guess based on the domain and path. Ensure everything is in beautiful, elegant Arabic.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Descriptive Arabic title of the link content" },
              category: { type: Type.STRING, description: "Main category in Arabic, e.g., ديكور, طبخ, أزياء, تقنية, صحة, تعليم, عام" },
              description: { type: Type.STRING, description: "A brief professional summary of the link content in Arabic (1-2 sentences)" },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2-3 relevant tags/labels in Arabic"
              }
            },
            required: ["title", "category", "description", "tags"]
          }
        }
      });

      const resultText = response.text || "{}";
      const resultJson = JSON.parse(resultText.trim());
      return res.json(resultJson);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      // Fallback response if API fails or key is missing
      return res.json({
        title: "رابط ويب جديد",
        category: "عام",
        description: "تمت إضافة هذا الرابط بنجاح. لم نتمكن من تحليل المحتوى بالذكاء الاصطناعي حالياً.",
        tags: ["مرفق", "ويب"]
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
