import type { ExtractedSource, SourceRequestPayload } from "./types.ts";
import {
  MAX_STORED_CONTENT_LENGTH,
  chooseBestArticleText,
  countWords,
  isUsefulParagraph,
  normalizeExtractedText,
  normalizeTextBlock,
  safeNormalizeExtractedText,
  stripLeadingTitle,
} from "./text.ts";

const SUPPORTED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const SUPPORTED_FILE_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const ARTICLE_CONTAINER_SELECTORS = [
  "article",
  "[role='main']",
  "main",
  ".article-content",
  ".article-body",
  ".article__body",
  ".story-body",
  ".story-content",
  ".entry-content",
  ".post-content",
  ".content__article-body",
  ".ArticleBody-articleBody",
];
const TITLE_META_SELECTORS = [
  'meta[property="og:title"]',
  'meta[name="twitter:title"]',
  'meta[name="title"]',
];
const AUTHOR_META_SELECTORS = [
  'meta[name="author"]',
  'meta[property="article:author"]',
  'meta[name="parsely-author"]',
  'meta[name="byl"]',
];
const IMAGE_META_SELECTORS = [
  'meta[property="og:image"]',
  'meta[name="twitter:image"]',
  'meta[name="twitter:image:src"]',
];

export async function resolveSource(body: SourceRequestPayload = {}): Promise<ExtractedSource> {
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const fileType = typeof body.fileType === "string" ? body.fileType.trim() : "";
  const fileData = typeof body.fileData === "string" ? body.fileData.trim() : "";

  const hasUrl = url.length > 0;
  const hasFile = fileName.length > 0 || fileType.length > 0 || fileData.length > 0;

  if (hasUrl && hasFile) {
    throw new Error("Provide either a URL or a single document upload, not both.");
  }

  if (hasUrl) {
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }

    return scrapeArticle(url);
  }

  if (hasFile) {
    if (!fileName || !fileType || !fileData) {
      throw new Error("Document uploads require file name, type, and data.");
    }

    return extractDocument(fileName, fileType, fileData);
  }

  throw new Error("A URL or a supported document file is required.");
}

async function scrapeArticle(url: string): Promise<ExtractedSource> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const [{ JSDOM }, { Readability }] = await Promise.all([import("jsdom"), import("@mozilla/readability")]);
  const dom = new JSDOM(html, { url });

  try {
    const document = dom.window.document;
    const parsedArticle = new Readability(document.cloneNode(true) as Document, {
      charThreshold: 160,
    }).parse();

    const readableText = safeNormalizeExtractedText(parsedArticle?.textContent ?? "", {
      maxLength: MAX_STORED_CONTENT_LENGTH,
    });
    const fallbackText = extractFallbackArticleText(document);
    const title = selectFirstMeaningful(
      [
        parsedArticle?.title,
        readMetaContent(document, TITLE_META_SELECTORS),
        document.querySelector("title")?.textContent,
        document.querySelector("h1")?.textContent,
      ],
      "Untitled Article",
    ).slice(0, 200);
    const content = stripLeadingTitle(chooseBestArticleText(readableText, fallbackText), title);

    if (countWords(content) < 80) {
      throw new Error("Insufficient readable content extracted from the article.");
    }

    const author = selectOptionalValue([
      parsedArticle?.byline,
      readMetaContent(document, AUTHOR_META_SELECTORS),
      document.querySelector("[rel='author']")?.textContent,
      document.querySelector(".author, .byline, [itemprop='author']")?.textContent,
    ]);

    const imageUrl = absolutizeUrl(
      selectOptionalValue([
        readMetaContent(document, IMAGE_META_SELECTORS),
        document.querySelector("article img, main img, img")?.getAttribute("src"),
      ]),
      url,
    );

    return {
      title,
      content,
      author,
      imageUrl,
      sourceType: "url",
      sourceName: url,
    };
  } catch (error) {
    console.error("Scraping error:", error);
    throw new Error(
      `Failed to scrape article: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    dom.window.close();
  }
}

async function extractDocument(
  fileName: string,
  fileType: string,
  fileData: string,
): Promise<ExtractedSource> {
  const extension = getFileExtension(fileName);
  const normalizedFileType = fileType.toLowerCase();

  if (!SUPPORTED_FILE_EXTENSIONS.has(extension) && !SUPPORTED_FILE_TYPES.has(normalizedFileType)) {
    throw new Error("Unsupported file type. Please upload a PDF, DOC, or DOCX file.");
  }

  const rawBase64 = fileData.includes(",") ? fileData.split(",").pop() || "" : fileData;
  const buffer = Buffer.from(rawBase64, "base64");

  if (!buffer.length) {
    throw new Error("The uploaded document is empty or invalid.");
  }

  if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Document is too large. Please upload a file smaller than 10 MB.");
  }

  const extractedText =
    extension === "pdf" || normalizedFileType === "application/pdf"
      ? await extractPdfText(buffer)
      : await extractWordText(buffer);

  return {
    title: stripFileExtension(fileName).slice(0, 200) || "Uploaded document",
    content: normalizeExtractedText(extractedText),
    author: undefined,
    imageUrl: undefined,
    sourceType: "file",
    sourceName: fileName,
  };
}

async function extractPdfText(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractWordText(buffer: Buffer) {
  const { default: WordExtractor } = await import("word-extractor");
  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);

  const sections = [
    document.getBody?.(),
    document.getHeaders?.(),
    document.getFooters?.(),
    document.getFootnotes?.(),
    document.getEndnotes?.(),
    document.getAnnotations?.(),
    document.getTextboxes?.(),
  ].filter((section): section is string => typeof section === "string" && section.trim().length > 0);

  return sections.join("\n\n");
}

function extractFallbackArticleText(document: Document) {
  const cleanedDocument = document.cloneNode(true) as Document;

  cleanedDocument
    .querySelectorAll(
      "script, style, noscript, iframe, svg, nav, footer, header, aside, form, button, input",
    )
    .forEach((element) => element.remove());

  const uniqueCandidates = new Set<Element>();
  for (const selector of ARTICLE_CONTAINER_SELECTORS) {
    cleanedDocument.querySelectorAll(selector).forEach((element) => uniqueCandidates.add(element));
  }

  uniqueCandidates.add(cleanedDocument.body);

  let bestText = "";
  let bestScore = -1;

  for (const element of Array.from(uniqueCandidates)) {
    const paragraphs = Array.from(element.querySelectorAll("p"))
      .map((paragraph) => normalizeTextBlock(paragraph.textContent || ""))
      .filter(isUsefulParagraph);

    if (paragraphs.length < 2) {
      continue;
    }

    const uniqueParagraphs = Array.from(new Set(paragraphs));
    const text = uniqueParagraphs.join("\n\n");
    const wordCount = countWords(text);
    const sentenceCount = text.split(/(?<=[.!?])\s+/).length;
    const bonus =
      element.tagName === "ARTICLE"
        ? 180
        : element.tagName === "MAIN" || element.getAttribute("role") === "main"
          ? 120
          : 0;
    const score = wordCount + sentenceCount * 8 + bonus;

    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }

  return safeNormalizeExtractedText(bestText, {
    maxLength: MAX_STORED_CONTENT_LENGTH,
  });
}

function readMetaContent(document: Document, selectors: string[]) {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.getAttribute("content");
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function selectFirstMeaningful(values: Array<string | null | undefined>, fallback = "") {
  for (const value of values) {
    const normalizedValue = normalizeTextBlock(value || "");
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return fallback;
}

function selectOptionalValue(values: Array<string | null | undefined>) {
  const selected = selectFirstMeaningful(values);
  return selected || undefined;
}

function absolutizeUrl(value: string | undefined, baseUrl: string) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return undefined;
  }
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}
