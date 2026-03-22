declare module "word-extractor" {
  export default class WordExtractor {
    extract(source: string | Buffer): Promise<{
      getBody(): string;
      getHeaders(options?: unknown): string;
      getFooters?(): string;
      getFootnotes?(): string;
      getEndnotes?(): string;
      getAnnotations?(): string;
      getTextboxes?(options?: unknown): string;
    }>;
  }
}
