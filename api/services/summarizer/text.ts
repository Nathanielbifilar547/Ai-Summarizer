import he from "he";

export interface ScoredSentence {
  sentence: string;
  index: number;
  score: number;
}

export const MAX_STORED_CONTENT_LENGTH = 24000;

const NOISE_PATTERNS = [
  /^advertisement$/i,
  /^sponsored content$/i,
  /^read more$/i,
  /^related articles?$/i,
  /^sign up$/i,
  /^subscribe$/i,
  /^cookie/i,
  /^privacy policy$/i,
  /^terms of use$/i,
  /^all rights reserved$/i,
  /^copyright/i,
  /^share this/i,
  /^follow us/i,
  /^watch:/i,
];

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "again",
  "all",
  "also",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function normalizeTextBlock(text: string) {
  return text.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

export function isUsefulParagraph(text: string) {
  if (!text) {
    return false;
  }

  if (NOISE_PATTERNS.some((pattern) => pattern.test(text))) {
    return false;
  }

  if (countWords(text) < 8 || text.length < 45) {
    return false;
  }

  const letters = text.replace(/[^a-z]/gi, "");
  if (letters.length > 0) {
    const upperRatio = text.replace(/[^A-Z]/g, "").length / letters.length;
    if (upperRatio > 0.6) {
      return false;
    }
  }

  if ((text.match(/\|/g) || []).length > 4) {
    return false;
  }

  return true;
}

export function safeNormalizeExtractedText(
  text: string,
  options: { maxLength?: number } = {},
) {
  const maxLength = options.maxLength ?? MAX_STORED_CONTENT_LENGTH;
  const decoded = he
    .decode(text || "")
    .replace(/\[(?:\d+|[a-z]|citation needed)\]/gi, "")
    .replace(/\u0000/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ");

  const paragraphs = decoded
    .split(/\n{2,}/)
    .map((block) => normalizeTextBlock(block))
    .filter(Boolean);
  const dedupedParagraphs = Array.from(new Set(paragraphs));
  const joined = dedupedParagraphs.join("\n\n").trim();

  return joined.slice(0, maxLength);
}

export function normalizeExtractedText(
  text: string,
  options: { minLength?: number; maxLength?: number } = {},
) {
  const normalizedText = safeNormalizeExtractedText(text, options);
  const minLength = options.minLength ?? 80;

  if (normalizedText.length < minLength) {
    throw new Error("Insufficient readable content extracted from the source.");
  }

  return normalizedText;
}

export function chooseBestArticleText(primary: string, fallback: string) {
  const primaryWords = countWords(primary);
  const fallbackWords = countWords(fallback);

  if (primaryWords >= 140) {
    return primary;
  }

  if (fallbackWords >= Math.max(140, primaryWords + 60)) {
    return fallback;
  }

  return primary || fallback;
}

export function stripLeadingTitle(content: string, title: string) {
  if (!content || !title) {
    return content;
  }

  const normalizedTitle = normalizeTextBlock(title).toLowerCase();
  const paragraphs = content.split(/\n{2,}/);

  if (paragraphs.length === 0) {
    return content;
  }

  const firstParagraph = normalizeTextBlock(paragraphs[0]).toLowerCase();
  if (firstParagraph === normalizedTitle) {
    return paragraphs.slice(1).join("\n\n").trim();
  }

  return content;
}

export function truncateForModel(content: string, maxLength: number) {
  if (content.length <= maxLength) {
    return content;
  }

  const paragraphs = content.split(/\n{2,}/);
  let result = "";

  for (const paragraph of paragraphs) {
    const nextValue = result ? `${result}\n\n${paragraph}` : paragraph;
    if (nextValue.length > maxLength) {
      break;
    }
    result = nextValue;
  }

  if (!result) {
    return `${content.slice(0, maxLength)}...`;
  }

  return `${result}\n\n[Content truncated for summarization]`;
}

export function splitIntoSentences(text: string) {
  const normalized = text.replace(/\n+/g, " ");
  const roughSentences = normalized.split(/(?<=[.!?])\s+/);

  return roughSentences
    .map((sentence) => normalizeTextBlock(sentence))
    .filter((sentence) => sentence.length >= 35 && sentence.length <= 420)
    .filter((sentence) => isUsefulParagraph(sentence));
}

export function finalizeSentenceBlock(text: string) {
  const normalized = normalizeTextBlock(text).replace(/^[-*•]\s*/, "").replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

export function tokenizeSentence(sentence: string) {
  return (
    sentence
      .toLowerCase()
      .match(/[a-z0-9']+/g)
      ?.filter((token) => token.length > 2 && !STOP_WORDS.has(token)) || []
  );
}

export function buildWordFrequency(sentences: string[]) {
  const frequencies = new Map<string, number>();

  for (const sentence of sentences) {
    for (const token of tokenizeSentence(sentence)) {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    }
  }

  return frequencies;
}

export function sentenceSimilarity(left: string, right: string) {
  const leftWords = new Set(tokenizeSentence(left));
  const rightWords = new Set(tokenizeSentence(right));
  const union = new Set<string>([...Array.from(leftWords), ...Array.from(rightWords)]);

  if (union.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const word of Array.from(leftWords)) {
    if (rightWords.has(word)) {
      intersection += 1;
    }
  }

  return intersection / union.size;
}

export function pickDiverseSentences(sentences: ScoredSentence[], limit: number) {
  const ranked = [...sentences].sort((left, right) => right.score - left.score);
  const selected: ScoredSentence[] = [];

  for (const candidate of ranked) {
    const isTooSimilar = selected.some(
      (existing) => sentenceSimilarity(existing.sentence, candidate.sentence) > 0.72,
    );

    if (!isTooSimilar) {
      selected.push(candidate);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}
