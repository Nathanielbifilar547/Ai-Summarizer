import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SummarizeContentResult, SummaryResult } from "./types.ts";
import {
  buildWordFrequency,
  countWords,
  finalizeSentenceBlock,
  pickDiverseSentences,
  splitIntoSentences,
  tokenizeSentence,
  truncateForModel,
  type ScoredSentence,
} from "./text.ts";

export async function summarizeSourceContent(
  title: string,
  content: string,
): Promise<SummarizeContentResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      result: createBasicSummary(content),
      aiPowered: false,
    };
  }

  try {
    const result = await createGeminiSummary(title, content);
    return { result, aiPowered: true };
  } catch (error: any) {
    console.error("Gemini failed, using fallback:", error?.message || error);
    return {
      result: createBasicSummary(content),
      aiPowered: false,
    };
  }
}

export async function createGeminiSummary(title: string, content: string): Promise<SummaryResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No Gemini API key available");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.25,
    },
  });

  const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH || "22000", 10);
  const truncatedContent = truncateForModel(content, maxContentLength);
  const prompt = [
    "You are an expert editor summarizing an article or document for a reader who wants the important information fast.",
    "Use only the article content.",
    "Ignore navigation text, cookie banners, sign-up prompts, related links, legal boilerplate, and repeated fragments.",
    "Focus on the core event or thesis, the strongest supporting facts, and why it matters.",
    "Keep names, dates, places, numbers, and outcomes when they are present in the source.",
    "Do not invent facts or speculate.",
    "",
    "Return strict JSON with this shape:",
    "{",
    '  "summary": "3 to 4 specific sentences, roughly 90 to 160 words total.",',
    '  "keyPoints": ["3 to 5 concise, non-overlapping points grounded in the source"]',
    "}",
    "",
    `Title: ${title}`,
    "",
    "Content:",
    truncatedContent,
  ].join("\n");

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();
  const parsedResult = parseGeminiJson(rawText);
  const normalized = normalizeModelSummary(parsedResult);

  if (!normalized.summary || normalized.keyPoints.length < 2) {
    throw new Error("Gemini returned incomplete summary content");
  }

  return normalized;
}

export function createBasicSummary(text: string): SummaryResult {
  const sentences = splitIntoSentences(text);

  if (sentences.length === 0) {
    throw new Error("No readable sentences were found for summarization.");
  }

  const frequencies = buildWordFrequency(sentences);
  const leadWindowSize = Math.min(
    sentences.length,
    Math.max(8, Math.min(12, Math.ceil(sentences.length * 0.25))),
  );

  const scoredSentences: ScoredSentence[] = sentences.map((sentence, index) => {
    const tokens = tokenizeSentence(sentence);
    const frequencyScore = tokens.reduce((sum, token) => sum + (frequencies.get(token) || 0), 0);
    const normalizedScore = frequencyScore / Math.sqrt(Math.max(tokens.length, 1));
    const positionBonus =
      index < leadWindowSize
        ? (leadWindowSize - index) * 1.5
        : Math.max(0, 1.2 - (index - leadWindowSize) * 0.03);
    const factBonus = /\d/.test(sentence) ? 1.2 : 0;

    return {
      sentence,
      index,
      score: normalizedScore + positionBonus + factBonus,
    };
  });

  const summarySentences = pickDiverseSentences(
    scoredSentences.filter((item) => item.index < leadWindowSize),
    3,
  )
    .sort((left, right) => left.index - right.index)
    .map((item) => item.sentence);

  const fallbackSentences = sentences.slice(0, Math.min(3, sentences.length));
  const summary = finalizeSentenceBlock(
    (summarySentences.length >= 2 ? summarySentences : fallbackSentences).join(" "),
  );

  const keyPoints = pickDiverseSentences(
    scoredSentences.filter(
      (item) =>
        item.index < Math.min(sentences.length, Math.max(leadWindowSize + 8, 18)) &&
        !summarySentences.includes(item.sentence) &&
        countWords(item.sentence) >= 9,
    ),
    4,
  )
    .sort((left, right) => left.index - right.index)
    .map((item) => finalizeSentenceBlock(item.sentence))
    .filter((item) => item.length >= 20);

  return {
    summary,
    keyPoints:
      keyPoints.length > 0
        ? keyPoints
        : summarySentences.slice(0, 3).map((sentence) => finalizeSentenceBlock(sentence)),
  };
}

function parseGeminiJson(text: string) {
  const trimmed = text.trim();
  const directCandidates = [
    trimmed,
    trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim(),
  ];

  for (const candidate of directCandidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue to fallback parsing
    }
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Gemini response");
  }

  return JSON.parse(jsonMatch[0]);
}

function normalizeModelSummary(raw: any): SummaryResult {
  const summary = finalizeSentenceBlock(typeof raw?.summary === "string" ? raw.summary : "");
  const rawKeyPoints = Array.isArray(raw?.keyPoints) ? raw.keyPoints : [];
  const keyPoints = Array.from(
    new Set<string>(
      rawKeyPoints
        .filter((value: unknown): value is string => typeof value === "string")
        .map((point: string) => finalizeSentenceBlock(point))
        .filter((point: string) => point.length >= 20),
    ),
  ).slice(0, 5);

  return { summary, keyPoints };
}
