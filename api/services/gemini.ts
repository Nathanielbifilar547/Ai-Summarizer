import type { SummaryResult } from "./summarizer/types.ts";
import { createGeminiSummary } from "./summarizer/summary.ts";

export type SummarizationResult = SummaryResult;

export class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
  }

  async summarizeArticle(
    title: string,
    content: string,
    maxContentLength: number = 30000,
  ): Promise<SummarizationResult> {
    const truncatedContent =
      content.length > maxContentLength ? `${content.substring(0, maxContentLength)}...` : content;

    return createGeminiSummary(title, truncatedContent);
  }

  async testConnection(): Promise<boolean> {
    try {
      await createGeminiSummary(
        "Health check",
        "This is a short test article about a service connectivity check. It explains that the system is running and the request should return a concise summary with a few key points.",
      );
      return true;
    } catch (error) {
      console.error("Gemini connection test failed:", error);
      return false;
    }
  }
}
