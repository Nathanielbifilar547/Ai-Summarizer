import { type VercelRequest, type VercelResponse } from "@vercel/node";
import { countWords, resolveSource, summarizeSourceContent } from "./services/summarizer/index.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const sourceData = await resolveSource(req.body ?? {});
    const { result, aiPowered } = await summarizeSourceContent(sourceData.title, sourceData.content);

    console.log("Processing source:", sourceData.sourceName);
    console.log("Normalized content length:", sourceData.content.length);

    const originalWords = countWords(sourceData.content);
    const summaryWords = countWords(result.summary);
    const compressionRatio = Math.max(
      0,
      Math.round(((originalWords - summaryWords) / Math.max(originalWords, 1)) * 100),
    );

    res.status(200).json({
      article: {
        title: sourceData.title,
        author: sourceData.author,
        content: sourceData.content,
        summary: result.summary,
        keyPoints: result.keyPoints,
        imageUrl: sourceData.imageUrl,
        originalWords,
        summaryWords,
        compressionRatio,
        aiPowered,
        sourceType: sourceData.sourceType,
        sourceName: sourceData.sourceName,
      },
    });
  } catch (error: any) {
    console.error("Summarize API error:", error);
    res.status(500).json({
      message: error.message || "Failed to process article",
      details: process.env.NODE_ENV === "development" ? error.stack : "Internal server error",
    });
  }
}
