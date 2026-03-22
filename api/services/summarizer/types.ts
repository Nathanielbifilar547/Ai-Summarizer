export interface SourceRequestPayload {
  url?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
}

export interface ExtractedSource {
  title: string;
  content: string;
  author?: string;
  imageUrl?: string;
  sourceType: "url" | "file";
  sourceName: string;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

export interface SummarizeContentResult {
  result: SummaryResult;
  aiPowered: boolean;
}
